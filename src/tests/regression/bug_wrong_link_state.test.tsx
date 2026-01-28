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
global.chrome = {
    runtime: {
        sendMessage: vi.fn(),
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
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

describe('Bug: Wrong Link State Pollution', () => {
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
    });

    it('should NOT show sync banner for a different issue key', async () => {
        // SCENARIO: User is on Issue B (ETBSC-1224), but storage has sync state for Issue A (ETBSC-1160)

        // Mock hook returning Issue B
        (useJiraSyncModule.useJiraSync as any).mockReturnValue({
            currentIssueKey: 'ETBSC-1224',
            currentIssueTitle: 'Optimize Flow Logic',
            linkedDoc: null,
            isLoadingLink: false,
            checkCurrentPageLink: vi.fn(),
            refreshLastSync: vi.fn(),
            isEpic: false,
        });

        // Mock storage returning Sync State for Issue A
        (global.chrome.storage.local.get as any).mockResolvedValue({
            activeSyncState: {
                isSyncing: false,
                key: 'ETBSC-1160', // DIFFERENT KEY
                progress: 100,
                status: 'Complete!',
                result: {
                    status: 'success',
                    message: 'Synced to .ETBSC-1160: Deprecate Process Builder'
                }
            }
        });

        await act(async () => {
            render(<App />);
        });

        // FAIL CASE: The banner for 1160 should NOT appear when we are on 1224
        // If it appears, it means we are polluting state across issues
        const bannerText = screen.queryByText(/Synced to .ETBSC-1160/i);
        expect(bannerText).toBeNull();
    });
});
