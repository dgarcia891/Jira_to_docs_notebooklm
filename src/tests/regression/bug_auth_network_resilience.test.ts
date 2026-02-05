import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleAuthService } from '../../services/googleAuth';

// Mock Chrome API
const chromeMock = {
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
        },
    },
    identity: {
        getAuthToken: vi.fn(),
        removeCachedAuthToken: vi.fn().mockImplementation((opts, cb) => cb && cb()),
    },
    runtime: {
        lastError: undefined,
    },
};

global.chrome = chromeMock as any;

describe('Bug Fix: Auth Network Resilience', () => {
    let authService: GoogleAuthService;
    const MOCK_TOKEN = 'mock-token-123';
    // 1 hour ago
    const EXPIRED_TIME = Date.now() - 3600 * 1000;

    beforeEach(() => {
        vi.clearAllMocks();
        authService = new GoogleAuthService();
        (chrome.runtime as any).lastError = undefined;
    });

    it('should NOT clear session on transient network error during silent refresh', async () => {
        // Setup: Expired token in storage
        vi.mocked(chrome.storage.local.get).mockResolvedValue({
            auth_token: MOCK_TOKEN,
            token_expiry: EXPIRED_TIME
        } as any);

        // Simulation: Transient Network Error (no token, no specific lastError meant to mimic undefined failing)
        // Or strictly mimicking lastError with a generic message NOT in the "fatal" list
        vi.mocked(chrome.identity.getAuthToken).mockImplementation(((opts: any, cb: any) => {
            if (!opts.interactive) {
                (chrome.runtime as any).lastError = { message: 'Network error or timeout' };
                cb(null);
            }
        }) as any);

        const token = await authService.getToken();

        // Expectation: Token remains NULL (refresh failed) BUT cache was NOT cleared
        expect(token).toBeNull();
        expect(chrome.storage.local.remove).not.toHaveBeenCalled();
    });

    it('should clear session on fatal auth error (Invalid Grant)', async () => {
        // Setup: Expired token in storage
        vi.mocked(chrome.storage.local.get).mockResolvedValue({
            auth_token: MOCK_TOKEN,
            token_expiry: EXPIRED_TIME
        } as any);

        // Simulation: Fatal Auth Error
        vi.mocked(chrome.identity.getAuthToken).mockImplementation(((opts: any, cb: any) => {
            if (!opts.interactive) {
                (chrome.runtime as any).lastError = { message: 'Invalid Grant' };
                cb(null);
            }
        }) as any);

        const token = await authService.getToken();

        // Expectation: Cache CLEARED
        expect(token).toBeNull();
        expect(chrome.storage.local.remove).toHaveBeenCalled();
    });
});
