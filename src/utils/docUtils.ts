import { WorkItem } from '../types';

/**
 * Ensures a document object has consistent properties.
 * Handles migration from 'docId' to 'id'.
 */
export function normalizeDoc(doc: any): { id: string; name: string } | null {
    if (!doc) return null;
    return {
        id: doc.id || doc.docId,
        name: doc.name
    };
}

/**
 * Standardizes date formatting with local timezone indicator.
 * Helps clarify time discrepancies between Jira UI and local browser time.
 */
export function formatDate(dateInput: string | number | Date | undefined): string {
    if (!dateInput) return 'N/A';
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'N/A';

        // Format: Jan 23, 2026, 10:46 AM
        const formatted = date.toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });

        // Extract timezone abbreviation (e.g., "PST")
        // Note: toLocaleString with timeZoneName: 'short' can be inconsistent across browsers,
        // so we extract it from the full string if possible or use a fallback.
        const tzMatch = date.toString().match(/\(([^)]+)\)$/);
        const tz = tzMatch ? tzMatch[1] : '';

        // If tz is long (like "Pacific Standard Time"), we might want to shorten it or just use the offset
        // But usually the match above gets the abbreviation.

        return tz ? `${formatted} (${tz})` : formatted;
    } catch (e) {
        return 'N/A';
    }
}

/**
 * Formats a WorkItem into a readable plain-text string for clipboard.
 */
export function formatWorkItemToText(item: WorkItem): string {
    const lines: string[] = [];

    lines.push(`ISSUE: ${item.key}: ${item.title}`);
    lines.push(`URL: ${item.url}`);
    lines.push(`STATUS: ${item.status}`);
    lines.push(`TYPE: ${item.type.toUpperCase()}`);

    if (item.priority) lines.push(`PRIORITY: ${item.priority}`);
    if (item.assignee) lines.push(`ASSIGNEE: ${item.assignee}`);

    const metadataItems = [];
    if (item.storyPoints) metadataItems.push(`Story Points: ${item.storyPoints}`);
    if (item.tShirtSize) metadataItems.push(`T-Shirt: ${item.tShirtSize}`);
    if (item.sprints && item.sprints.length > 0) metadataItems.push(`Sprints: ${item.sprints.join(', ')}`);

    if (metadataItems.length > 0) {
        lines.push(`METADATA: ${metadataItems.join(' | ')}`);
    }

    lines.push('\n--- DESCRIPTION ---');
    lines.push(item.description || 'No description provided.');

    if (item.comments && item.comments.length > 0) {
        lines.push('\n--- COMMENTS ---');
        item.comments.forEach((c, i) => {
            lines.push(`[${i + 1}] ${c.author}: ${c.body}`);
        });
    }

    if (item.linkedIssues && item.linkedIssues.length > 0) {
        lines.push('\n--- LINKED CONTEXT ---');
        item.linkedIssues.forEach(li => {
            lines.push(`- ${li.key} (${li.status}): ${li.title}`);
            if (li.rationale) lines.push(`  Rationale: ${li.rationale}`);
        });
    }

    return lines.join('\n');
}
