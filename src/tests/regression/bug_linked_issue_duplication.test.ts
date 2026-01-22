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

    it('should suppress Rationale/Context if the linked issue is also being synced', async () => {
        vi.spyOn(service as any, 'getDoc').mockResolvedValue({
            body: { content: [{ startIndex: 0, endIndex: 1 }, { startIndex: 1, endIndex: 2 }] }
        });
        const batchUpdateSpy = vi.spyOn(service as any, 'batchUpdate').mockResolvedValue(undefined);

        const itemA = createMockItem('A-1', 'Ticket A', ['B-1']);
        const itemB = createMockItem('B-1', 'Ticket B', []);

        // Syncing both A and B together
        await service.syncItems(mockDocId, [itemA, itemB], mockToken);

        const requests = batchUpdateSpy.mock.calls[0][2] as any[];
        const insertRequest = requests.find(r => r.insertText);
        const text = insertRequest.insertText.text;

        // Verify that B-1 is listed under A-1's linked tickets, but WITHOUT the "Context" line
        expect(text).toContain('* B-1: Linked B-1');
        expect(text).not.toContain(' - Context: Redundant Context');
    });

    it('should NOT suppress Rationale/Context if the linked issue is NOT being synced', async () => {
        vi.spyOn(service as any, 'getDoc').mockResolvedValue({
            body: { content: [{ startIndex: 0, endIndex: 1 }, { startIndex: 1, endIndex: 2 }] }
        });
        const batchUpdateSpy = vi.spyOn(service as any, 'batchUpdate').mockResolvedValue(undefined);

        const itemA = createMockItem('A-1', 'Ticket A', ['External-1']);

        // Only syncing A
        await service.syncItems(mockDocId, [itemA], mockToken);

        const requests = batchUpdateSpy.mock.calls[0][2] as any[];
        const insertRequest = requests.find(r => r.insertText);
        const text = insertRequest.insertText.text;

        // Verify that External-1 HAS the context line because it is NOT synced elsewhere in the doc
        expect(text).toContain('* External-1: Linked External-1');
        expect(text).toContain('  - Context: Redundant Context');
    });
});
