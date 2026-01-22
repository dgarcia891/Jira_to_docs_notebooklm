import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocsSyncService } from './docsSync';
import { WorkItem } from '../types';

// Mock WorkItem
const mockItem: WorkItem = {
    id: 'TEST-123',
    source: 'jira',
    key: 'TEST-123',
    title: 'Fix Bug',
    description: 'Desc',
    status: 'In Progress',
    type: 'bug',
    url: 'http://jira/TEST-123',
    comments: [],
    labels: []
};

// Mock Doc Response Helpers
const createMockDoc = (content: any[]) => ({
    body: {
        content
    }
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DocsSyncService', () => {
    let service: DocsSyncService;
    const token = 'mock-token';
    const docId = 'doc-123';

    beforeEach(() => {
        service = new DocsSyncService();
        vi.clearAllMocks();
    });

    describe('doc management', () => {
        it('should create doc and return ID', async () => {
            const mockId = 'new-doc-id';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ documentId: mockId })
            });

            const id = await service.createDoc('My Doc', token);
            expect(id).toBe(mockId);
        });

        it('should list docs', async () => {
            const mockFiles = [{ id: '1', name: 'Doc 1' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ files: mockFiles })
            });

            const files = await service.listDocs(token);
            expect(files).toEqual(mockFiles);
        });
    });

    describe('syncItem (Wipe & Replace)', () => {
        it('should clear the entire document before inserting', async () => {
            // Mock Get Doc with existing content up to index 500
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => createMockDoc([
                    { startIndex: 0, endIndex: 1 },
                    { startIndex: 1, endIndex: 500, paragraph: { elements: [] } },
                    { startIndex: 500, endIndex: 501 }
                ])
            });

            // Mock Batch Update
            mockFetch.mockResolvedValueOnce({ ok: true });

            await service.syncItem(docId, mockItem, token);

            // Verify Update Call
            expect(mockFetch).toHaveBeenLastCalledWith(
                expect.stringContaining(':batchUpdate'),
                expect.objectContaining({
                    method: 'POST'
                })
            );

            const body = JSON.parse(mockFetch.mock.calls[1][1].body);

            // Should contain deleteContentRange for the whole doc (1 to 500)
            const deleteRequest = body.requests.find((r: any) => r.deleteContentRange);
            expect(deleteRequest).toBeDefined();
            expect(deleteRequest.deleteContentRange.range).toEqual({ startIndex: 1, endIndex: 500 });

            // Should contain insertText at index 1
            const insertRequest = body.requests.find((r: any) => r.insertText);
            expect(insertRequest).toBeDefined();
            expect(insertRequest.insertText.location.index).toBe(1);
            expect(insertRequest.insertText.text).toContain('TEST-123');
        });
    });

    describe('syncItems (Bulk Wipe & Replace)', () => {
        it('should insert all items together in one giant block', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => createMockDoc([{ startIndex: 0, endIndex: 1 }, { startIndex: 1, endIndex: 2 }])
            });
            mockFetch.mockResolvedValueOnce({ ok: true });

            const items = [
                { ...mockItem, key: 'ITEM-1' },
                { ...mockItem, key: 'ITEM-2' }
            ];

            await service.syncItems(docId, items, token);

            const body = JSON.parse(mockFetch.mock.calls[1][1].body);
            const insertRequest = body.requests.find((r: any) => r.insertText);

            expect(insertRequest.insertText.text).toContain('ITEM-1');
            expect(insertRequest.insertText.text).toContain('ITEM-2');
        });
    });
});
