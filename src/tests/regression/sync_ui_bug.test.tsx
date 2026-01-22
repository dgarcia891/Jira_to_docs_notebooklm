import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import App from '../../App';
import React from 'react';

// Mock chrome API
const mockStorage: any = {
    local: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
    }
};

const mockRuntime: any = {
    sendMessage: vi.fn(),
    onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
    }
};

const mockTabs: any = {
    query: vi.fn(),
    sendMessage: vi.fn(),
};

global.chrome = {
    storage: mockStorage,
    runtime: mockRuntime,
    tabs: mockTabs,
} as any;

// Stable mocks for hooks
const mockCheckAuth = vi.fn();
const mockHandleLogin = vi.fn();
const mockHandleLogout = vi.fn();
const mockLoadDocs = vi.fn();
const mockCheckCurrentPageLink = vi.fn();
const mockRefreshLastSync = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        isAuthenticated: true,
        checkAuth: mockCheckAuth,
        handleLogin: mockHandleLogin,
        handleLogout: mockHandleLogout,
    })
}));

vi.mock('../../hooks/useDrive', () => ({
    useDrive: () => ({
        loadDocs: mockLoadDocs,
        folders: [],
        searchResults: [],
    })
}));

vi.mock('../../hooks/useJiraSync', () => ({
    useJiraSync: () => ({
        currentIssueKey: 'TEST-123',
        isLoadingLink: false,
        checkCurrentPageLink: mockCheckCurrentPageLink,
        refreshLastSync: mockRefreshLastSync,
    })
}));

describe('Sync UI Bug Reproduction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStorage.local.get.mockResolvedValue({});
    });

    it('should NOT show syncing UI if syncState is missing from storage', async () => {
        await act(async () => {
            render(<App />);
        });
        expect(screen.queryByText(/Syncing.../i)).toBeNull();
    });

    it('should handle SYNC_ERROR message from background', async () => {
        await act(async () => {
            render(<App />);
        });

        const listener = mockRuntime.onMessage.addListener.mock.calls[0][0];

        await act(async () => {
            listener({ type: 'SYNC_ERROR', payload: { message: 'Failed to find issue' } });
        });

        await waitFor(() => {
            expect(screen.getByText(/Error: Failed to find issue/i)).toBeDefined();
            expect(screen.getByText(/Sync Individual/i)).toBeDefined();
        }, { timeout: 3000 });
    });
});
