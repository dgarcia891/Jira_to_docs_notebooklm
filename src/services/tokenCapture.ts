/**
 * Token Capture Service
 * Intercepts and extracts OAuth tokens from redirect URLs.
 * Hardened fail-safe for non-Chrome browsers.
 */
export const captureToken = async (urlString: string, tabId: number) => {
    // We look for the redirect domain and the presence of an access_token
    if (urlString.includes('.chromiumapp.org/') && urlString.includes('access_token=')) {
        console.log('Background: Intercepted Token URL:', urlString);

        try {
            // URLSearchParams doesn't like #, so we treat the whole thing as a query string
            const cleanUrl = urlString.replace('#', '?');
            const url = new URL(cleanUrl);
            const token = url.searchParams.get('access_token');
            const expires_in = url.searchParams.get('expires_in');

            if (token) {
                const token_expiry = Date.now() + (parseInt(expires_in || '3599') * 1000);
                await chrome.storage.local.set({ auth_token: token, token_expiry });

                console.log('Background: Auth successful. Notifying popup and closing tab.');
                chrome.runtime.sendMessage({ type: 'AUTH_SUCCESS' }).catch(() => { });

                // Wait a tiny bit to ensure storage is committed before closing
                setTimeout(() => {
                    chrome.tabs.remove(tabId).catch(() => { });
                }, 100);
            }
        } catch (e) {
            console.error('Background: Token extraction error:', e);
        }
    }
};
