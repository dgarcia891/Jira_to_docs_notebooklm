import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../../App';
import React from 'react';

// Mock chrome API
global.chrome = {
    storage: {
        local: { get: vi.fn().mockResolvedValue({}), set: vi.fn(), remove: vi.fn() }
    },
    runtime: {
        sendMessage: vi.fn(),
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
        openOptionsPage: vi.fn(),
    }
} as any;

// Mocks for hooks
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

const mockLinkedDoc = vi.fn();

vi.mock('../../hooks/useJiraSync', () => ({
    useJiraSync: () => ({
        currentIssueKey: 'TEST-123',
        currentIssueTitle: 'Test Issue',
        isLoadingLink: false,
        linkedDoc: mockLinkedDoc(),
        checkCurrentPageLink: mockCheckCurrentPageLink,
        refreshLastSync: mockRefreshLastSync,
        timeAgo: 'Just now',
        isEpic: false
    })
}));

describe('Feature: UI Link Consolidation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the "Open" link with a valid URL using "id" property', async () => {
        mockLinkedDoc.mockReturnValue({ id: 'doc-123', name: 'Standard Doc' });

        await act(async () => {
            render(<App />);
        });

        const openLink = screen.getByRole('link', { name: /Open/i });
        expect(openLink).toBeDefined();
        expect(openLink.getAttribute('href')).toBe('https://docs.google.com/document/d/doc-123');
    });

    it('should render the "Open" link with a valid URL using legacy "docId" property', async () => {
        // Simulating legacy data format
        mockLinkedDoc.mockReturnValue({ docId: 'legacy-456', name: 'Legacy Doc' });

        await act(async () => {
            render(<App />);
        });

        const openLink = screen.getByRole('link', { name: /Open/i });
        expect(openLink.getAttribute('href')).toBe('https://docs.google.com/document/d/legacy-456');
    });

    it('should NOT show a link in the success banner after sync (consolidation check)', async () => {
        mockLinkedDoc.mockReturnValue({ id: 'doc-123', name: 'Standard Doc' });

        await act(async () => {
            render(<App />);
        });

        const listener = (global.chrome.runtime.onMessage.addListener as any).mock.calls[0][0];

        await act(async () => {
            listener({ type: 'SYNC_COMPLETE' });
        });

        // The success message should be present
        expect(screen.getByText(/Sync Complete!/i)).toBeDefined();

        // But there should not be a SECOND "Open Doc" link in the banner area
        // Note: The "Open" in the green box still exists, so we check total links or specificity
        const allOpenLinks = screen.getAllByRole('link', { name: /Open/i });
        expect(allOpenLinks.length).toBe(1); // Only the one in the green box
        expect(screen.queryByText(/Open Doc/i)).toBeNull();
    });
});
