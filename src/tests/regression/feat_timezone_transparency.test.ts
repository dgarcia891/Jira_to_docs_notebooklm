import { describe, it, expect, vi } from 'vitest';
import { DocsSyncService } from '../../services/docsSync';
import { formatDate } from '../../utils/docUtils';
import { WorkItem } from '../../types';

describe('Feature: Timezone Transparency', () => {
    it('should include a timezone indicator in formatted dates', () => {
        const date = new Date('2026-01-23T10:46:00Z');
        const formatted = formatDate(date);

        // We can't predict the exact timezone of the environment, 
        // but it should follow the pattern "Date (TZ)"
        expect(formatted).toMatch(/\(.*\)$/);
    });

    it('should use formatDate for Synced, Created, and Updated headers in docsSync', async () => {
        const docsSync = new DocsSyncService();
        const mockItem: WorkItem = {
            id: 'TEST-1',
            key: 'TEST-1',
            title: 'Test Issue',
            description: 'Test Description',
            status: 'Backlog',
            type: 'task',
            priority: 'Medium',
            assignee: 'User',
            reporter: 'Reporter',
            url: 'http://jira/TEST-1',
            source: 'jira',
            labels: [],
            createdDate: '2025-12-12T14:10:07Z',
            updatedDate: '2026-01-22T16:49:19Z',
            comments: []
        };

        // Mock fetch for batchUpdate and getDoc
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

        expect(insertText).toContain('Synced: ');
        expect(insertText).toContain('Created: ');
        expect(insertText).toContain('Updated: ');

        // Verify that at least one of these headers contains a timezone indicator "(...)"
        // Note: The Synced time depends on the current time, so we just check for the pattern
        const lines = insertText.split('\n');
        const createdLine = lines.find((l: string) => l.startsWith('Created: '));
        expect(createdLine).toMatch(/\(.*\)/);
    });
});
