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
            set: vi.fn(),
            remove: vi.fn()
        }
    }
} as any;

import * as useAuthModule from '../../hooks/useAuth';
import * as useDriveModule from '../../hooks/useDrive';

describe('Bug: Sync UI Overlap & Stuck State', () => {
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

    it('should NOT show "No document linked yet" if a pendingLink is present', async () => {
        (useJiraSyncModule.useJiraSync as any).mockReturnValue({
            currentIssueKey: 'TEST-1160',
            currentIssueTitle: 'Deprecate Process Builder',
            linkedDoc: null,
            isLoadingLink: false,
            checkCurrentPageLink: vi.fn(),
            refreshLastSync: vi.fn(),
            isEpic: false,
        });

        // Mock storage to have a pending selection
        (global.chrome.storage.local.get as any).mockResolvedValue({
            selectedDoc: { id: 'new-doc-id', name: 'New Document' }
        });

        await act(async () => {
            render(<App />);
        });

        // Verify "New Link Pending" is shown
        expect(screen.getByText(/New Link Pending:/)).toBeDefined();

        // FAIL CASE: "No document linked yet" should be hidden when we have a pending link
        expect(screen.queryByText(/No document linked yet/i)).toBeNull();
    });
});
