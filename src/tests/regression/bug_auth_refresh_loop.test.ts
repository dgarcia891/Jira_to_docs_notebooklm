import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleAuthService } from '../../services/googleAuth';
import { DocsSyncService } from '../../services/docsSync';

// Mock chrome API
const mockChrome = {
    identity: {
        getAuthToken: vi.fn(),
        removeCachedAuthToken: vi.fn((details, callback) => callback?.()),
        launchWebAuthFlow: vi.fn(),
        getRedirectURL: vi.fn().mockReturnValue('https://extensions.google.com/id')
    },
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined)
        }
    },
    runtime: {
        lastError: undefined
    }
};
global.chrome = mockChrome as any;
global.fetch = vi.fn();

describe('Bug Fix: Auth Refresh Loop & 401 Retry', () => {
    let authService: GoogleAuthService;
    let docsService: DocsSyncService;

    beforeEach(() => {
        vi.clearAllMocks();
        authService = new GoogleAuthService();
        docsService = new DocsSyncService();
    });

    it('should clear cache and return new token on silent refresh failure', async () => {
        // Setup: Stale token in storage
        mockChrome.storage.local.get.mockResolvedValue({
            auth_token: 'stale-token',
            token_expiry: Date.now() - 1000 // Expired
        });

        // Mock Native Auth Failure
        vi.mocked(mockChrome.identity.getAuthToken).mockImplementation((opts, cb) => {
            if (cb) {
                // Return failure with a FATAL error to trigger clearing
                (mockChrome.runtime as any).lastError = { message: 'Invalid Grant' };
                cb(undefined);
            }
        });

        const token = await authService.getToken();

        expect(token).toBeNull();
        expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(['auth_token', 'token_expiry', 'userInfo']);
        expect(mockChrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
            expect.objectContaining({ token: 'stale-token' }),
            expect.any(Function)
        );
    });

    it('should retry operation if 401 is encountered', async () => {
        // Setup: Successful first fetch but returns 401
        (global.fetch as any)
            .mockImplementationOnce(() => Promise.resolve({
                status: 401,
                ok: false,
                text: () => Promise.resolve('Unauthorized')
            }));

        const response = await (docsService as any).authFetch('https://example.com', {}, 'some-token');

        expect(response.status).toBe(401);
        expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(['auth_token', 'token_expiry']);
    });
});
