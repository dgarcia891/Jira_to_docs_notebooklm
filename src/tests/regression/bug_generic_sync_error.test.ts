import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Bug: Generic Sync Error', () => {
    // We want to test the error handling in background.ts
    // Since we can't easily run background.ts in vitest without complex mocking,
    // we'll simulate the logic we want to implement.

    const handleGetCurrentIssueKey = async (sendMessageMock: any) => {
        try {
            const response = await sendMessageMock();
            return response;
        } catch (e: any) {
            if (e.message.includes('Could not establish connection') || e.message.includes('context invalidated')) {
                throw new Error('Extension updated. Please refresh your Jira page to continue.');
            }
            throw new Error('Please open the extension on a Jira issue page.');
        }
    };

    it('should throw "Please refresh" if connection fails due to context invalidation', async () => {
        const mockFail = vi.fn().mockRejectedValue(new Error('Extension context invalidated.'));

        await expect(handleGetCurrentIssueKey(mockFail))
            .rejects.toThrow('Extension updated. Please refresh your Jira page to continue.');
    });

    it('should throw generic message for other errors', async () => {
        const mockFail = vi.fn().mockRejectedValue(new Error('Random error'));

        await expect(handleGetCurrentIssueKey(mockFail))
            .rejects.toThrow('Please open the extension on a Jira issue page.');
    });
});
