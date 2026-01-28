import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useJiraSync } from '../../hooks/useJiraSync';
import { renderHook, waitFor } from '@testing-library/react';

// Mock chrome API
const mockSendMessage = vi.fn();
global.chrome = {
    runtime: {
        sendMessage: mockSendMessage,
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() }
    },
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn()
        }
    }
} as any;

describe('Change Link & Sync Target Fixes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should format newDocTitle as "KEY: Title"', async () => {
        // Mock current issue response
        mockSendMessage.mockImplementation((msg) => {
            if (msg.type === 'GET_CURRENT_ISSUE_KEY') {
                return Promise.resolve({
                    key: 'TEST-123',
                    title: 'Fix Login Bug',
                    type: 'Story'
                });
            }
            if (msg.type === 'GET_ISSUE_DOC_LINK') return Promise.resolve(null);
            return Promise.resolve(null);
        });

        const { result } = renderHook(() => useJiraSync());

        // Trigger the fetch
        await result.current.checkCurrentPageLink();

        // Wait for hook to update state
        await waitFor(() => {
            expect(result.current.currentIssueKey).toBe('TEST-123');
        });

        // The Fix: Expect "TEST-123: Fix Login Bug"
        expect(result.current.newDocTitle).toBe('TEST-123: Fix Login Bug');
    });
});
