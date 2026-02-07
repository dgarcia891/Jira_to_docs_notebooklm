import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleAuthService } from '../../services/googleAuth';

describe('Bug Reproduction: Auth Persistence (BUG-AUTH-03)', () => {
    let authService: GoogleAuthService;
    const MOCK_TOKEN = 'stale-token';

    beforeEach(() => {
        vi.resetAllMocks();
        authService = new GoogleAuthService();

        // Setup global chrome mock
        global.chrome = {
            identity: {
                getAuthToken: vi.fn(),
                removeCachedAuthToken: vi.fn((_, cb) => cb?.())
            },
            storage: {
                local: {
                    get: vi.fn(),
                    set: vi.fn(),
                    remove: vi.fn().mockResolvedValue(true)
                }
            },
            runtime: {
                lastError: undefined
            }
        } as any;
    });

    it('reproduces: clearing session on non-fatal "not signed in" error', async () => {
        const expiredTime = Date.now() - 1000;

        // 1. Setup expired token in storage
        vi.mocked(chrome.storage.local.get).mockResolvedValue({
            auth_token: MOCK_TOKEN,
            token_expiry: expiredTime
        } as any);

        // 2. Setup silent refresh failure with "The user is not signed in."
        vi.mocked(chrome.identity.getAuthToken).mockImplementation(((opts: any, cb: any) => {
            if (!opts.interactive) {
                (chrome as any).runtime.lastError = { message: 'The user is not signed in.' };
                cb(null);
            }
        }) as any);

        // 3. Call getToken(false)
        const token = await authService.getToken();

        // 4. Verify the desired behavior: storage is NOT cleared for a non-fatal error
        expect(token).toBeNull();
        expect(chrome.storage.local.remove).not.toHaveBeenCalledWith(['auth_token', 'token_expiry', 'userInfo']);
    });
});
