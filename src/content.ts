import { JiraParser } from './parsers/jira';
import { ContentMessage, ContentResponse } from './types/messages';

console.log('Jira to NotebookLM: Content script loaded');

const parser = new JiraParser();

chrome.runtime.onMessage.addListener((message: ContentMessage | { type: 'GET_ISSUE_KEY' }, sender, sendResponse) => {
    if (message.type === 'EXTRACT_ISSUE') {
        handleExtraction().then(sendResponse);
        return true;
    }
    if (message.type === 'GET_ISSUE_KEY') {
        handleGetIssueKey().then(sendResponse);
        return true;
    }
});

async function handleGetIssueKey(): Promise<{ key?: string; title?: string; error?: string }> {
    try {
        const url = window.location.href;
        if (!parser.canParse(url)) {
            return { error: 'Not a supported Jira Issue URL' };
        }
        // Quick key extraction without full parse
        const keyEl = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"] a');
        const key = keyEl?.textContent?.trim() || parser['extractKeyFromUrl'](url);
        const titleEl = document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]') || document.querySelector('h1');
        const title = titleEl?.textContent?.trim() || key;
        return { key, title };
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

        // Step 1: Expand comments before parsing
        await expandComments();

        // Step 2: Parse after a brief delay to let DOM update
        await sleep(300);

        const workItem = await parser.parse(document, url);
        return { type: 'EXTRACT_SUCCESS', payload: workItem };
    } catch (err: any) {
        console.error('Extraction Error:', err);
        return { type: 'EXTRACT_ERROR', error: err.message || 'Unknown parsing error' };
    }
}

/**
 * Finds and clicks all "expand" or "show more" buttons in the activity/comments section.
 */
async function expandComments(): Promise<void> {
    // Common selectors for expand buttons in Jira
    const expandSelectors = [
        '[data-testid="issue.activity.common.show-older-button"]',
        '[data-testid="issue-activity-feed.ui.buttons.show-more-button"]',
        'button[aria-label*="Show"]',
        'button[aria-label*="more"]',
        'button[aria-label*="older"]',
        '.show-more-comments',
        '[data-testid*="show-more"]',
        '[data-testid*="expand"]'
    ];

    let clicked = false;
    for (const selector of expandSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
            if (btn instanceof HTMLElement) {
                console.log('Clicking expand button:', selector);
                btn.click();
                clicked = true;
            }
        }
    }

    // If we clicked something, wait for DOM to update
    if (clicked) {
        await sleep(2000); // 2 second pause for slow rendering
        // Try again in case there were nested collapsers
        await expandComments();
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
