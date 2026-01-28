import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../../App';
import * as useJiraSyncModule from '../../hooks/useJiraSync';

// Mock Hooks
vi.mock('../../hooks/useJiraSync', () => ({
    useJiraSync: vi.fn()
}));
vi.mock('../../hooks/useDrive', () => ({
    useDrive: vi.fn()
}));
vi.mock('../../hooks/useAuth', () => ({
    useAuth: vi.fn()
}));
vi.mock('../../hooks/useSettings', () => ({
    useSettings: () => ({
        localTimeZone: 'UTC',
        isColorBlindMode: false,
        debugMode: false
    })
}));

// Mock Chrome
const mockStorageGet = vi.fn();
const mockStorageRemove = vi.fn();
const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();

global.chrome = {
    runtime: {
        sendMessage: mockSendMessage,
        onMessage: { addListener: mockAddListener, removeListener: vi.fn() },
        openOptionsPage: vi.fn()
    },
    storage: {
        local: {
            get: mockStorageGet,
            set: vi.fn(),
            remove: mockStorageRemove
        }
    }
} as any;

import * as useAuthModule from '../../hooks/useAuth';
import * as useDriveModule from '../../hooks/useDrive';

describe('Bug: Banner Persistence', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuthModule.useAuth as any).mockReturnValue({
            isAuthenticated: true,
            checkAuth: vi.fn(),
            handleLogin: vi.fn(),
            handleLogout: vi.fn()
        });
        (useDriveModule.useDrive as any).mockReturnValue({
            loadDocs: vi.fn(),
            searchResults: [],
            isSearching: false,
            folders: [],
            folderPath: [],
            selectedDocId: null
        });
        (useJiraSyncModule.useJiraSync as any).mockReturnValue({
            currentIssueKey: 'TEST-1',
            currentIssueTitle: 'Test Issue',
            linkedDoc: null,
            isLoadingLink: false,
            checkCurrentPageLink: vi.fn(),
            refreshLastSync: vi.fn(),
            isEpic: false,
        });
        mockStorageGet.mockResolvedValue({});
    });

    it('should clear activeSyncState when a SYNC_STATE_UPDATE with result is received', async () => {
        let messageCallback: any;
        mockAddListener.mockImplementation((cb) => { messageCallback = cb; });

        await act(async () => {
            render(<App />);
        });

        // Simulate sync completion message
        const syncCompleteMsg = {
            type: 'SYNC_STATE_UPDATE',
            payload: {
                isSyncing: false,
                progress: 100,
                status: 'Done',
                result: { status: 'success', message: 'Sync Successful', time: Date.now() }
            }
        };

        await act(async () => {
            messageCallback(syncCompleteMsg);
            await new Promise(r => setTimeout(r, 0));
        });

        // VERIFY: The popup should have cleared the storage so it doesn't persist across sessions
        expect(mockStorageRemove).toHaveBeenCalledWith('activeSyncState');
    });
});
