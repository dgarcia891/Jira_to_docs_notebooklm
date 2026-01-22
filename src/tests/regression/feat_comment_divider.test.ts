import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocsSyncService } from '../../services/docsSync';
import { WorkItem } from '../../types';

describe('Feature: Comment Divider', () => {
    let service: DocsSyncService;
    const mockToken = 'mock-token';
    const mockDocId = 'mock-doc-id';

    const mockItem: WorkItem = {
        id: 'TEST-123',
        key: 'TEST-123',
        source: 'jira',
        title: 'Test Issue',
        description: 'Issue description',
        status: 'To Do',
        type: 'story',
        priority: 'Medium',
        assignee: 'Unassigned',
        reporter: 'Reporter',
        labels: [],
        url: 'https://jira.com/browse/TEST-123',
        comments: [
            { id: '1', author: 'User', body: 'Test comment', timestamp: 'Jan 1, 2026' }
        ],
        createdDate: '2026-01-01T00:00:00Z',
        updatedDate: '2026-01-01T00:01:00Z',
        sprints: [],
        linkedIssues: [],
        metadata: {}
    };

    beforeEach(() => {
        service = new DocsSyncService();
        // Mock API calls to prevent network requests
        vi.spyOn(service as any, 'getDoc').mockResolvedValue({
            body: {
                content: [{ startIndex: 0, endIndex: 1 }]
            }
        });
    });

    it('should include a dashed divider before the "Latest Comments" section', async () => {
        const batchUpdateSpy = vi.spyOn(service as any, 'batchUpdate').mockResolvedValue(undefined);

        await service.syncItem(mockDocId, mockItem, mockToken);

        const requests = batchUpdateSpy.mock.calls[0][2] as any[];
        const bodyContentRequest = requests.find((r: any) =>
            r.insertText && r.insertText.text.includes('Latest Comments')
        );

        expect(bodyContentRequest).toBeDefined();
        const content = bodyContentRequest.insertText.text;

        // Strategy: Verify divider is present and positioned before comments
        const divider = '--------------------------------------------------';
        expect(content).toContain(divider);

        const dividerIndex = content.indexOf(divider);
        const commentsIndex = content.indexOf('Latest Comments');

        expect(dividerIndex).toBeLessThan(commentsIndex);
        expect(dividerIndex).not.toBe(-1);
    });
});
