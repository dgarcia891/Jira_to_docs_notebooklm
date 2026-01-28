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

describe('Pending Link UI State', () => {
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

    it('should show pending link UI and hide existing linked doc when pendingLink exists', async () => {
        // 1. Mock storage to have a pending selection
        (global.chrome.storage.local.get as any).mockImplementation(async (key: string) => {
            if (key === 'selectedDoc') return { selectedDoc: { id: 'pending-id', name: 'Pending Document' } };
            return {};
        });

        // 2. Mock useJiraSync to have an existing linked doc
        (useJiraSyncModule.useJiraSync as any).mockReturnValue({
            currentIssueKey: 'TEST-1',
            currentIssueTitle: 'Test Issue',
            linkedDoc: { id: 'old-doc', name: 'Old Document' },
            isLoadingLink: false,
            checkCurrentPageLink: vi.fn(),
            refreshLastSync: vi.fn(),
            isEpic: false,
        });

        await act(async () => {
            render(<App />);
        });

        // 3. Verify Pending box is shown
        expect(screen.getByText(/New Link Pending:/)).toBeDefined();
        expect(screen.getByText(/Pending Document/)).toBeDefined();

        // 4. Verify Old Linked Doc is NOT shown (regression check)
        expect(screen.queryByText(/Old Document/)).toBeNull();
        expect(screen.queryByText(/🔗 Linked Document/i)).toBeNull();
    });

    it('should clear pending link when X is clicked', async () => {
        // Setup same as above
        (global.chrome.storage.local.get as any).mockImplementation(async (key: string) => {
            if (key === 'selectedDoc') return { selectedDoc: { id: 'pending-id', name: 'Pending Document' } };
            return {};
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

        await act(async () => {
            render(<App />);
        });

        const cancelButton = screen.getByTitle(/Cancel pending link/i);
        expect(cancelButton).toBeDefined();

        await act(async () => {
            cancelButton.click();
        });

        // Verify storage remove was called
        expect(global.chrome.storage.local.remove).toHaveBeenCalledWith('selectedDoc');
        expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'REMOVE_SELECTED_DOC' });
    });
});
