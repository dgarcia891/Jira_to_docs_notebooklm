import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocsSyncService } from '../../services/docsSync';
import { WorkItem } from '../../types';

describe('Bug: Linked Issue Duplication & Redundant Context', () => {
    let service: DocsSyncService;
    const mockToken = 'mock-token';
    const mockDocId = 'mock-doc-id';

    const createMockItem = (key: string, title: string, linkedKeys: string[]): WorkItem => ({
        id: key,
        key: key,
        source: 'jira',
        title: title,
        description: 'Description',
        status: 'To Do',
        type: 'story',
        priority: 'Medium',
        assignee: 'Unassigned',
        reporter: 'Reporter',
        labels: [],
        url: `https://jira.com/browse/${key}`,
        comments: [],
        createdDate: '2026-01-01T00:00:00Z',
        updatedDate: '2026-01-01T00:01:00Z',
        sprints: [],
        linkedIssues: linkedKeys.map(lk => ({
            id: lk,
            key: lk,
            title: `Linked ${lk}`,
            url: `https://jira.com/browse/${lk}`,
            tShirtSize: 'M',
            rationale: 'Redundant Context'
        })),
        metadata: {}
    });

    beforeEach(() => {
        service = new DocsSyncService();
    });

    it('should render deep context for linked issues (Full Description & All Comments)', async () => {
        vi.spyOn(service as any, 'getDoc').mockResolvedValue({
            body: { content: [{ startIndex: 0, endIndex: 1 }, { startIndex: 1, endIndex: 2 }] }
        });
        const batchUpdateSpy = vi.spyOn(service as any, 'batchUpdate').mockResolvedValue(undefined);

        const itemA = createMockItem('A-1', 'Ticket A', ['B-1']);
        // Enhance B-1 with deep fields
        itemA.linkedIssues![0].description = 'Detailed Technical Requirements for B-1';
        itemA.linkedIssues![0].status = 'Completed';
        itemA.linkedIssues![0].comments = [
            { id: 'c1', author: 'Dev', body: 'First comment history', timestamp: 'Jan 1' },
            { id: 'c2', author: 'Prod', body: 'Second comment history', timestamp: 'Jan 2' }
        ];

        const itemB = createMockItem('B-1', 'Ticket B', []);

        // Syncing both A and B together
        await service.syncItems(mockDocId, [itemA, itemB], mockToken);

        const requests = batchUpdateSpy.mock.calls[0][2] as any[];
        const insertRequest = requests.find(r => r.insertText);
        const text = insertRequest.insertText.text;

        // 1. Verify that B-1 is listed under A-1 with its FULL description
        expect(text).toContain('* B-1: Linked B-1');
        expect(text).toContain('- Description: Detailed Technical Requirements for B-1');
        expect(text).toContain('- Status: Completed');

        // 2. Verify that ALL comments for B-1 are included in the linked list
        expect(text).toContain('[Jan 1] Dev: First comment history');
        expect(text).toContain('[Jan 2] Prod: Second comment history');
    });

    it('should NOT suppress info for already synced items (Preserve Redundancy)', async () => {
        vi.spyOn(service as any, 'getDoc').mockResolvedValue({
            body: { content: [{ startIndex: 0, endIndex: 1 }, { startIndex: 1, endIndex: 2 }] }
        });
        const batchUpdateSpy = vi.spyOn(service as any, 'batchUpdate').mockResolvedValue(undefined);

        const itemA = createMockItem('A-1', 'Ticket A', ['B-1']);
        const itemB = createMockItem('B-1', 'Ticket B', []);

        await service.syncItems(mockDocId, [itemA, itemB], mockToken);

        const requests = batchUpdateSpy.mock.calls[0][2] as any[];
        const text = requests.find(r => r.insertText).insertText.text;

        // Verify that B-1's info is still rendered inside A-1's linked list even though B-1 has its own section
        expect(text).toContain('* B-1: Linked B-1');
        expect(text).toContain('- Link: https://jira.com/browse/B-1');
    });
});
