import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleAuthService } from '../../services/googleAuth';

// Mock chrome API
const mockChrome = {
    identity: {
        getAuthToken: vi.fn(),
        launchWebAuthFlow: vi.fn((details, callback) => callback?.(null)),
        getRedirectURL: vi.fn().mockReturnValue('https://extensions.google.com/id')
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined)
        }
    },
    runtime: {
        lastError: undefined
    }
};
global.chrome = mockChrome as any;

describe('Bug Fix: Auth Persistence', () => {
    let authService: GoogleAuthService;

    beforeEach(() => {
        vi.clearAllMocks();
        authService = new GoogleAuthService();
    });

    it('should use chrome.identity.getAuthToken for login instead of launchWebAuthFlow', async () => {
        // Setup success response for getAuthToken
        mockChrome.identity.getAuthToken.mockImplementation((details, callback) => {
            // Simulate the standard callback or Promise behavior (if using a wrapper, but here we expect the service to wrap it)
            // The service implementation we are about to write will likely promisify this.
            // If the service assumes callback:
            if (callback) callback('mock-native-token');
            // If we promisify it in test setup (normally chrome APIs use callbacks manifest v2/v3 style can vary, but types usually suggest callbacks)
            // However, `chrome.identity.getAuthToken` accepts a callback.
            return;
        });

        // We'll also mock the wrapper if the service treats it as a promise, 
        // but since we are testing the service logic, we should probably mock the global chrome object correctly.

        // Since `chrome.identity.getAuthToken` expects a callback as the second argument:
        mockChrome.identity.getAuthToken.mockImplementation(({ interactive }, callback) => {
            callback('mock-native-token');
        });

        const token = await authService.login();

        expect(mockChrome.identity.getAuthToken).toHaveBeenCalledWith(
            expect.objectContaining({ interactive: true }),
            expect.any(Function)
        );
        expect(token).toBe('mock-native-token');

        // Verify we DID NOT use the legacy web flow
        expect(mockChrome.identity.launchWebAuthFlow).not.toHaveBeenCalled();
    });

    it('should fallback or handle errors if getAuthToken fails', async () => {
        mockChrome.identity.getAuthToken.mockImplementation(({ interactive }, callback) => {
            // Simulate error by passing undefined token and setting runtime.lastError? 
            // Or just passing undefined.
            callback(undefined);
        });

        await expect(authService.login()).rejects.toThrow('Authentication failed');
    });
});
