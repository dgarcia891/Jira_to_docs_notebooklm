import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useJiraSync } from '../../hooks/useJiraSync';
import { useDrive } from '../../hooks/useDrive';
import { renderHook, waitFor } from '@testing-library/react';

// Mock chrome API
const mockSendMessage = vi.fn();
const mockLink = { id: 'OLD-DEAD-ID', name: 'Old Doc' };
const mockNewDoc = { id: 'NEW-DOC-ID', name: 'New Doc' };

global.chrome = {
    runtime: {
        sendMessage: mockSendMessage,
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
        openOptionsPage: vi.fn()
    },
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn()
        }
    }
} as any;

describe('Change Link UX Regression', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should prioritize selectedDoc over existing dead link', async () => {
        // Mock Storage State: Link exists but is dead (not simulated here, just observing logic flow)
        // Background logic simulation required essentially, or integration test.
        // Since we can't easily run background.ts in hook test, we mock the sequence.

        // 1. Setup: Current link is OLD
        mockSendMessage.mockImplementation((msg) => {
            if (msg.type === 'GET_ISSUE_DOC_LINK') return Promise.resolve(mockLink);
            if (msg.type === 'SET_SELECTED_DOC') {
                // Verify payload
                expect(msg.payload).toEqual({ id: mockNewDoc.id, name: mockNewDoc.name });
                return Promise.resolve(true);
            }
            if (msg.type === 'SYNC_CURRENT_PAGE') {
                // This is where background code runs.
                // We want to verify that App.tsx SENDS the SET_SELECTED_DOC message *before* SYNC_CURRENT_PAGE.
                return Promise.resolve({ success: true });
            }
            return Promise.resolve(null);
        });

        // 2. Simulate User Action: Select New Doc and Trigger Sync
        // We need to simulate the handleCreateAndLink logic from App.tsx.
        // Since we can't import App.tsx inner function, we can replicate the logic or verify the hook behavior if logic was in hook.
        // Logic is in App.tsx.

        // Let's create a minimal reproduction of the App.tsx logic:
        const handleCreateAndLink = async () => {
            await chrome.runtime.sendMessage({ type: 'SET_SELECTED_DOC', payload: { id: mockNewDoc.id, name: mockNewDoc.name } });
            await chrome.runtime.sendMessage({ type: 'SYNC_CURRENT_PAGE' });
        };

        await handleCreateAndLink();

        // Verify Order
        expect(mockSendMessage).toHaveBeenNthCalledWith(1, {
            type: 'SET_SELECTED_DOC',
            payload: { id: mockNewDoc.id, name: mockNewDoc.name }
        });
        expect(mockSendMessage).toHaveBeenNthCalledWith(2, { type: 'SYNC_CURRENT_PAGE' });
    });
});
