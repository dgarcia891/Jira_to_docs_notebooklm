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
let messageListener: ((msg: any) => void) | null = null;
global.chrome = {
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn((fn) => { messageListener = fn; }),
            removeListener: vi.fn()
        },
        openOptionsPage: vi.fn()
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined)
        }
    }
} as any;

import * as useAuthModule from '../../hooks/useAuth';
import * as useDriveModule from '../../hooks/useDrive';

describe('Bug: Persistent Stale Link UI', () => {
    const mockCheckLink = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockCheckLink.mockClear();

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
            currentIssueKey: 'ETBSC-1224',
            currentIssueTitle: 'Optimize Flow Logic',
            linkedDoc: null,
            isLoadingLink: false,
            checkCurrentPageLink: mockCheckLink,
            refreshLastSync: vi.fn(),
            isEpic: false,
            newDocTitle: 'ETBSC-1224: Optimize Flow Logic',
            setNewDocTitle: vi.fn()
        });
    });

    it('should refresh link state when sync completes successfully', async () => {
        render(<App />);

        // checkCurrentPageLink is called on mount
        expect(mockCheckLink).toHaveBeenCalledTimes(1);
        mockCheckLink.mockClear();

        // Simulate SYNC_STATE_UPDATE from background
        await act(async () => {
            if (messageListener) {
                messageListener({
                    type: 'SYNC_STATE_UPDATE',
                    payload: {
                        isSyncing: false,
                        progress: 100,
                        status: 'Complete!',
                        key: 'ETBSC-1224',
                        result: {
                            status: 'success',
                            message: 'Synced to ETBSC-1224: Optimize Flow Logic',
                            time: Date.now()
                        }
                    }
                });
            }
        });

        // VERIFY: checkCurrentPageLink should be called to refresh the UI's linkedDoc state
        expect(mockCheckLink).toHaveBeenCalled();
    });
});
