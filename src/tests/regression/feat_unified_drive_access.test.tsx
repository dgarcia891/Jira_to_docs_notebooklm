import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDrive } from '../../hooks/useDrive';

// Mock Chrome API
global.chrome = {
    runtime: {
        sendMessage: vi.fn(),
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined),
        }
    }
} as any;

describe('Feature: Unified Drive Access', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should identify folders by mimeType and append suffix', async () => {
        const mockResponse = [
            { id: 'f1', name: 'Standard Folder', mimeType: 'application/vnd.google-apps.folder' },
            { id: 'd1', name: 'Standard Document', mimeType: 'application/vnd.google-apps.document' }
        ];

        (global.chrome.runtime.sendMessage as any).mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useDrive());

        await act(async () => {
            await result.current.loadFolders('root');
        });

        // Verify folders state (used by FolderBrowser)
        expect(result.current.folders).toEqual([
            { id: 'f1', name: 'Standard Folder (Folder)' },
            { id: 'd1', name: 'Standard Document' }
        ]);
    });

    it('should map search results with folder suffixes', async () => {
        const mockSearchResponse = [
            { id: 's1', name: 'Matching Folder', mimeType: 'application/vnd.google-apps.folder' },
            { id: 's2', name: 'Matching Doc', mimeType: 'application/vnd.google-apps.document' }
        ];

        (global.chrome.runtime.sendMessage as any).mockResolvedValue(mockSearchResponse);

        const { result } = renderHook(() => useDrive());

        await act(async () => {
            await result.current.handleSearchDocs('test');
        });

        expect(result.current.searchResults).toEqual([
            { id: 's1', name: 'Matching Folder (Folder)' },
            { id: 's2', name: 'Matching Doc' }
        ]);
    });
});
