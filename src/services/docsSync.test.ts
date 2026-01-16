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
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('v1/documents'),
                expect.objectContaining({ method: 'POST', body: JSON.stringify({ title: 'My Doc' }) })
            );
        });

        it('should list docs', async () => {
            const mockFiles = [{ id: '1', name: 'Doc 1' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ files: mockFiles })
            });

            const files = await service.listDocs(token);
            expect(files).toEqual(mockFiles);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('drive/v3/files'),
                expect.any(Object)
            );
        });
    });

    describe('findSectionRange', () => {
        it('should return null if key not found', () => {
            const doc = createMockDoc([
                { paragraph: { elements: [{ textRun: { content: 'Title' } }] } }
            ]);
            expect(service.findSectionRange(doc, 'TEST-123')).toBeNull();
        });

        it('should find range starting at H2 matching key', () => {
            const doc = createMockDoc([
                { startIndex: 1, endIndex: 10, paragraph: { elements: [{ textRun: { content: 'Intro' } }] } },
                // Target Start
                {
                    startIndex: 11,
                    endIndex: 20,
                    paragraph: {
                        paragraphStyle: { namedStyleType: 'HEADING_2' },
                        elements: [{ textRun: { content: 'TEST-123: Title' } }]
                    }
                },
                { startIndex: 21, endIndex: 30, paragraph: { elements: [{ textRun: { content: 'Body' } }] } },
                // Next H2 (Target End)
                {
                    startIndex: 31,
                    endIndex: 40,
                    paragraph: {
                        paragraphStyle: { namedStyleType: 'HEADING_2' },
                        elements: [{ textRun: { content: 'OTHER-456' } }]
                    }
                },
            ]);

            const range = service.findSectionRange(doc, 'TEST-123');
            expect(range).toEqual({ startIndex: 11, endIndex: 31 });
        });
    });

    describe('syncItem', () => {
        it('should APPEND if section not found', async () => {
            // Mock Get Doc
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => createMockDoc([{ endIndex: 100 }]) // End of doc
            });

            // Mock Batch Update
            mockFetch.mockResolvedValueOnce({ ok: true });

            await service.syncItem(docId, mockItem, token);

            // Verify Update Call
            expect(mockFetch).toHaveBeenLastCalledWith(
                expect.stringContaining(':batchUpdate'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('insertText')
                })
            );

            // Should NOT contain deleteContentRange
            const body = JSON.parse(mockFetch.mock.calls[1][1].body);
            expect(body.requests[0].insertText).toBeDefined();
            expect(body.requests.find((r: any) => r.deleteContentRange)).toBeUndefined();
        });

        it('should UPDATE if section found', async () => {
            // Mock Get Doc finding section at 10 to 50
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => createMockDoc([
                    {
                        startIndex: 10,
                        endIndex: 20,
                        paragraph: {
                            paragraphStyle: { namedStyleType: 'HEADING_2' },
                            elements: [{ textRun: { content: 'TEST-123' } }]
                        }
                    },
                    {
                        startIndex: 50,
                        endIndex: 60,
                        paragraph: { paragraphStyle: { namedStyleType: 'HEADING_2' } }
                    }
                ])
            });

            // Mock Batch Update
            mockFetch.mockResolvedValueOnce({ ok: true });

            await service.syncItem(docId, mockItem, token);

            // Expect Delete then Insert
            const body = JSON.parse(mockFetch.mock.calls[1][1].body);
            expect(body.requests).toHaveLength(2);
            expect(body.requests[0].deleteContentRange).toBeDefined();
            expect(body.requests[0].deleteContentRange.range).toEqual({ startIndex: 10, endIndex: 50 });
            expect(body.requests[1].insertText).toBeDefined();
        });
    });
});
