import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('Stuck Sync Debug', () => {
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

    it('should set progress to 10 locally even if background hangs', async () => {
        // Setup: Linked State to Trigger Sync
        (useJiraSyncModule.useJiraSync as any).mockReturnValue({
            currentIssueKey: 'TEST-1',
            currentIssueTitle: 'Test Issue',
            linkedDoc: { id: 'doc-1', name: 'Linked Doc' },
            isLoadingLink: false,
            checkCurrentPageLink: vi.fn(),
            refreshLastSync: vi.fn(),
            newDocTitle: 'TEST-1: Test Issue',
            isEpic: false
        });

        // Simulate Hanging sendMessage
        (chrome.runtime.sendMessage as any).mockImplementation(() => new Promise(() => { })); // Never resolves

        await act(async () => {
            render(<App />);
        });

        const syncButton = screen.getByText('Sync Individual');

        // Action: Click Sync
        await act(async () => {
            fireEvent.click(syncButton);
        });

        // Check Button State
        expect(screen.getByText('Syncing...')).toBeInTheDocument();

        // Check Progress Bar (TEXT)
        // ProgressBar usually renders "10%" text
        expect(screen.getByText('10%')).toBeInTheDocument();
    });
});
