import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../../App';
import * as useJiraSyncModule from '../../hooks/useJiraSync';
import * as useDriveModule from '../../hooks/useDrive';
import * as useAuthModule from '../../hooks/useAuth';

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
            set: vi.fn(),
            remove: vi.fn()
        }
    }
} as any;

describe('Sync Individual UX Regression', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock Returns
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

    it('should open Linking Options instead of Syncing if no doc is linked', async () => {
        // Setup: Unlinked State
        (useJiraSyncModule.useJiraSync as any).mockReturnValue({
            currentIssueKey: 'TEST-1',
            currentIssueTitle: 'Test Issue',
            linkedDoc: null, // UNLINKED
            isLoadingLink: false,
            checkCurrentPageLink: vi.fn(),
            refreshLastSync: vi.fn(),
            newDocTitle: 'TEST-1: Test Issue',
            isEpic: false
        });

        await act(async () => {
            render(<App />);
        });

        const syncButton = screen.getByText('Link & Sync');

        // Action: Click Sync
        await act(async () => {
            fireEvent.click(syncButton);
        });

        // Expectation:
        // 1. Should NOT send SYNC_CURRENT_PAGE message
        expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: 'SYNC_CURRENT_PAGE' });

        // 2. Should show Linking Options
        // We can check if "Create & Link" button (from LinkingTabs) is visible
        expect(screen.getByText('Create & Link', { exact: false })).toBeInTheDocument();
    });
});
