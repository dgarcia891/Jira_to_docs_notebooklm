import { describe, it, expect, vi } from 'vitest';
import { DocsSyncService } from '../../services/docsSync';
import { WorkItem } from '../../types';

describe('Feature: Story Points Integration', () => {
    it('should include Story Points in the metadata block of docsSync', async () => {
        const docsSync = new DocsSyncService();
        const mockItem: WorkItem = {
            id: 'TEST-1',
            key: 'TEST-1',
            title: 'Test Issue',
            description: 'Test Description',
            status: 'Backlog',
            type: 'story',
            priority: 'Medium',
            assignee: 'User',
            reporter: 'Reporter',
            url: 'http://jira/TEST-1',
            source: 'jira',
            labels: [],
            createdDate: '2025-12-12T14:10:07Z',
            updatedDate: '2026-01-22T16:49:19Z',
            storyPoints: '5',
            comments: []
        };

        const mockToken = 'mock-token';
        const mockDocId = 'mock-doc-id';

        global.fetch = vi.fn().mockImplementation((url) => {
            if (url.includes(':batchUpdate')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
            }
            if (url.endsWith(mockDocId)) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ body: { content: [{ endIndex: 10 }] } })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        await docsSync.syncItem(mockDocId, mockItem, mockToken);

        const lastCall = vi.mocked(global.fetch).mock.calls.find(call => call[0].toString().includes(':batchUpdate'));
        const body = JSON.parse(lastCall![1]!.body as string);
        const insertText = body.requests.find((r: any) => r.insertText)?.insertText.text;

        expect(insertText).toContain('Story Points: 5');
    });
});
