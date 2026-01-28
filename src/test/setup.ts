import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Define global Chrome mock for all tests
global.chrome = {
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
        getURL: vi.fn(),
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined), // Critical fix for App.tsx mount
            clear: vi.fn().mockResolvedValue(undefined),
        },
        sync: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined),
        }
    },
    tabs: {
        query: vi.fn().mockResolvedValue([]),
        sendMessage: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
    },
    action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
    },
    contextMenus: {
        create: vi.fn(),
        removeAll: vi.fn(),
        onClicked: { addListener: vi.fn() }
    }
} as any;
