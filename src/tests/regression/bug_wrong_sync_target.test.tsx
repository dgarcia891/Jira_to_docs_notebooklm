import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../../App';
import * as useJiraSyncModule from '../../hooks/useJiraSync';
import * as useDriveModule from '../../hooks/useDrive';
import * as useAuthModule from '../../hooks/useAuth';
import { extractKeyFromUrl } from '../../parsers/jira/utils';

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
            remove: vi.fn().mockResolvedValue(true)
        }
    },
    tabs: {
        query: vi.fn()
    }
} as any;

describe('Sync Target Regression (BUG report: sync to 1210)', () => {
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

    it('reproduces: extractKeyFromUrl fails on board/backlog URLs', () => {
        const boardUrl = 'https://proj.atlassian.net/jira/software/projects/PROJ/boards/1/backlog?selectedIssue=ETBSC-1278';
        const issuesUrl = 'https://proj.atlassian.net/jira/software/c/projects/PROJ/issues/ETBSC-1278';

        // This is expected to FAIL currently as it only supports /browse/
        expect(extractKeyFromUrl(boardUrl)).toBe('ETBSC-1278');
        expect(extractKeyFromUrl(issuesUrl)).toBe('ETBSC-1278');
    });

    it('reproduces: Sync targets currentIssueKey regardless of active tab switching', async () => {
        // Setup: Popup thinks we are on ETBSC-1278
        (useJiraSyncModule.useJiraSync as any).mockReturnValue({
            currentIssueKey: 'ETBSC-1278',
            currentIssueTitle: 'Correct Issue',
            linkedDoc: { id: 'doc123', name: 'My Document' },
            isLoadingLink: false,
            checkCurrentPageLink: vi.fn(),
            refreshLastSync: vi.fn(),
            newDocTitle: 'ETBSC-1278: Correct Issue',
            isEpic: false
        });

        await act(async () => {
            render(<App />);
        });

        const syncButton = screen.getByText('Sync Individual');

        // Action: Click Sync
        await act(async () => {
            fireEvent.click(syncButton);
        });

        // Current Bug: Payload is empty, background script will query active tab independently
        // Fix: payload should contain { issueKey: 'ETBSC-1278' }
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
            type: 'SYNC_CURRENT_PAGE',
            payload: { issueKey: 'ETBSC-1278' }
        });
    });
});
