import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocsSyncService } from '../../services/docsSync';
import { WorkItem } from '../../types';

describe('Feature: Wipe & Replace Sync', () => {
    let service: DocsSyncService;
    const mockToken = 'mock-token';
    const mockDocId = 'mock-doc-id';

    const mockItem: WorkItem = {
        id: 'TEST-123',
        key: 'TEST-123',
        source: 'jira',
        title: 'Test Issue',
        description: 'New Description',
        status: 'To Do',
        type: 'story',
        priority: 'Medium',
        assignee: 'Unassigned',
        reporter: 'Reporter',
        labels: [],
        url: 'https://jira.com/browse/TEST-123',
        comments: [],
        createdDate: '2026-01-01T00:00:00Z',
        updatedDate: '2026-01-01T00:01:00Z',
        sprints: [],
        linkedIssues: [],
        metadata: {}
    };

    beforeEach(() => {
        service = new DocsSyncService();
    });

    it('should issue a deleteContentRange command for the entire document before inserting', async () => {
        // Mock getDoc to return a doc with existing content
        vi.spyOn(service as any, 'getDoc').mockResolvedValue({
            body: {
                content: [
                    { startIndex: 0, endIndex: 1 },
                    { startIndex: 1, endIndex: 500, paragraph: { elements: [{ textRun: { content: 'OLD CONTENT' } }] } },
                    { startIndex: 500, endIndex: 501 }
                ]
            }
        });

        const batchUpdateSpy = vi.spyOn(service as any, 'batchUpdate').mockResolvedValue(undefined);

        await service.syncItem(mockDocId, mockItem, mockToken);

        const requests = batchUpdateSpy.mock.calls[0][2] as any[];

        // 1. Check for Wipe
        const deleteRequest = requests.find(r => r.deleteContentRange);
        expect(deleteRequest).toBeDefined();
        expect(deleteRequest.deleteContentRange.range.startIndex).toBe(1);
        expect(deleteRequest.deleteContentRange.range.endIndex).toBe(500);

        // 2. Check for Insert
        const insertRequest = requests.find(r => r.insertText);
        expect(insertRequest).toBeDefined();
        expect(insertRequest.insertText.text).toContain('TEST-123: Test Issue');
        expect(insertRequest.insertText.text).toContain('New Description');
    });

    it('should handle bulk syncing multiple items after a single wipe', async () => {
        vi.spyOn(service as any, 'getDoc').mockResolvedValue({
            body: {
                content: [{ startIndex: 0, endIndex: 1 }, { startIndex: 1, endIndex: 2 }]
            }
        });

        const batchUpdateSpy = vi.spyOn(service as any, 'batchUpdate').mockResolvedValue(undefined);

        const items = [
            { ...mockItem, key: 'TEST-1' },
            { ...mockItem, key: 'TEST-2' }
        ];

        await (service as any).syncItems(mockDocId, items, mockToken);

        const requests = batchUpdateSpy.mock.calls[0][2] as any[];
        const insertRequest = requests.find(r => r.insertText);

        expect(insertRequest.insertText.text).toContain('TEST-1: Test Issue');
        expect(insertRequest.insertText.text).toContain('TEST-2: Test Issue');
    });
});
