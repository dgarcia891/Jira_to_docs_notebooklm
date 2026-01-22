import { render, screen, waitFor, act } from '@testing-library/react';
import App from '../../App';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock chrome API
const mockStorage = {
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
        },
    },
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
    }
};
global.chrome = mockStorage as any;

describe('Bug Fix: Last Sync Info Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should update Last Synced Info when currentIssueKey becomes available', async () => {
        // Setup:
        // 1. Initial State: No issue key, but storage has sync info for "TEST-123"
        const storedSyncData = {
            issueSyncTimes: {
                "TEST-123": {
                    status: 'success',
                    time: Date.now() - 10000, // 10 seconds ago
                    message: 'Synced to Doc'
                }
            },
            lastSyncType: 'single'
        };

        // Mock Storage returning the sync data
        mockStorage.storage.local.get.mockImplementation((keys: any) => {
            if (Array.isArray(keys) && keys.includes('issueSyncTimes')) {
                return Promise.resolve(storedSyncData);
            }
            if (keys === 'lastFolderPath') return Promise.resolve({});
            if (keys === 'jira_api_token') return Promise.resolve({});
            if (keys === 'issueDocLinks') return Promise.resolve({ issueDocLinks: { "TEST-123": { docId: "123", name: "My Doc" } } });
            return Promise.resolve({});
        });

        // Mock Auth Check
        mockStorage.runtime.sendMessage.mockImplementation((msg) => {
            if (msg.type === 'CHECK_AUTH') return Promise.resolve('fake-token');
            if (msg.type === 'LIST_DOCS') return Promise.resolve([]);
            if (msg.type === 'GET_SELECTED_DOC') return Promise.resolve({ docId: '123' });
            if (msg.type === 'GET_ISSUE_DOC_LINK') return Promise.resolve({ docId: "123", name: "My Doc" });
            if (msg.type === 'GET_LAST_SYNC') return Promise.resolve({ status: 'success', time: Date.now() - 10000 });

            // KEY MOMENT: "GET_CURRENT_ISSUE_KEY"
            if (msg.type === 'GET_CURRENT_ISSUE_KEY') return Promise.resolve('TEST-123');

            return Promise.resolve(null);
        });

        await act(async () => {
            render(<App />);
        });

        // Wait for the "Last synced:" text.
        await waitFor(() => {
            expect(screen.getByText(/Last synced:/i)).toBeInTheDocument();
        }, { timeout: 4000 });
    });
});
