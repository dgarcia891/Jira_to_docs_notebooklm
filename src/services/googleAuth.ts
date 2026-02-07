import { AuthService, UserInfo } from '../types/auth';

export const parseTokenFromUrl = (url: string): string | null => {
    try {
        // Standardize: change # to ? so URLSearchParams works for both hash and query
        const cleanUrl = url.replace('#', '?');
        const searchParams = new URL(cleanUrl).searchParams;
        return searchParams.get('access_token');
    } catch (e) {
        return null;
    }
};

export class GoogleAuthService implements AuthService {
    private scopes = [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    // Fallback Client ID (Web Application type) - Used only if native auth fails
    // Fallback Client ID (Web Application type) - MUST match manifest.json
    private clientId = '342225464153-dla0epo4rhkt8tlst7jeorqos3n1d1rf.apps.googleusercontent.com';

    private async fetchToken(interactive: boolean): Promise<{ token: string | null; error?: string }> {
        console.log(`GoogleAuth: fetchToken called (interactive: ${interactive})`);

        // 1. Try Native getAuthToken first
        const nativeToken = await Promise.race([
            new Promise<{ token: string | null; error?: string }>((resolve) => {
                if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.getAuthToken) {
                    resolve({ token: null, error: 'Identity API unavailable' });
                    return;
                }
                chrome.identity.getAuthToken({ interactive }, (token: any) => {
                    if (chrome.runtime?.lastError || !token) {
                        const errorMsg = chrome.runtime?.lastError?.message || 'No token';
                        console.warn('GoogleAuth: Native getAuthToken failed:', errorMsg);
                        resolve({ token: null, error: errorMsg });
                    } else {
                        resolve({ token, error: undefined });
                    }
                });
            }),
            new Promise<{ token: string | null; error?: string }>((resolve) =>
                setTimeout(() => resolve({ token: null, error: 'Timeout' }), 15000)
            )
        ]);

        if (nativeToken.token) {
            await chrome.storage.local.set({ auth_token: nativeToken.token, token_expiry: Date.now() + 3600 * 1000 });
            return nativeToken;
        }

        // 2. Fallback to launchWebAuthFlow if interactive AND native failed
        if (interactive) {
            console.log('GoogleAuth: Attempting Fallback launchWebAuthFlow...');
            return new Promise<{ token: string | null; error?: string }>((resolve) => {
                const redirectUri = chrome.identity.getRedirectURL();
                const authUrl = `https://accounts.google.com/o/oauth2/auth` +
                    `?client_id=${this.clientId}` +
                    `&response_type=token` +
                    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                    `&scope=${encodeURIComponent(this.scopes.join(' '))}` +
                    `&prompt=consent`;

                chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
                    if (chrome.runtime?.lastError || !responseUrl) {
                        console.error('GoogleAuth: Fallback Auth Failed:', chrome.runtime?.lastError?.message);
                        resolve({ token: null, error: chrome.runtime?.lastError?.message || 'No response URL' });
                    } else {
                        const token = parseTokenFromUrl(responseUrl);
                        if (token) {
                            chrome.storage.local.set({ auth_token: token, token_expiry: Date.now() + 3600 * 1000 });
                            resolve({ token, error: undefined });
                        } else {
                            resolve({ token: null, error: 'Failed to parse token from URL' });
                        }
                    }
                });
            });
        }

        return { token: null, error: nativeToken.error };
    }

    async login(): Promise<string> {
        const result = await this.fetchToken(true);
        if (!result.token) {
            throw new Error(`Authentication failed: ${result.error || 'No token returned'}`);
        }
        return result.token;
    }

    async getToken(): Promise<string | null> {
        // 1. Check local storage first (The "Classic" Persistence)
        const data = await chrome.storage.local.get(['auth_token', 'token_expiry']);
        const token = data.auth_token as string | undefined;
        const expiry = data.token_expiry as number | undefined;

        // Use a 5-minute (300s) buffer instead of assuming 1 hour is always safe
        if (token && expiry && expiry > (Date.now() + 300 * 1000)) {
            console.log('GoogleAuth: Using valid cached token from storage.');
            return token;
        }

        // 2. Local token missing or expired, try silent refresh via Native Auth
        console.log('GoogleAuth: Storage token missing/expired. Attempting silent fetch...');
        const result = await this.fetchToken(false);

        if (!result.token && token) {
            // Check if error is FATAL before clearing cache
            const error = (result.error || '').toLowerCase();
            const fatalErrors = ['invalid', 'unauthorized', 'revoked'];
            const isFatal = fatalErrors.some(e => error.includes(e));

            if (isFatal) {
                console.warn(`GoogleAuth: Fatal auth error (${result.error}). Clearing stale token.`);
                await this.clearCachedToken(token);
            } else {
                console.warn(`GoogleAuth: Transient auth error (${result.error}). Preserving stale token.`);
            }
        }

        return result.token;
    }

    async refreshNow(): Promise<string | null> {
        console.log('GoogleAuth: Proactive refresh triggered.');

        // BUG-AUTH-04 FIX: Force cache invalidation to prevent getting the same dying token
        try {
            // Get raw token from storage to avoid getToken()'s auto-refresh side effects
            const data = await chrome.storage.local.get('auth_token');
            const currentToken = data.auth_token as string | undefined;
            if (currentToken) {
                await this.clearCachedToken(currentToken);
            }
        } catch (e) {
            console.warn('GoogleAuth: Failed to clear cache before refresh:', e);
        }

        const result = await this.fetchToken(false);
        return result.token;
    }

    async clearCachedToken(token?: string): Promise<void> {
        console.log('GoogleAuth: Clearing cached token...');

        if (!token) {
            const data = await chrome.storage.local.get('auth_token');
            token = data.auth_token as string | undefined;
        }

        await chrome.storage.local.remove(['auth_token', 'token_expiry', 'userInfo']);

        if (token && typeof chrome !== 'undefined' && chrome.identity?.removeCachedAuthToken) {
            await new Promise<void>((resolve) => {
                chrome.identity.removeCachedAuthToken({ token }, () => resolve());
            });
        }
    }

    async getUserInfo(token: string): Promise<UserInfo> {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        return await response.json();
    }

    async logout(): Promise<void> {
        // Clear local UI state
        await chrome.storage.local.remove(['auth_token', 'token_expiry', 'userInfo']);

        // Revoke/Remove cached token from Chrome Identity
        try {
            // We need to get the current token to remove it
            const token = await this.getToken();
            if (token) {
                await new Promise<void>((resolve) => {
                    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
                });

                // Optional: Revoke usage if we really want to disconnect app permissions
                // await fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token);
            }
        } catch (e) { }

        console.log('GoogleAuth: Logged out and identity cache cleared.');
    }
}
