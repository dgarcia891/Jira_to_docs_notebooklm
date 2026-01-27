import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
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
const mockCheckCurrentPageLink = vi.fn();

vi.mock('../../hooks/useJiraSync', () => ({
    useJiraSync: () => ({
        currentIssueKey: 'TEST-123',
        currentIssueTitle: 'Test Title',
        isLoadingLink: false,
        checkCurrentPageLink: mockCheckCurrentPageLink,
        refreshLastSync: vi.fn(),
        linkedDoc: null,
    })
}));

vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        isAuthenticated: true,
        checkAuth: vi.fn(),
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

describe('Feature: Manual Refresh Button', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStorage.local.get.mockResolvedValue({});
    });

    it('should display the refresh button in the header', async () => {
        await act(async () => {
            render(<App />);
        });

        const refreshButton = screen.getByTitle(/Refresh page info/i);
        expect(refreshButton).toBeInTheDocument();
        expect(refreshButton.textContent).toBe('🔄');
    });

    it('should trigger checkCurrentPageLink when the refresh button is clicked', async () => {
        await act(async () => {
            render(<App />);
        });

        const refreshButton = screen.getByTitle(/Refresh page info/i);

        await act(async () => {
            fireEvent.click(refreshButton);
        });

        expect(mockCheckCurrentPageLink).toHaveBeenCalled();
    });
});
