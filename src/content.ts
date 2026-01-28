import { JiraParser } from './parsers/jira';
import { ContentMessage, ContentResponse } from './types/messages';
import { WorkItem } from './types';

console.log('Jira to NotebookLM: Content script loaded');

const parser = new JiraParser();

// Development Aid: Auto-reload page when extension reloads/invalidates
// This prevents "Extension context invalidated" errors in the HMR client
if (import.meta.env.MODE === 'development') {
    setInterval(() => {
        try {
            if (!chrome.runtime?.id) {
                console.log('[Dev] Extension context invalidated. Reloading page...');
                window.location.reload();
            }
        } catch (e) {
            // Accessing chrome.runtime might throw if fully invalidated
            console.log('[Dev] Extension context lost. Reloading page...');
            window.location.reload();
        }
    }, 1000);
}

chrome.runtime.onMessage.addListener((message: ContentMessage | { type: 'GET_ISSUE_KEY' }, sender, sendResponse) => {
    if (message.type === 'EXTRACT_ISSUE') {
        handleExtraction().then(sendResponse);
        return true;
    }
    if (message.type === 'GET_ISSUE_KEY') {
        handleGetIssueKey().then(sendResponse);
        return true;
    }
    if (message.type === 'FETCH_EPIC_BULK') {
        handleEpicBulkFetch(message.payload.epicKey).then(sendResponse);
        return true;
    }
});

async function handleGetIssueKey(): Promise<{ key?: string; title?: string; type?: string; childKeys?: string[]; error?: string }> {
    try {
        const url = window.location.href;
        if (!parser.canParse(url)) {
            return { error: 'Not a supported Jira Issue URL' };
        }

        // New key extraction logic from URL
        const match = url.match(/browse\/([A-Z]+-\d+)/);
        const key = match ? match[1] : undefined;

        // New title extraction logic
        const summary = document.querySelector('h1')?.innerText || document.title;

        // Try to find issue type - multiple strategies
        let type = '';

        // Strategy 1: Atlassian data-testid for issue type field
        const issueTypeElement = document.querySelector('[data-testid="issue.views.field.issue-type.common.ui.issue-type-field-view"] [data-testid*="issue-type-icon"]');
        if (issueTypeElement) {
            type = issueTypeElement.textContent?.trim() || '';
        }

        // Strategy 2: Look for img with alt containing "Epic"
        if (!type) {
            const epicImg = document.querySelector('img[alt*="Epic"]') as HTMLImageElement;
            if (epicImg) {
                type = 'Epic';
            }
        }

        // Strategy 3: Look for aria-label containing "Epic"
        if (!type) {
            const ariaEpic = document.querySelector('[aria-label*="Epic"]');
            if (ariaEpic) {
                type = 'Epic';
            }
        }

        // Strategy 4: Check the detail panel header for type text
        if (!type) {
            const typeSpans = document.querySelectorAll('[data-testid*="issue-type"]');
            for (const span of typeSpans) {
                const text = span.textContent?.trim() || '';
                if (text.toLowerCase().includes('epic')) {
                    type = 'Epic';
                    break;
                }
            }
        }

        // Strategy 5: Fallback to older UI
        if (!type) {
            const typeButton = document.querySelector('[data-testid="issue-field-summary.ui.issue-field-summary-inline-edit--trigger"]');
            if (typeButton) {
                const typeTextSpan = typeButton.querySelector('span[data-testid*="issue-type-icon"]');
                if (typeTextSpan) {
                    type = typeTextSpan.textContent?.trim() || '';
                } else {
                    type = typeButton.textContent?.trim() || '';
                }
            }
        }

        // New Feature: Fetch child keys for Epics to enable dynamic doc naming
        let childKeys: string[] = [];
        if (type.toLowerCase().includes('epic') && key) {
            try {
                console.log(`Content: Epic detected (${key}), fetching child keys for dynamic naming...`);
                childKeys = await parser.fetchEpicChildren(key);
            } catch (e) {
                console.warn('Content: Failed to fetch child keys for naming fallback', e);
            }
        }

        return { key, title: summary, type, childKeys };
    } catch (err: any) {
        return { error: err.message };
    }
}

async function handleExtraction(): Promise<ContentResponse> {
    try {
        const url = window.location.href;
        if (!parser.canParse(url)) {
            return { type: 'EXTRACT_ERROR', error: 'Not a supported Jira Issue URL' };
        }

        // Direct Parse (Rolling back "expandComments" which was causing hangs)
        const workItem = await parser.parse(document, url);
        return { type: 'EXTRACT_SUCCESS', payload: workItem };
    } catch (err: any) {
        console.error('Extraction Error:', err);
        return { type: 'EXTRACT_ERROR', error: err.message || 'Unknown parsing error' };
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleEpicBulkFetch(epicKey: string): Promise<ContentResponse> {
    try {
        console.log(`Content: Starting Epic bulk fetch for ${epicKey}`);

        // 1. Discover children using session cookies (no auth needed!)
        const childKeys = await parser.fetchEpicChildren(epicKey);
        const allKeys = [epicKey, ...childKeys];

        console.log(`Content: Found ${childKeys.length} children for Epic ${epicKey}`);

        // 2. Fetch each issue's data
        const items: WorkItem[] = [];
        for (let i = 0; i < allKeys.length; i++) {
            const key = allKeys[i];

            // Send progress update to background (which forwards to UI)
            chrome.runtime.sendMessage({
                type: 'EPIC_BULK_PROGRESS',
                payload: { current: i + 1, total: allKeys.length * 2, key }
            }).catch(() => { }); // Ignore if popup is closed

            console.log(`Content: Fetching ${key} (${i + 1}/${allKeys.length})`);
            const item = await parser.parseByKey(key);
            items.push(item);

            // Small delay to avoid overwhelming the browser
            await sleep(100);
        }

        console.log(`Content: Successfully fetched ${items.length} items`);
        return { type: 'EPIC_BULK_SUCCESS', success: true, payload: { epicKey, items } };
    } catch (err: any) {
        console.error('Content: Epic bulk fetch failed', err);
        return { type: 'EPIC_BULK_ERROR', success: false, error: err.message || 'Failed to fetch Epic data' };
    }
}
