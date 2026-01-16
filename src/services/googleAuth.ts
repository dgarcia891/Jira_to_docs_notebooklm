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
    private clientId = '342225464153-i3qd0aru6fsna13sg2i0qmvtofnktgmb.apps.googleusercontent.com'; // v1.4.2 Web App Client
    private get redirectUri() {
        // We will strictly use the one WITHOUT a trailing slash for the request, 
        // as Web Apps in GCP are very sensitive to it.
        return chrome.identity.getRedirectURL().replace(/\/$/, '');
    }
    private scopes = [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ');

    private async fetchToken(interactive: boolean): Promise<string | null> {
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('response_type', 'token');
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('scope', this.scopes);

        if (interactive) {
            // Force account selection and consent screen for a clean switch
            authUrl.searchParams.set('prompt', 'select_account consent');
        }

        console.log('OAuth Request URL:', authUrl.href);
        console.log('Redirect URI being sent:', this.redirectUri);

        try {
            const responseUrl = await chrome.identity.launchWebAuthFlow({
                url: authUrl.href,
                interactive: interactive
            });

            if (!responseUrl) return null;

            const token = parseTokenFromUrl(responseUrl);

            if (token) {
                // Cache token locally for future "silent" calls
                await chrome.storage.local.set({ auth_token: token, token_expiry: Date.now() + 3500 * 1000 });
                return token;
            }
            return null;
        } catch (err) {
            if (interactive) throw err;
            return null;
        }
    }

    async login(): Promise<string> {
        const token = await this.fetchToken(true);
        if (!token) throw new Error('Authentication failed - No token returned');
        return token;
    }

    async getToken(): Promise<string | null> {
        // Check cache first
        const { auth_token, token_expiry } = await chrome.storage.local.get(['auth_token', 'token_expiry']) as { auth_token?: string, token_expiry?: number };
        if (auth_token && token_expiry && Date.now() < token_expiry) {
            return auth_token;
        }

        // Try silent refresh
        return await this.fetchToken(false);
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
        // Clear everything
        await chrome.storage.local.remove(['auth_token', 'token_expiry', 'userInfo']);

        // Force Chrome/Comet to forget the cached token so it doesn't auto-login
        try {
            const { auth_token } = await chrome.storage.local.get('auth_token') as { auth_token?: string };
            if (auth_token) {
                chrome.identity.removeCachedAuthToken({ token: auth_token }, () => { });
            }
        } catch (e) { }

        console.log('GoogleAuth: Logged out and identity cache cleared.');
    }
}
