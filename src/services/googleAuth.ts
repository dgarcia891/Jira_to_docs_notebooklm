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
    private clientId = '342225464153-i3qd0aru6fsna13sg2i0qmvtofnktgmb.apps.googleusercontent.com';

    private async fetchToken(interactive: boolean): Promise<string | null> {
        console.log(`GoogleAuth: fetchToken called (interactive: ${interactive})`);

        // 1. Try Native getAuthToken first
        const nativeToken = await Promise.race([
            new Promise<string | null>((resolve) => {
                if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.getAuthToken) {
                    resolve(null);
                    return;
                }
                chrome.identity.getAuthToken({ interactive }, (token: any) => {
                    if (chrome.runtime?.lastError || !token) {
                        console.warn('GoogleAuth: Native getAuthToken failed/returned nothing:', chrome.runtime?.lastError?.message || 'No token');
                        resolve(null);
                    } else {
                        resolve(token);
                    }
                });
            }),
            new Promise<string | null>((_, reject) =>
                setTimeout(() => reject(new Error('Auth timed out after 15s')), 15000)
            )
        ]);

        if (nativeToken) {
            await chrome.storage.local.set({ auth_token: nativeToken, token_expiry: Date.now() + 3000 * 1000 });
            return nativeToken;
        }

        // 2. Fallback to launchWebAuthFlow if interactive AND native failed
        if (interactive) {
            console.log('GoogleAuth: Attempting Fallback launchWebAuthFlow...');
            return new Promise((resolve) => {
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
                        resolve(null);
                    } else {
                        const token = parseTokenFromUrl(responseUrl);
                        if (token) {
                            chrome.storage.local.set({ auth_token: token, token_expiry: Date.now() + 3000 * 1000 });
                        }
                        resolve(token);
                    }
                });
            });
        }

        return null;
    }

    async login(): Promise<string> {
        const token = await this.fetchToken(true);
        if (!token) {
            const lastError = (chrome.runtime as any)?.lastError?.message;
            throw new Error(`Authentication failed: ${lastError || 'No token returned'}`);
        }
        return token;
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
        const newToken = await this.fetchToken(false);

        if (!newToken && token) {
            // If silent refresh failed but we had an old token, clear it to prevent 401 loops
            console.warn('GoogleAuth: Silent refresh failed. Clearing stale token.');
            await this.clearCachedToken(token);
        }

        return newToken;
    }

    async clearCachedToken(token?: string): Promise<void> {
        console.log('GoogleAuth: Clearing cached token...');
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
