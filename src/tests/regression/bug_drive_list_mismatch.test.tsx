import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDrive } from '../../hooks/useDrive';

// Mock Chrome API
global.chrome = {
    runtime: {
        sendMessage: vi.fn().mockResolvedValue([]),
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined),
        }
    }
} as any;

describe('Bug: Drive Folder List Message Mismatch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should send LIST_DRIVE_FOLDERS message when loading folders', async () => {
        const { result } = renderHook(() => useDrive());

        await act(async () => {
            await result.current.loadFolders('root');
        });

        // The bug is that it sends 'LIST_FOLDERS' instead of 'LIST_DRIVE_FOLDERS'
        // This assertion enforces the correct contract with background.ts
        expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'LIST_DRIVE_FOLDERS', // Correct type expected by background.ts
                payload: { parentId: 'root' }
            })
        );
    });
});
