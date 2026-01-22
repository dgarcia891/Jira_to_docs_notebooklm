import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

global.chrome = {
    storage: mockStorage,
    runtime: mockRuntime,
} as any;

// Mocks for hooks
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ isAuthenticated: true, checkAuth: vi.fn() })
}));

vi.mock('../../hooks/useDrive', () => ({
    useDrive: () => ({ loadDocs: vi.fn(), folders: [], searchResults: [] })
}));

vi.mock('../../hooks/useJiraSync', () => ({
    useJiraSync: () => ({
        currentIssueKey: 'TEST-123',
        isLoadingLink: false,
        checkCurrentPageLink: vi.fn(),
        refreshLastSync: vi.fn(),
    })
}));

describe('Feature: Sync Persistence (Resume on Mount)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should resume sync UI if an active sync is found in storage on mount', async () => {
        const activeSyncState = {
            isSyncing: true,
            progress: 45,
            status: 'Gathering metadata...',
            key: 'TEST-123'
        };

        mockStorage.local.get.mockImplementation(async (key: string) => {
            if (key === 'activeSyncState') return { activeSyncState };
            return {};
        });

        await act(async () => {
            render(<App />);
        });

        // The progress bar should be visible even though handleSync was never called in the popup session
        expect(screen.getByText(/45%/)).toBeDefined();
        expect(screen.getByText(/Gathering metadata.../i)).toBeDefined();
        expect(screen.getByText(/PROGRESS/)).toBeDefined();
    });
});
