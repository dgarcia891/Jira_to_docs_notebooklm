import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleAuthService } from '../../services/googleAuth';

describe('Bug Reproduction: Auth Cache Invalidation (BUG-AUTH-04)', () => {
    let authService: GoogleAuthService;
    const LOCAL_TOKEN = 'token-123';

    beforeEach(() => {
        vi.resetAllMocks();
        authService = new GoogleAuthService();

        // Setup global chrome mock
        global.chrome = {
            identity: {
                getAuthToken: vi.fn(),
                removeCachedAuthToken: vi.fn((_, cb) => cb?.()),
                getRedirectURL: vi.fn()
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

    it('should explicitly remove cached token before refreshing', async () => {
        // 1. Setup existing token in storage
        vi.mocked(chrome.storage.local.get).mockResolvedValue({
            auth_token: LOCAL_TOKEN,
            token_expiry: Date.now() - 1000 // Expired
        } as any);

        // 2. Mock getAuthToken to return a token
        vi.mocked(chrome.identity.getAuthToken).mockImplementation(((opts: any, cb: any) => {
            cb('new-token-456');
        }) as any);

        // 3. Call refreshNow
        await authService.refreshNow();

        // 4. Verify that removeCachedAuthToken was called
        // Currently, refreshNow just calls fetchToken(false) -> getAuthToken
        // It does NOT call removeCachedAuthToken first.
        // So this expectation will FAIL, reproducing the bug.
        expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
            expect.objectContaining({ token: LOCAL_TOKEN }),
            expect.any(Function)
        );
    });
});
