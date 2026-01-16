import { WorkItem, WorkItemParser, WorkItemType } from '../types';

export class JiraParser implements WorkItemParser {
    canParse(url: string): boolean {
        const jiraUrlPattern = /atlassian\.net\/(browse\/|jira\/software\/.*selectedIssue=)/;
        return jiraUrlPattern.test(url);
    }

    async parse(document: Document, url: string): Promise<WorkItem> {
        let key = this.extractKeyFromUrl(url);
        if (!key) {
            const keyEl = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"] a');
            key = keyEl?.textContent?.trim() || '';
        }

        if (!key) throw new Error('Could not extract Issue Key');

        // v4.0: Fetch FULL Issue data from API
        console.log(`JiraParser: Fetching issue ${key} data via API...`);

        // 1. Discover Field IDs (v4.0) - Cache these in memory for the session if needed
        // For simplicity, we fetch them once per parse if they aren't known.
        let fieldMap: Record<string, string> = {};
        try {
            const fieldRes = await fetch('/rest/api/3/field');
            if (fieldRes.ok) {
                const fieldsArr = await fieldRes.json();
                fieldsArr.forEach((fld: any) => {
                    fieldMap[fld.name.toLowerCase()] = fld.id;
                });
            }
        } catch (e) {
            console.warn('JiraParser: Field discovery failed, falling back to heuristics', e);
        }

        const response = await fetch(`/rest/api/3/issue/${key}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`JiraParser: API Error ${response.status} fetching issue ${key}`);
        }

        const issue = await response.json();
        const f = issue.fields || {};

        // 1. Core Fields
        const title = f.summary || '';
        const descriptionRaw = f.description ? this.parseADF(f.description) : '';
        const status = f.status?.name || 'Pending';
        const assigneeRaw = f.assignee?.displayName || 'Unassigned';
        const reporter = f.reporter?.displayName || 'Unknown';
        const priority = f.priority?.name || 'Medium';
        const typeRaw = f.issuetype?.name || 'other';
        const labels = f.labels || [];
        const createdDate = f.created;
        const updatedDate = f.updated;

        // 2. Custom Fields (Lookups)
        const getCustom = (searchNames: string[]) => {
            // Priority 1: Exact/Fuzzy match based on the ORDER of searchNames
            for (const sn of searchNames) {
                const lowerSN = sn.toLowerCase();
                for (const fieldName of Object.keys(fieldMap)) {
                    if (fieldName.toLowerCase().includes(lowerSN) || lowerSN.includes(fieldName.toLowerCase())) {
                        const id = fieldMap[fieldName];
                        const val = f[id];
                        if (val !== undefined && val !== null && val !== '') {
                            // Extract readable string from value
                            const str = typeof val === 'object'
                                ? (val.value || val.name || val.label || val.displayName || '')
                                : String(val).trim();

                            if (str && !['none', 'null', 'n/a'].includes(str.toLowerCase())) {
                                return str;
                            }
                        }
                    }
                }
            }
            return '';
        };

        let tShirtSize = getCustom(['T-shirt Size', 'T-shirt sizing', 'Tshirt', 'Sizing', 'Size', 'ET - Size']);

        // Fallback 1: Scan all fields for T-shirt values (XS, S, M, L, XL, XXL)
        if (!tShirtSize || tShirtSize === 'N/A') {
            const sizeValues = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
            for (const k of Object.keys(f)) {
                if (!k.startsWith('customfield_')) continue;
                const val = f[k];
                if (!val) continue;
                const strVal = (typeof val === 'object' ? (val.value || val.name || '') : String(val)).trim().toUpperCase();
                if (sizeValues.includes(strVal)) {
                    tShirtSize = strVal;
                    break;
                }
            }
        }

        const workType = getCustom(['Work Type', 'Issue Type Detail', 'Work Item Type']);
        const businessTeam = getCustom(['Requesting Business Team', 'Business Team', 'Requesting Team', 'Team']);
        const businessObjective = getCustom(['Business Objective', 'Objective', 'Goal', 'Business Value']);
        const impact = getCustom(['ET - Impact', 'Business Impact', 'Impact', 'Severity Impact', 'Level', 'Severity', 'Class']) || f.priority?.name || '';

        // Sprints
        const sprintId = fieldMap['sprint'];
        const sprints = (f[sprintId] || []).map((s: any) => s.name);

        // 3. Comments (Already fetched below, move it up for fallback 2)
        const comments = await this.extractComments(document, key);

        // Fallback 2: Scan comments for T-shirt size mentions if still missing
        if (!tShirtSize || tShirtSize === 'N/A') {
            const commentText = comments.map(c => c.body).join(' ');
            // Matches "estimated as XL", "Size: XL", "estimated at L", etc.
            const sizeRegex = /(?:estimated|size|sizing|estimate|estimated as|estimated at)\s*(?:is|as|at|:)?\s*\b(XS|S|M|L|XL|XXL)\b/i;
            const match = commentText.match(sizeRegex);
            if (match) {
                tShirtSize = match[1].toUpperCase();
                console.log(`JiraParser: Extracted T-shirt size ${tShirtSize} from comments fallback.`);
            }
        }

        // 3. Linked Issues (v4.0)
        let linkedIssues: any[] = [];
        const links = f.issuelinks || [];
        const subtasks = f.subtasks || [];

        // Fetch details for up to 10 linked issues to keep it fast
        const targetKeys = [
            ...links.map((l: any) => (l.outwardIssue || l.inwardIssue)?.key),
            ...subtasks.map((st: any) => st.key)
        ].filter(Boolean).slice(0, 10);

        if (targetKeys.length > 0) {
            console.log(`JiraParser: Fetching context for ${targetKeys.length} linked issues...`);
            linkedIssues = await Promise.all(targetKeys.map(k => this.fetchLinkedIssueDetails(k, fieldMap)));
        }

        return {
            id: key,
            source: 'jira',
            key,
            title,
            description: descriptionRaw,
            status,
            type: this.mapType(typeRaw),
            priority,
            assignee: assigneeRaw,
            reporter,
            labels,
            url,
            comments,
            // v4.0 Expanded
            sprints,
            tShirtSize: tShirtSize || 'N/A',
            workType,
            businessTeam,
            businessObjective,
            impact,
            createdDate,
            updatedDate,
            linkedIssues,
            metadata: f
        };
    }

    private async fetchLinkedIssueDetails(key: string, fieldMap: Record<string, string>): Promise<any> {
        try {
            const res = await fetch(`/rest/api/3/issue/${key}?fields=summary,comment,${fieldMap['t-shirt size'] || ''}`);
            if (!res.ok) return { key, title: 'Error fetching', url: `https://${location.hostname}/browse/${key}` };
            const issue = await res.json();
            const f = issue.fields || {};

            // Extract T-shirt size
            const tsId = fieldMap['t-shirt size'];
            const tShirtSize = tsId ? (f[tsId]?.value || f[tsId]?.name || f[tsId] || '') : '';

            // Extract rationale (look for keywords in newest comments)
            const comments = f.comment?.comments || [];
            const rationale = comments.length > 0
                ? this.extractRationale(comments[comments.length - 1].body)
                : 'No technical notes recorded.';

            return {
                id: key,
                key,
                title: f.summary || '',
                tShirtSize,
                rationale,
                url: `https://${location.hostname}/browse/${key}`
            };
        } catch (e) {
            return { key, title: 'Network Error', url: `https://${location.hostname}/browse/${key}` };
        }
    }

