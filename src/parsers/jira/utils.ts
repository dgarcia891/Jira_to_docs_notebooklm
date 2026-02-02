import { WorkItemType } from '../../types';

export function scrubJiraUI(text: string, fieldName: string): string {
    if (!text) return '';
    const noise = [
        'Sort in ascending order', 'Sort in descending order',
        'Sort A to Z', 'Sort Z to A', 'More actions for', '•', fieldName,
        'Assign to me', 'Assign to', 'None',
        'Add a description…', 'Add a description'
    ];
    let cleaned = text;
    noise.forEach(n => { cleaned = cleaned.replace(new RegExp(n, 'gi'), ''); });
    cleaned = cleaned.replace(/Sort A to Z.*/gi, '');
    cleaned = cleaned.replace(/More actions for.*/gi, '');

    const words = cleaned.trim().split(/\s+/);
    const unique: string[] = [];
    for (let i = 0; i < words.length; i++) {
        if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
            unique.push(words[i]);
        }
    }
    return unique.join(' ') || 'Pending';
}

export function cleanDescription(text: string): string {
    let cleaned = cleanContent(text);
    if (/add\s+a\s+description/i.test(cleaned)) return '';
    return cleaned;
}

export function cleanAssignee(text: string): string {
    if (!text || text.toLowerCase() === 'unassigned') return 'Unassigned 👤';
    let cleaned = text.replace(/^Assignee/i, '').trim();
    const noise = ['Sort A to Z', 'More actions for Assignee', 'Sort A to ZMore actions for Assignee', '•'];
    noise.forEach(n => cleaned = cleaned.replace(n, ''));
    return scrubJiraUI(cleaned, 'Assignee').trim();
}

export function findFieldByLabel(doc: Document, label: string): string {
    const elements = Array.from(doc.querySelectorAll('div, span, label, strong'));
    const labelEl = elements.find(el => el.textContent?.trim().toLowerCase() === label.toLowerCase());

    if (labelEl) {
        const parent = labelEl.parentElement;
        const container = parent?.parentElement;
        const value = parent?.textContent?.replace(label, '').trim()
            || container?.textContent?.replace(label, '').trim();
        return value || '';
    }
    return '';
}

export function extractDescriptionHeuristic(doc: Document): string {
    const headers = Array.from(doc.querySelectorAll('h2, h3, strong, div'));
    const descHeader = headers.find(h => h.textContent?.trim() === 'Description');
    if (descHeader) {
        let current = descHeader.nextElementSibling;
        while (current) {
            const text = current.textContent?.trim();
            if (text) return text;
            current = current.nextElementSibling;
        }
    }
    return '';
}

export function extractAssigneeHeuristic(doc: Document): string {
    const containers = doc.querySelectorAll('[data-testid^="issue.views.issue-base.context.people"]');
    for (const container of containers) {
        const text = container.textContent?.trim();
        if (text && text.includes('Assignee')) {
            return text.replace('Assignee', '').trim();
        }
    }
    return '';
}

export function cleanContent(text: string): string {
    if (!text || text === '_No description provided_') return '_No description provided_';
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .replace(/([.:])([A-Z])/g, '$1\n\n$2')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function extractKeyFromUrl(url: string): string {
    const match = url.match(/browse\/([A-Z]+-\d+)/);
    return match ? match[1] : '';
}

export function mapType(raw: string): WorkItemType {
    const lower = raw.toLowerCase();
    if (lower.includes('bug')) return 'bug';
    if (lower.includes('story')) return 'story';
    if (lower.includes('epic')) return 'epic';
    if (lower.includes('task')) return 'task';
    return 'other';
}

export function cleanCommentBody(html: string, _document: Document): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tempDiv = doc.body;

    const cards = tempDiv.querySelectorAll(
        '[data-node-type="inlineCard"], ' +
        '[data-node-type="blockCard"], ' +
        '.jira-issue-card, ' +
        '.smart-link, ' +
        '[data-testid*="inline-card"], ' +
        '[data-testid*="issue.views.issue-base.content.issue-links"]'
    );

    cards.forEach(card => {
        const link = card.querySelector('a');
        let replacement = '[Linked Issue]';

        if (link) {
            const href = link.getAttribute('href') || '';
            const keyMatch = href.match(/browse\/([A-Z]+-\d+)/);

            if (keyMatch) {
                replacement = ` ${keyMatch[1]} `;
            } else {
                replacement = ` ${link.textContent?.trim() || 'Linked Issue'} `;
            }
        } else if (card.getAttribute('data-card-data')) {
            try {
                const data = JSON.parse(card.getAttribute('data-card-data') || '{}');
                if (data.url) replacement = ` [${data.url}] `;
            } catch (e) { /* ignore */ }
        }

        if (replacement.length > 50) {
            replacement = ` [Linked Link] `;
        }

        const textNode = doc.createTextNode(replacement);
        card.parentNode?.replaceChild(textNode, card);
    });

    const junk = tempDiv.querySelectorAll('style, script, svg');
    junk.forEach(el => el.remove());

    let text = tempDiv.innerText || tempDiv.textContent || '';
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n').replace(/[ \t]+/g, ' ');
    return text.trim();
}

export function scrubCommentText(text: string): string {
    if (!text) return '';
    const uiNoise = [
        'Add a comment…', 'Add a comment', 'Add a description…',
        'Add a description', 'More options', 'Suggest a reply'
    ];
    let cleaned = text;
    uiNoise.forEach(n => {
        cleaned = cleaned.replace(new RegExp(n.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '');
    });
    cleaned = cleaned.replace(/pro\s*tip:\s*press\s*m\s*to\s*comment/gi, '');
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    cleaned = cleaned.replace(/\d+\s*(hours?|minutes?|days?|weeks?)\s*ago(\(edited\))?/gi, '');
    cleaned = cleaned.replace(/(\b\w+\b)\s+\1\s+/gi, '$1 ');
    return cleaned.trim();
}
