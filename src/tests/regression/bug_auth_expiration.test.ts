import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleAuthService } from '../../services/googleAuth';

describe('Bug Reproduction: Auth Expiration (BUG-AUTH-01)', () => {
    let authService: GoogleAuthService;
    const MOCK_TOKEN_1 = 'old-token';
    const MOCK_TOKEN_2 = 'new-token-refreshed';

    beforeEach(() => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        authService = new GoogleAuthService();

        // Extend chrome mock with identity
        (global.chrome as any).identity = {
            getAuthToken: vi.fn(),
            removeCachedAuthToken: vi.fn((_, cb) => cb?.()),
            getRedirectURL: vi.fn(() => 'https://mock-redirect.com'),
            launchWebAuthFlow: vi.fn()
        };
    });

    it('should force a silent refresh when the token is within the 5-minute expiry buffer', async () => {
        const now = Date.now();
        const fourMinutesFromNow = now + 4 * 60 * 1000;

        // 1. Setup stale token in storage
        vi.mocked(chrome.storage.local.get).mockResolvedValue({
            auth_token: MOCK_TOKEN_1,
            token_expiry: fourMinutesFromNow
        } as any);

        // 2. Setup silent refresh success
        vi.mocked(chrome.identity.getAuthToken).mockImplementation(((opts: any, cb: any) => {
            if (!opts.interactive) {
                cb(MOCK_TOKEN_2);
            }
        }) as any);

        const token = await authService.getToken();

        // 3. Verify silent refresh was attempted despite having an "active" token
        expect(chrome.identity.getAuthToken).toHaveBeenCalledWith({ interactive: false }, expect.any(Function));
        expect(token).toBe(MOCK_TOKEN_2);
    });

    it('should fail and return null if silent refresh fails after token expiry', async () => {
        const now = Date.now();
        const expiredTime = now - 1000;

        // 1. Setup expired token
        vi.mocked(chrome.storage.local.get).mockResolvedValue({
            auth_token: MOCK_TOKEN_1,
            token_expiry: expiredTime
        } as any);

        // 2. Setup silent refresh failure (e.g. user session expired)
        vi.mocked(chrome.identity.getAuthToken).mockImplementation(((opts: any, cb: any) => {
            if (!opts.interactive) {
                // Simulating chrome.runtime.lastError or no token returned
                (chrome as any).runtime.lastError = { message: 'OAuth2 not granted or revoked' };
                cb(null);
            }
        }) as any);

        const token = await authService.getToken();

        // 3. Verify it returns null, which triggers the "Login" UI in the popup
        expect(token).toBeNull();
        expect(chrome.storage.local.remove).toHaveBeenCalledWith(['auth_token', 'token_expiry', 'userInfo']);
    });
});