    private extractRationale(body: any): string {
        // Just take the first few lines of the latest comment as rationale
        const text = this.parseADF(body);
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        return lines.slice(0, 2).join(' ') + (lines.length > 2 ? '...' : '');
    }

    private scrubJiraUI(text: string, fieldName: string): string {
        if (!text) return '';
        const noise = [
            'Sort in ascending order', 'Sort in descending order',
            'Sort A to Z', 'Sort Z to A', 'More actions for', '•', fieldName,
            'Assign to me', 'Assign to', 'None',
            // Description placeholders
            'Add a description…', 'Add a description'
        ];
        let cleaned = text;
        noise.forEach(n => { cleaned = cleaned.replace(new RegExp(n, 'gi'), ''); });

        // Remove concatenated UI noise (e.g. "To resolve...Sort A to ZMore actions for Assignee")
        cleaned = cleaned.replace(/Sort A to Z.*/gi, '');
        cleaned = cleaned.replace(/More actions for.*/gi, '');

        // Remove duplicate words (e.g. "Karunakaran VinayagamKarunakaran Vinayagam")
        const words = cleaned.trim().split(/\s+/);
        const unique: string[] = [];
        for (let i = 0; i < words.length; i++) {
            if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
                unique.push(words[i]);
            }
        }
        return unique.join(' ') || 'Pending';
    }

    private cleanDescription(text: string): string {
        let cleaned = this.cleanContent(text);
        // Case insensitive check, handles "..." and "…"
        if (/add\s+a\s+description/i.test(cleaned)) return '';
        return cleaned;
    }

    private cleanAssignee(text: string): string {
        if (!text || text.toLowerCase() === 'unassigned') return 'Unassigned 👤';
        // Clean "Sort A to Z" and other menu junk that isn't handled by cleanJiraUI yet
        let cleaned = text.replace(/^Assignee/i, '').trim();
        // Explicitly scrub specific Assignee menu noise
        const noise = ['Sort A to Z', 'More actions for Assignee', 'Sort A to ZMore actions for Assignee', '•'];
        noise.forEach(n => cleaned = cleaned.replace(n, ''));
        // Also run generic scrub
        return this.scrubJiraUI(cleaned, 'Assignee').trim();
    }

    private findFieldByLabel(doc: Document, label: string): string {
        // Find all elements containing the label text
        const elements = Array.from(doc.querySelectorAll('div, span, label, strong'));
        const labelEl = elements.find(el => el.textContent?.trim().toLowerCase() === label.toLowerCase());

        if (labelEl) {
            // Usually the value is in a sibling or a parent's sibling
            const parent = labelEl.parentElement;
            const container = parent?.parentElement;
            // Scan siblings for text content that isn't the label itself
            const value = parent?.textContent?.replace(label, '').trim()
                || container?.textContent?.replace(label, '').trim();
            return value || '';
        }
        return '';
    }

    private extractDescriptionHeuristic(doc: Document): string {
        // Find the "Description" header and look at next sibling's text
        const headers = Array.from(doc.querySelectorAll('h2, h3, strong, div'));
        const descHeader = headers.find(h => h.textContent?.trim() === 'Description');
        if (descHeader) {
            // Try siblings
            let current = descHeader.nextElementSibling;
            while (current) {
                const text = current.textContent?.trim();
                if (text) return text;
                current = current.nextElementSibling;
            }
        }
        return '';
    }

    private extractAssigneeHeuristic(doc: Document): string {
        // Look for typical profile containers
        const containers = doc.querySelectorAll('[data-testid^="issue.views.issue-base.context.people"]');
        for (const container of containers) {
            const text = container.textContent?.trim();
            if (text && text.includes('Assignee')) {
                return text.replace('Assignee', '').trim();
            }
        }
        return '';
    }

    private cleanContent(text: string): string {
        if (!text || text === '_No description provided_') return '_No description provided_';
        // Preserve paragraph structure: split on common delimiters and rejoin
        return text
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]*>/g, '')
            .replace(/([.:])([A-Z])/g, '$1\n\n$2')  // Add break before new sentences starting with caps
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Extracts comments using Jira Cloud REST API (v3.0)
     * Ignores DOM completely.
     */
    private async extractComments(document: Document, issueKey?: string): Promise<any[]> {
        if (!issueKey) return [];

        try {
            console.log(`JiraParser: Fetching comments for ${issueKey} via API...`);
            // We use the relative URL which works thanks to Same-Origin content script execution context
            const response = await fetch(`/rest/api/3/issue/${issueKey}/comment?expand=renderedBody`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`JiraParser: API Error ${response.status} ${response.statusText}`);
                if (response.status === 401 || response.status === 403) {
                    return [{
                        id: 'error-auth',
                        author: 'System',
                        body: 'Error: Could not access Jira API. Please ensure you are logged in.',
                        timestamp: new Date().toISOString()
                    }];
                }
                return [];
            }

            const data = await response.json();
            if (!data.comments || !Array.isArray(data.comments)) {
                return [];
            }

            const processedComments = data.comments.map((c: any, index: number) => {
                let body = '';

                // Strategy: Prefer ADF (JSON) to avoid HTML noise (Smart Card expansion)
                // v3 API returns 'body' as ADF object
                if (c.body && typeof c.body === 'object') {
                    try {
                        body = this.parseADF(c.body);
                    } catch (e) {
                        console.error('JiraParser: ADF Parse Error', e);
                        // Fallback to HTML if ADF fails
                        if (c.renderedBody) body = this.cleanCommentBody(c.renderedBody, document);
                    }
                }
                // Fallback: Rendered HTML (if ADF missing/failed)
                else if (c.renderedBody) {
                    body = this.cleanCommentBody(c.renderedBody, document);
                }
                // Fallback: Plain String
                else if (c.body && typeof c.body === 'string') {
                    body = c.body;
                } else {
                    body = '[Content Not Available]';
                }

                // API returns strictly correct Author Name (displayName)
                const author = c.author?.displayName || 'Unknown User';

                // Format Date (e.g., "Jan 15, 2026, 4:05 PM")
                let created = new Date().toISOString();
                try {
                    if (c.created) {
                        created = new Date(c.created).toLocaleString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit'
                        });
                    }
                } catch (e) { /* ignore date parse error */ }

                // Log for debugging
                console.log(`JiraParser: Processing API Comment ${c.id}: Author=${author}`);

                return {
                    id: c.id || `comment-${index}`,
                    author,
                    body,
                    timestamp: created
                };
            }).filter((item: any) => item !== null) as Comment[]; // Remove nulls

            // v3.1.1: Reverse order to match Jira UI (Newest First)
            const reversedComments = processedComments.reverse();

            return reversedComments;

        } catch (err) {
            console.error('JiraParser: API Fetch Exception', err);
            return [{
                id: 'error-exception',
                author: 'System',
                body: `Error: API Fetch failed. ${err}`,
                timestamp: new Date().toISOString()
            }];
        }
    }

    /**
     * Parses Atlassian Document Format (ADF) JSON into plain text.
     * Prevents expansion of Smart Cards / Macros.
     */
    private parseADF(node: any): string {
        if (!node) return '';
        let text = '';

        // Handle Node Types
        switch (node.type) {
            case 'doc':
            case 'paragraph':
            case 'bulletList':
            case 'orderedList':
            case 'listItem':
            case 'blockquote':
                if (node.content && Array.isArray(node.content)) {
                    node.content.forEach((child: any) => {
                        text += this.parseADF(child);
                    });
                    // Append newline after block elements
                    if (node.type !== 'doc') text += '\n';
                }
                break;

            case 'text':
                text += node.text || '';
                break;

            case 'hardBreak':
                text += '\n';
                break;

            case 'inlineCard':
            case 'blockCard':
            case 'embedCard':
                // CORE FIX: Return simple link instead of expanded content
                if (node.attrs && node.attrs.url) {
                    text += ` [Link: ${node.attrs.url}] `;
                } else {
                    text += ' [Linked Item] ';
                }
                break;

            case 'mention':
                if (node.attrs && node.attrs.text) {
                    text += ` ${node.attrs.text} `;
                } else {
                    text += ' @user ';
                }
                break;

            case 'extension':
            case 'bodiedExtension':
            case 'inlineExtension':
                // Prevent Macros (Filter Results, Roadmap, etc.) from dumping huge content
                text += ` [Embedded Content: ${node.attrs?.extensionKey || 'Extension'}] `;
                break;

            case 'table':
            case 'tableRow':
            case 'tableHeader':
            case 'tableCell':
                // If it's a table, try to render it simply or skip it if it's too structured?
                // Users complained about "too much info" which was likely a table.
                // Converting table to linear text is usually messy.
                // Let's recurse but add structural spacing, OR just collapse it?
                // User wants brevity. Let's try to just separate cells with pipes?
                if (node.content && Array.isArray(node.content)) {
                    node.content.forEach((child: any) => {
                        text += this.parseADF(child);
                        if (node.type === 'tableCell' || node.type === 'tableHeader') text += ' | ';
                    });
                    if (node.type === 'tableRow') text += '\n';
                }
                break;

            default:
                // For other nodes, try to traverse content
                if (node.content && Array.isArray(node.content)) {
                    node.content.forEach((child: any) => {
                        text += this.parseADF(child);
                    });
                }
                break;
        }
        return text;
    }

    private cleanCommentBody(html: string, document: Document): string {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // 1. Remove "Smart Link" embed containers that add huge noise
        // Replace them with a simple textual representation of the link if possible
        // Targeted selectors for various Jira Cloud rendering states
        const cards = tempDiv.querySelectorAll(
            '[data-node-type="inlineCard"], ' +
            '[data-node-type="blockCard"], ' +
            '.jira-issue-card, ' +
            '.smart-link, ' +
            '[data-testid*="inline-card"], ' +
            '[data-testid*="issue.views.issue-base.content.issue-links"]'
        );

        cards.forEach(card => {
            // Try to find the link anchor inside the card
            const link = card.querySelector('a');
            let replacement = '[Linked Issue]';

            if (link) {
                // Best case: We found the actual link. Use its href or text.
                // If the text is huge (e.g. contains status), rely on href or key.
                const href = link.getAttribute('href') || '';
                const keyMatch = href.match(/browse\/([A-Z]+-\d+)/);

                if (keyMatch) {
                    replacement = ` ${keyMatch[1]} `; // Just "ETBSC-123"
                } else {
                    replacement = ` ${link.textContent?.trim() || 'Linked Issue'} `;
                }
            } else if (card.getAttribute('data-card-data')) {
                try {
                    const data = JSON.parse(card.getAttribute('data-card-data') || '{}');
                    if (data.url) replacement = ` [${data.url}] `;
                } catch (e) { /* ignore */ }
            }

            // Check if replacement is still too long/noisy?
            if (replacement.length > 50) {
                replacement = ` [Linked Link] `;
            }

            // Replace the entire complex card structure with just the text
            const textNode = document.createTextNode(replacement);
            card.parentNode?.replaceChild(textNode, card);
        });

        // 2. Remove Styles / Scripts (Standard safety)
        const junk = tempDiv.querySelectorAll('style, script, svg');
        junk.forEach(el => el.remove());

        // 3. Extract Text
        let text = tempDiv.innerText || tempDiv.textContent || '';

        // 4. Whitespace Cleanup
        // Jira HTML often results in extensive vertical gaps
        text = text.replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 newlines
            .replace(/[ \t]+/g, ' ');         // Max 1 space

        return text.trim();
    }


    private scrubCommentText(text: string): string {
        if (!text) return '';
        const uiNoise = [
            'Add a comment…',
            'Add a comment',
            'Add a description…',
            'Add a description',
            'More options',
            'Suggest a reply'
        ];
        // ... (rest of scrub comment text is fine, but filter handles mostly)
        let cleaned = text;
        uiNoise.forEach(n => {
            cleaned = cleaned.replace(new RegExp(n.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '');
        });
        // Remove Pro tip regex from text if it survived
        cleaned = cleaned.replace(/pro\s*tip:\s*press\s*m\s*to\s*comment/gi, '');
        cleaned = cleaned.replace(/\s{2,}/g, ' ');
        // Remove timestamp patterns like "5 hours ago", "18 hours ago(edited)"
        cleaned = cleaned.replace(/\d+\s*(hours?|minutes?|days?|weeks?)\s*ago(\(edited\))?/gi, '');
        // Remove duplicate names that appear back-to-back
        cleaned = cleaned.replace(/(\b\w+\b)\s+\1\s+/gi, '$1 ');
        return cleaned.trim();
    }

    private extractKeyFromUrl(url: string): string {
        // Fallback: Try to get key from URL like /browse/TEST-123
        const match = url.match(/browse\/([A-Z]+-\d+)/);
        return match ? match[1] : '';
    }

    private mapType(raw: string): WorkItemType {
        const lower = raw.toLowerCase();
        if (lower.includes('bug')) return 'bug';
        if (lower.includes('story')) return 'story';
        if (lower.includes('epic')) return 'epic';
        if (lower.includes('task')) return 'task';
        return 'other';
    }
}
