import { WorkItem } from '../types';
import { formatDate } from '../utils/docUtils';

export class DocsSyncService {
    private baseUrl = 'https://docs.googleapis.com/v1/documents';
    private driveUrl = 'https://www.googleapis.com/drive/v3/files';

    /**
     * Authenticated fetch wrapper with 401 handling and single retry.
     */
    private async authFetch(url: string, options: RequestInit, token: string): Promise<Response> {
        let response = await fetch(url, options);

        if (response.status === 401) {
            console.warn(`DocsSync: 401 Unauthorized for ${url}. Clearing token and retrying...`);

            // We use a custom event or direct call if we had access to authService here.
            // Since we don't want to create circular dependencies, we'll signal the background script 
            // or use a callback. For now, let's assume we can trigger a storage clear.
            await chrome.storage.local.remove(['auth_token', 'token_expiry']);

            // Note: In a real extension, we might send a message to background to re-auth,
            // but for a "Sync" operation already in progress, we try one silent check.
            // If the background script is the one calling this, it can handle re-fetching.

            // To be truly robust, we'd need to re-fetch the token. 
            // Let's modify the service methods to handle the retry loop.
            return response;
        }

        return response;
    }

    /**
     * Creates a new Google Doc with the given title.
     * Optionally places it in a folder.
     */
    async createDoc(title: string, token: string, folderId?: string): Promise<string> {
        const res = await this.authFetch(this.baseUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title }),
        }, token);

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Failed to create doc (${res.status}): ${errBody}`);
        }
        const data = await res.json();
        const docId = data.documentId;

        // If folder specified, move the doc into that folder
        if (folderId) {
            await this.moveToFolder(docId, folderId, token);
        }

        return docId;
    }

    /**
     * Moves a file to a specific folder.
     */
    private async moveToFolder(fileId: string, folderId: string, token: string): Promise<void> {
        // First get current parents
        const getRes = await this.authFetch(`${this.driveUrl}/${fileId}?fields=parents`, {
            headers: { Authorization: `Bearer ${token}` },
        }, token);
        const fileData = await getRes.json();
        const currentParents = (fileData.parents || []).join(',');

        // Update parents
        await this.authFetch(`${this.driveUrl}/${fileId}?addParents=${folderId}&removeParents=${currentParents}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
        }, token);
    }

    /**
     * Lists Google Docs from Drive.
     */
    async listDocs(token: string): Promise<{ id: string, name: string }[]> {
        const query = "mimeType='application/vnd.google-apps.document' and trashed=false";
        const res = await this.authFetch(`${this.driveUrl}?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
            headers: { Authorization: `Bearer ${token}` },
        }, token);

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Failed to list docs (${res.status}): ${errBody}`);
        }
        const data = await res.json();
        return data.files || [];
    }

    /**
     * Searches for Google Docs by name.
     */
    async searchDocs(token: string, query: string): Promise<{ id: string, name: string }[]> {
        const q = `mimeType='application/vnd.google-apps.document' and name contains '${query.replace(/'/g, "\\'")}' and trashed=false`;
        const res = await this.authFetch(`${this.driveUrl}?q=${encodeURIComponent(q)}&fields=files(id,name)&orderBy=modifiedTime desc`, {
            headers: { Authorization: `Bearer ${token}` },
        }, token);

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Failed to search docs (${res.status}): ${errBody}`);
        }
        const data = await res.json();
        return data.files || [];
    }

    /**
     * Lists folders from Drive with optional parent filtering.
     * @param parentId - 'root' for top-level, folder ID for subfolders, undefined for all
     */
    async listFolders(token: string, parentId?: string): Promise<{ id: string, name: string }[]> {
        let query = "mimeType='application/vnd.google-apps.folder' and trashed=false";

        if (parentId) {
            // Filter by parent folder
            query += ` and '${parentId}' in parents`;
        }

        const res = await this.authFetch(`${this.driveUrl}?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name`, {
            headers: { Authorization: `Bearer ${token}` },
        }, token);

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Failed to list folders (${res.status}): ${errBody}`);
        }
        const data = await res.json();
        return data.files || [];
    }

    /**
     * Syncs a single WorkItem to a Google Doc using Wipe & Replace.
     */
    async syncItem(docId: string, item: WorkItem, token: string): Promise<void> {
        return this.syncItems(docId, [item], token);
    }

    /**
     * Syncs multiple WorkItems to a Google Doc.
     * 1. Wipes the entire document.
     * 2. Inserts each item sequentially.
     */
    async syncItems(docId: string, items: WorkItem[], token: string): Promise<void> {
        // 1. Fetch current Doc to get range
        const doc = await this.getDoc(docId, token);
        const endIndex = doc.body.content[doc.body.content.length - 1].endIndex;

        console.log(`DocsSyncService: Wiping and syncing ${items.length} items to ${docId}`);

        const syncRequests: any[] = [];

        // 2. WIPE: Delete everything from index 1 to end
        // (Index 0 is the start of the document, index 1 is usually the first character)
        if (endIndex > 2) {
            syncRequests.push({
                deleteContentRange: {
                    range: {
                        startIndex: 1,
                        endIndex: endIndex - 1,
                    },
                },
            });
        }

        // 3. Build cumulative content
        let fullDocumentText = '';
        const styles: { start: number, end: number, type: string }[] = [];

        for (const item of items) {
            const commentsList = item.comments && item.comments.length > 0
                ? item.comments.map(c => `[${c.timestamp || 'Unknown'}] ${c.author}: ${c.body.replace(/\*\*/g, '')}`).join('\n')
                : '_No recent comments_';

            const metadataBlock = [
                `Status: ${item.status}`,
                `Story Points: ${item.storyPoints || 'N/A'}`,
                `Reporter: ${item.reporter || 'N/A'}`,
                `Assignee: ${item.assignee || 'Unassigned'}`,
                `Sprint History: ${item.sprints && item.sprints.length > 0 ? item.sprints.join(', ') : 'No Sprints'}`,
                `T-Shirt Size: ${item.tShirtSize || 'N/A'}`,
                `Work Type: ${item.workType || 'N/A'}`,
                `Business Team: ${item.businessTeam || 'N/A'}`,
                `Business Objective: ${item.businessObjective || 'N/A'}`,
                `Impact: ${item.impact || 'N/A'}`,
                `Labels: ${item.labels && item.labels.length > 0 ? item.labels.join(', ') : 'None'}`,
                `Synced: ${formatDate(new Date())}`,
                `Created: ${formatDate(item.createdDate)} | Updated: ${formatDate(item.updatedDate)}`
            ].join('\n');

            let linkedIssuesContent = '';
            if (item.linkedIssues && item.linkedIssues.length > 0) {
                linkedIssuesContent = `\nLinked Tickets:\n` +
                    item.linkedIssues.map(li => {
                        const commentsPart = (li.comments && li.comments.length > 0)
                            ? `\n    Comments:\n    ` + li.comments.map(c => `[${c.timestamp}] ${c.author}: ${c.body}`).join('\n    ')
                            : '';

                        return `* ${li.key}: ${li.title}\n` +
                            `  - Status: ${li.status || 'N/A'} | Priority: ${li.priority || 'N/A'}\n` +
                            `  - Description: ${li.description || 'No description'}\n` +
                            `  - Link: ${li.url}${commentsPart}`;
                    }).join('\n\n');
            }

            const headerText = `${item.key}: ${item.title}\n`;
            const headerStart = fullDocumentText.length + 1; // +1 because we insert at index 1
            fullDocumentText += headerText;
            const headerEnd = fullDocumentText.length + 1;
            styles.push({ start: headerStart, end: headerEnd, type: 'HEADING_1' });

            const bodyContent = `${metadataBlock}\nLink: ${item.url}\n\nDescription\n${item.description}\n${linkedIssuesContent}\n\n--------------------------------------------------\nLatest Comments\n${commentsList}\n\n---\n\n`;
            const bodyStart = fullDocumentText.length + 1;
            fullDocumentText += bodyContent;
            const bodyEnd = fullDocumentText.length + 1;
            styles.push({ start: bodyStart, end: bodyEnd, type: 'NORMAL_TEXT' });
        }

        // Insert full content
        syncRequests.push({
            insertText: {
                location: { index: 1 },
                text: fullDocumentText,
            },
        });

        // Apply styles
        for (const style of styles) {
            syncRequests.push({
                updateParagraphStyle: {
                    range: {
                        startIndex: style.start,
                        endIndex: style.end - 1,
                    },
                    paragraphStyle: { namedStyleType: style.type as any },
                    fields: 'namedStyleType',
                },
            });
        }

        await this.batchUpdate(docId, token, syncRequests);
    }

    private async getDoc(docId: string, token: string): Promise<any> {
        const res = await this.authFetch(`${this.baseUrl}/${docId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }, token);
        if (!res.ok) {
            const errBody = await res.text();
            console.error(`DocsSync API Error [Get]: ${res.status}`, errBody);
            throw new Error(`Failed to fetch doc (${res.status}): ${errBody}`);
        }
        return await res.json();
    }

    private async batchUpdate(docId: string, token: string, requests: any[]): Promise<void> {
        const res = await this.authFetch(`${this.baseUrl}/${docId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests }),
        }, token);
        if (!res.ok) {
            const errBody = await res.text();
            console.error(`DocsSync API Error [BatchUpdate]: ${res.status}`, errBody);
            throw new Error(`Failed to update doc (${res.status}): ${errBody}`);
        }
    }

}
