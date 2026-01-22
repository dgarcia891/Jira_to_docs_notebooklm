import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome global
const chromeMock = {
    identity: {
        getAuthToken: vi.fn(),
        removeCachedAuthToken: vi.fn(),
        launchWebAuthFlow: vi.fn((opts, cb) => cb(undefined)),
        getRedirectURL: vi.fn().mockReturnValue('https://mock.redirect.url'),
    },
    runtime: {
        lastError: undefined,
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined),
        },
    },
};

vi.stubGlobal('chrome', chromeMock);

import { GoogleAuthService } from './googleAuth';

describe('GoogleAuthService', () => {
    let authService: GoogleAuthService;

    beforeEach(() => {
        authService = new GoogleAuthService();
        vi.clearAllMocks();
        chromeMock.runtime.lastError = undefined;
    });

    describe('login', () => {
        it('should return token on success', async () => {
            const mockToken = 'mock-access-token';
            chromeMock.identity.getAuthToken.mockImplementation((opts, callback) => {
                callback(mockToken);
            });

            const token = await authService.login();
            expect(token).toBe(mockToken);
            expect(chromeMock.identity.getAuthToken).toHaveBeenCalledWith(
                { interactive: true },
                expect.any(Function)
            );
        });

        it('should reject if runtime.lastError exists', async () => {
            chromeMock.runtime.lastError = new Error('Auth failed') as any;
            chromeMock.identity.getAuthToken.mockImplementation((opts, callback) => {
                callback(undefined);
            });

            await expect(authService.login()).rejects.toThrow('Auth failed');
        });
    });

    describe('getToken', () => {
        it('should return token without interaction if cached', async () => {
            const mockToken = 'cached-token';
            chromeMock.identity.getAuthToken.mockImplementation((opts, callback) => {
                callback(mockToken);
            });

            const token = await authService.getToken();
            expect(token).toBe(mockToken);
            expect(chromeMock.identity.getAuthToken).toHaveBeenCalledWith(
                { interactive: false },
                expect.any(Function)
            );
        });

        it('should return null if no token found', async () => {
            chromeMock.identity.getAuthToken.mockImplementation((opts, callback) => {
                callback(undefined);
            });

            const token = await authService.getToken();
            expect(token).toBeNull();
        });
    });

    describe('logout', () => {
        it('should remove cached token', async () => {
            const mockToken = 'cached-token';
            // Mock getToken to return a token first
            chromeMock.identity.getAuthToken.mockImplementation((opts, callback) => {
                callback(mockToken);
            });

            chromeMock.identity.removeCachedAuthToken.mockImplementation((opts, callback) => {
                callback();
            });

            await authService.logout();
            expect(chromeMock.identity.removeCachedAuthToken).toHaveBeenCalledWith(
                { token: mockToken },
                expect.any(Function)
            );
        });
    });
});
