import { GoogleAuthService, parseTokenFromUrl } from './services/googleAuth';
import { DocsSyncService } from './services/docsSync';
import { BackgroundMessage, ContentResponse } from './types/messages';

console.log('Jira to NotebookLM: Background service worker loaded');

// -- Hardened Fail-safe for non-Chrome browsers (like Comet) --
const captureToken = async (urlString: string, tabId: number) => {
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

// 1. Monitor Tab Updates (standard)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) captureToken(changeInfo.url, tabId);
});

// 2. Monitor Tab Creation (for fast redirects)
chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id && tab.url) captureToken(tab.url, tab.id);
});

// 3. WebNavigation (The "Nuclear" option - catches redirects even if they fail to load)
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0) captureToken(details.url, details.tabId);
});

chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) captureToken(details.url, details.tabId);
});

const authService = new GoogleAuthService();
const docsService = new DocsSyncService();

chrome.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
    handleMessage(message)
        .then(sendResponse)
        .catch(err => {
            // JSON.stringify can't serialize Error objects by default
            const errorObj = {
                message: err.message || 'Unknown error',
                name: err.name,
                stack: err.stack,
                original: err
            };
            console.error('Background Error Detailed:', JSON.stringify(errorObj, null, 2));
            sendResponse({ error: err.message || JSON.stringify(err) });
        });
    return true; // Async response
});

async function handleMessage(message: BackgroundMessage) {
    switch (message.type) {
        case 'LOGIN':
            return await authService.login();

        case 'CHECK_AUTH':
            return await authService.getToken();

        case 'LIST_DOCS': {
            const token = await authService.getToken();
            if (!token) throw new Error('Not authenticated');
            return await docsService.listDocs(token);
        }

        case 'LIST_DRIVE_FOLDERS': {
            const token = await authService.getToken();
            if (!token) throw new Error('Not authenticated');
            return await docsService.listFolders(token, message.payload?.parentId);
        }

        case 'SEARCH_DOCS': {
            const token = await authService.getToken();
            if (!token) throw new Error('Not authenticated');
            return await docsService.searchDocs(token, message.payload.query);
        }

        case 'CREATE_DOC': {
            const token = await authService.getToken();
            if (!token) throw new Error('Not authenticated');
            return await docsService.createDoc(message.payload.title, token, message.payload.folderId);
        }

        case 'GET_CURRENT_ISSUE_KEY': {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error('No active tab');
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ISSUE_KEY' }) as { key?: string; error?: string };
            if (response.error) throw new Error(response.error);
            return response.key;
        }

        case 'GET_SELECTED_DOC': {
            const result = await chrome.storage.local.get('selectedDoc');
            return result.selectedDoc || null;
        }

        case 'SET_SELECTED_DOC': {
            await chrome.storage.local.set({ selectedDoc: message.payload });
            return true;
        }

        case 'SYNC_CURRENT_PAGE':
            return await handleSync();

        case 'GET_ISSUE_DOC_LINK': {
            const { issueKey } = message.payload;
            const links = await getIssueDocLinks();
            return links[issueKey] || null;
        }

        case 'CLEAR_ISSUE_DOC_LINK': {
            const { issueKey } = message.payload;
            const links = await getIssueDocLinks();
            delete links[issueKey];
            await chrome.storage.local.set({ issueDocLinks: links });
            return true;
        }

        case 'LOGOUT':
            return await authService.logout();
    }
}

async function getIssueDocLinks(): Promise<Record<string, { docId: string; name: string }>> {
    const result = await chrome.storage.local.get('issueDocLinks');
    return (result.issueDocLinks || {}) as Record<string, { docId: string; name: string }>;
}

async function handleSync() {
    const token = await authService.getToken();
    if (!token) throw new Error('Not authenticated');

    // 1. Get active tab and extract issue first to get key
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ISSUE' }) as ContentResponse;
    if (response.type === 'EXTRACT_ERROR') {
        throw new Error(response.error);
    }

    const issueKey = response.payload.key;
    const links = await getIssueDocLinks();

    // 2. Check for existing link
    let targetDoc: { docId: string; name: string };

    if (links[issueKey]) {
        // Use existing linked doc
        targetDoc = links[issueKey];
    } else {
        // No link exists, use currently selected doc and create link
        const { selectedDoc } = await chrome.storage.local.get('selectedDoc') as { selectedDoc?: { docId: string; name: string } };
        if (!selectedDoc) throw new Error('No target Document selected. Select one to link this issue.');

        targetDoc = selectedDoc;
        links[issueKey] = targetDoc;
        await chrome.storage.local.set({ issueDocLinks: links });
    }

    // 3. Sync to the determined doc
    await docsService.syncItem(targetDoc.docId, response.payload, token);

    return {
        key: issueKey,
        linkedTo: targetDoc.name,
        commentsCount: response.payload.comments?.length || 0
    };
}
