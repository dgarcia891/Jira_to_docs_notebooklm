import { GoogleAuthService, parseTokenFromUrl } from './services/googleAuth';
import { DocsSyncService } from './services/docsSync';
import { JiraParser } from './parsers/jira';
import { BackgroundMessage, ContentResponse } from './types/messages';
import { normalizeDoc } from './utils/docUtils';

const jiraParser = new JiraParser();

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
            console.log('Background: Triggering LOGIN flow...');
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
            if (!tab?.id) throw new Error('No active tab found.');
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ISSUE_KEY' }) as { key?: string; error?: string };
                if (response.error) throw new Error(response.error);
                return response;
            } catch (e: any) {
                console.warn('Background: GET_CURRENT_ISSUE_KEY failed', e);
                const isConnectionError = e.message?.includes('Could not establish connection') || e.message?.includes('context invalidated');
                if (isConnectionError) {
                    throw new Error('Extension updated. Please refresh your Jira page to continue.');
                }
                throw new Error('Please open the extension on a Jira issue page.');
            }
        }

        case 'GET_SELECTED_DOC': {
            const result = await chrome.storage.local.get('selectedDoc');
            return normalizeDoc(result.selectedDoc);
        }

        case 'SET_SELECTED_DOC': {
            await chrome.storage.local.set({ selectedDoc: message.payload });
            return true;
        }

        case 'SYNC_CURRENT_PAGE':
            return await handleSync();

        case 'SYNC_EPIC':
            return await handleEpicSync(message.payload.epicKey);

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

        case 'GET_LAST_SYNC': {
            const { issueKey } = message.payload;
            const data = await chrome.storage.local.get('issueSyncTimes');
            const syncTimes = (data.issueSyncTimes || {}) as Record<string, any>;
            return syncTimes[issueKey] || null;
        }
        case 'LOGOUT':
            return await authService.logout();
    }
}

async function getIssueDocLinks(): Promise<Record<string, { id: string; name: string }>> {
    const result = await chrome.storage.local.get('issueDocLinks');
    const links = (result.issueDocLinks || {}) as Record<string, any>;

    // Normalize all links on retrieval
    const normalized: Record<string, { id: string; name: string }> = {};
    for (const key in links) {
        const doc = normalizeDoc(links[key]);
        if (doc) normalized[key] = doc;
    }
    return normalized;
}

async function handleSync() {
    try {
        const token = await authService.getToken();
        if (!token) throw new Error('Not authenticated');

        // 1. Get active tab and extract issue
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error('No active tab');

        const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ISSUE' }) as ContentResponse;
        if (response.type === 'EXTRACT_ERROR') {
            throw new Error(response.error);
        }

        if (response.type !== 'EXTRACT_SUCCESS') {
            throw new Error('Unexpected response type from content script');
        }

        const issueKey = response.payload.key;
        const links = await getIssueDocLinks();
        let targetDoc: { id: string; name: string };

        if (links[issueKey]) {
            targetDoc = links[issueKey];
        } else {
            const { selectedDoc } = await chrome.storage.local.get('selectedDoc') as { selectedDoc?: { id: string; name: string } };
            if (!selectedDoc) throw new Error('No target Document selected. Select one to link this issue.');
            targetDoc = selectedDoc;
            links[issueKey] = targetDoc;
            await chrome.storage.local.set({ issueDocLinks: links });
        }

        // 3. Sync
        await docsService.syncItem(targetDoc.id, response.payload, token);
        console.log(`Background: Sync successful for ${issueKey} to ${targetDoc.name}`);

        // Persist Last Sync Result
        const data = await chrome.storage.local.get('issueSyncTimes');
        const issueSyncTimes = (data.issueSyncTimes || {}) as Record<string, { status: string; time: number; message?: string }>;
        issueSyncTimes[issueKey] = {
            status: 'success',
            time: Date.now(),
            message: `Synced to ${targetDoc.name}`
        };
        await chrome.storage.local.set({ issueSyncTimes, lastSyncType: 'single' });

        return { success: true, key: issueKey, id: targetDoc.id };

    } catch (err: any) {
        console.error('Background Sync Error:', err);
        throw err;
    }
}

async function handleEpicSync(epicKey: string) {
    try {
        const token = await authService.getToken();
        if (!token) throw new Error('Google Docs not authenticated. Please disconnect and reconnect.');

        // 1. Determine destination doc
        const links = await getIssueDocLinks();
        let targetDoc = links[epicKey];

        if (!targetDoc) {
            const result = await chrome.storage.local.get('selectedDoc');
            const selectedDoc = result.selectedDoc as { id: string; name: string } | undefined;
            if (!selectedDoc) throw new Error('No target Document selected. Link the Epic first.');
            targetDoc = selectedDoc;
            links[epicKey] = targetDoc;
            await chrome.storage.local.set({ issueDocLinks: links });
        }

        // 2. Ask content script to fetch all Epic data
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error('No active tab');

        const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'FETCH_EPIC_BULK',
            payload: { epicKey }
        }) as ContentResponse;

        if (response.type === 'EXTRACT_ERROR') throw new Error(response.error);
        if (response.type !== 'EPIC_BULK_SUCCESS') throw new Error('Expected EPIC_BULK_SUCCESS');

        const issues = response.payload.items;
        console.log(`Background: Found ${issues.length} issues in Epic ${epicKey}`);

        // 3. Sync all issues in one bulk operation (Wipe & Replace)
        await docsService.syncItems(targetDoc.id, issues, token);

        // 4. Update links for all children
        for (const issue of issues) {
            if (!links[issue.key]) {
                links[issue.key] = targetDoc;
            }
        }
        await chrome.storage.local.set({ issueDocLinks: links });

        // Persist Last Sync Result
        const data = await chrome.storage.local.get('issueSyncTimes');
        const issueSyncTimes = (data.issueSyncTimes || {}) as Record<string, { status: string; time: number; message?: string }>;
        issueSyncTimes[epicKey] = {
            status: 'success',
            time: Date.now(),
            message: `Bulk synced ${issues.length} issues to ${targetDoc.name}`
        };
        await chrome.storage.local.set({ issueSyncTimes, lastSyncType: 'bulk' });

        return { success: true, count: issues.length, key: epicKey, id: targetDoc.id };

    } catch (err: any) {
        console.error('Background Epic Sync Error:', err);
        throw err;
    }
}
