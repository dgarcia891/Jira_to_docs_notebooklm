import { describe, it, expect, vi } from 'vitest';
import { JiraParser } from './jira';

// Mock minimal Jira Cloud HTML structure
const MOCK_JIRA_HTML = `
  <html>
    <body>
      <div id="jira-frontend">
        <div data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container">
          <a href="/browse/TEST-123">TEST-123</a>
        </div>
        <h1 data-testid="issue.views.issue-base.foundation.summary.heading">Fix the login bug</h1>
      </div>
    </body>
  </html>
`;

describe('JiraParser', () => {
  const parser = new JiraParser();

  // Mock global fetch
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/rest/api/3/field')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }
    if (url.includes('/rest/api/3/issue/TEST-123/comment')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          comments: [{
            author: { displayName: 'John Smith' },
            body: {
              type: 'doc',
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: 'Fixed in PR #456' }]
              }]
            }
          }]
        })
      });
    }
    if (url.includes('/rest/api/3/issue/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          fields: {
            summary: 'Fix the login bug',
            description: {
              type: 'doc',
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: 'User cannot login with email.' }]
              }]
            },
            status: { name: 'Done' },
            issuetype: { name: 'Bug' },
            priority: { name: 'High' },
            assignee: { displayName: 'Jane Doe' },
            reporter: { displayName: 'John Smith' },
            created: '2023-01-01T00:00:00Z',
            updated: '2023-01-01T00:00:00Z',
            issuelinks: [],
            subtasks: []
          }
        })
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  }) as any;

  it('should identify valid Jira URLs', () => {
    expect(parser.canParse('https://company.atlassian.net/browse/TEST-123')).toBe(true);
    expect(parser.canParse('https://company.atlassian.net/jira/software/projects/TEST/boards/1?selectedIssue=TEST-123')).toBe(true);
    expect(parser.canParse('https://google.com')).toBe(false);
  });

  it('should extract core fields from DOM (via API fallback)', async () => {
    const dom = new DOMParser().parseFromString(MOCK_JIRA_HTML, 'text/html');
    const result = await parser.parse(dom, 'https://company.atlassian.net/browse/TEST-123');

    expect(result).toMatchObject({
      source: 'jira',
      key: 'TEST-123',
      title: 'Fix the login bug',
      status: 'Done',
      assignee: 'Jane Doe',
      priority: 'High',
      type: 'bug',
    });

    // Description should be sanitized/text-content
    expect(result.description).toContain('User cannot login with email.');

    // Comments
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]).toMatchObject({
      author: 'John Smith',
      body: 'Fixed in PR #456'
    });
  });
});
