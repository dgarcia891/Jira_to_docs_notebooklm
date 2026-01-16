import { describe, it, expect } from 'vitest';
import { JiraParser } from './jira';

// Mock minimal Jira Cloud HTML structure
const MOCK_JIRA_HTML = `
  <html>
    <body>
      <div id="jira-frontend">
        <!-- Breadcrumbs / Key -->
        <div data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container">
          <a href="/browse/TEST-123">TEST-123</a>
        </div>

        <!-- Summary -->
        <h1 data-testid="issue.views.issue-base.foundation.summary.heading">
          Fix the login bug
        </h1>

        <!-- Status -->
        <div data-testid="issue.views.issue-base.context.status-and-approvals.status.status-button">
          Done
        </div>

        <!-- Description -->
        <div data-testid="issue.views.issue-base.foundation.description.description-field-content">
          <p>User cannot login with <strong>email</strong>.</p>
        </div>

        <!-- Assignee -->
        <div data-testid="issue.views.issue-base.context.people.assignee.field">
          <span>
            <img alt="Jane Doe" src="..." />
            Jane Doe
          </span>
        </div>

        <!-- Priority -->
        <div data-testid="issue.views.issue-base.context.field.priority">
          <img alt="High" />
        </div>
        
        <!-- Type -->
        <div data-testid="issue.views.issue-base.foundation.type.issue-type-view">
             <img alt="Bug" />
        </div>

        <!-- Comments Area -->
        <div data-testid="issue.activity.comments-list">
           <div role="article" aria-label="Comment by John Smith">
              <div data-testid="comment-author-name">John Smith</div>
              <div data-testid="comment-body">Fixed in PR #456</div>
           </div>
        </div>
      </div>
    </body>
  </html>
`;

describe('JiraParser', () => {
    const parser = new JiraParser();

    it('should identify valid Jira URLs', () => {
        expect(parser.canParse('https://company.atlassian.net/browse/TEST-123')).toBe(true);
        expect(parser.canParse('https://company.atlassian.net/jira/software/projects/TEST/boards/1?selectedIssue=TEST-123')).toBe(true);
        expect(parser.canParse('https://google.com')).toBe(false);
    });

    it('should extract core fields from DOM', async () => {
        const dom = new DOMParser().parseFromString(MOCK_JIRA_HTML, 'text/html');
        const result = await parser.parse(dom, 'https://company.atlassian.net/browse/TEST-123');

        expect(result).toMatchObject({
            source: 'jira',
            key: 'TEST-123',
            title: 'Fix the login bug',
            status: 'Done',
            assignee: 'Jane Doe',
            priority: 'High',
            type: 'bug', // Derived from "Bug" alt text
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
