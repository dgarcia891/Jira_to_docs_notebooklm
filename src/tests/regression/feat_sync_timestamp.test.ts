import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocsSyncService } from '../../services/docsSync';
import { WorkItem } from '../../types';

describe('Feature: Sync Timestamp', () => {
    let docsService: DocsSyncService;
    const mockToken = 'mock-token';
    const mockDocId = 'mock-doc-id';

    beforeEach(() => {
        vi.clearAllMocks();
        docsService = new DocsSyncService();

        // Mock fetch for Google Docs API
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url.includes('/documents/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        body: {
                            content: [
                                { endIndex: 1 }
                            ]
                        }
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });
    });

    it('should include "Synced: " with current date in the metadata block', async () => {
        const item: WorkItem = {
            id: 'TEST-1',
            key: 'TEST-1',
            title: 'Test Issue',
            description: 'Test Description',
            status: 'To Do',
            type: 'task',
            source: 'jira',
            labels: [],
            url: 'https://jira.com/TEST-1',
            comments: []
        };

        const batchUpdateSpy = vi.spyOn(docsService as any, 'batchUpdate').mockResolvedValue({});

        await docsService.syncItem(mockDocId, item, mockToken);

        expect(batchUpdateSpy).toHaveBeenCalled();
        const requests = batchUpdateSpy.mock.calls[0][2] as any[];

        // Find the insertText request that contains the body content
        const bodyRequest = requests.find(r => r.insertText && r.insertText.text.includes('Synced:'));

        expect(bodyRequest).toBeDefined();
        expect(bodyRequest.insertText.text).toMatch(/Synced: .+/);

        // Verify it's not "N/A"
        expect(bodyRequest.insertText.text).not.toContain('Synced: N/A');
    });
});
