import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import App from '../../App';
import React from 'react';

// Mock chrome API
const mockStorage: any = {
    local: { get: vi.fn(), set: vi.fn(), remove: vi.fn() }
};

const mockRuntime: any = {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    openOptionsPage: vi.fn(),
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

// Mock hooks
const mockCheckAuth = vi.fn();
const mockCheckCurrentPageLink = vi.fn();
const mockRefreshLastSync = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        isAuthenticated: true,
        checkAuth: mockCheckAuth,
        handleLogin: vi.fn(),
        handleLogout: vi.fn(),
    })
}));

vi.mock('../../hooks/useDrive', () => ({
    useDrive: () => ({
        loadDocs: vi.fn(),
        folders: [],
        searchResults: [],
    })
}));

describe('Bug Fix: Missing Epic Button', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStorage.local.get.mockResolvedValue({});
    });

    it('should NOT show Epic button if keyData is a string (reproducing the bug)', async () => {
        // Simulating the bug: Background returns a string instead of an object
        mockRuntime.sendMessage.mockImplementation(async (msg: any) => {
            if (msg.type === 'GET_CURRENT_ISSUE_KEY') return 'EPIC-123';
            if (msg.type === 'GET_ISSUE_DOC_LINK') return { id: 'doc-1', name: 'Doc 1' };
            return null;
        });

        await act(async () => {
            render(<App />);
        });

        // Current key is extracted from the string
        expect(screen.getByText(/EPIC-123/i)).toBeDefined();

        // BUT the Epic button should be missing because 'type' was never received
        expect(screen.queryByText(/Sync All/i)).toBeNull();
    });

    it('should show Epic button if keyData is an object with type "Epic" (desired behavior)', async () => {
        // Simulating the fix: Background returns the full object
        mockRuntime.sendMessage.mockImplementation(async (msg: any) => {
            if (msg.type === 'GET_CURRENT_ISSUE_KEY') return { key: 'EPIC-123', type: 'Epic', title: 'My Epic' };
            if (msg.type === 'GET_ISSUE_DOC_LINK') return { id: 'doc-1', name: 'Doc 1' };
            return null;
        });

        await act(async () => {
            render(<App />);
        });

        await waitFor(() => {
            // Can be "Sync All" or "Syncing..."
            const button = screen.queryByText(/Sync All/i) || screen.queryByText(/Syncing.../i);
            expect(button).not.toBeNull();
        });
    });
});
