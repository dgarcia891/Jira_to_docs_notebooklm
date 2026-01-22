import { WorkItem } from '../types';

export class DocsSyncService {
    private baseUrl = 'https://docs.googleapis.com/v1/documents';
    private driveUrl = 'https://www.googleapis.com/drive/v3/files';

    /**
     * Creates a new Google Doc with the given title.
     * Optionally places it in a folder.
     */
    async createDoc(title: string, token: string, folderId?: string): Promise<string> {
        const res = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title }),
        });

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
        const getRes = await fetch(`${this.driveUrl}/${fileId}?fields=parents`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const fileData = await getRes.json();
        const currentParents = (fileData.parents || []).join(',');

        // Update parents
        await fetch(`${this.driveUrl}/${fileId}?addParents=${folderId}&removeParents=${currentParents}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    /**
     * Lists Google Docs from Drive.
     */
    async listDocs(token: string): Promise<{ id: string, name: string }[]> {
        const query = "mimeType='application/vnd.google-apps.document' and trashed=false";
        const res = await fetch(`${this.driveUrl}?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
            headers: { Authorization: `Bearer ${token}` },
        });

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
        const res = await fetch(`${this.driveUrl}?q=${encodeURIComponent(q)}&fields=files(id,name)&orderBy=modifiedTime desc`, {
            headers: { Authorization: `Bearer ${token}` },
        });

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

        const res = await fetch(`${this.driveUrl}?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name`, {
            headers: { Authorization: `Bearer ${token}` },
        });

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

        let insertIndex = 1;

        // 3. Build cumulative content
        for (const item of items) {
            const commentsList = item.comments && item.comments.length > 0
                ? item.comments.map(c => `[${c.timestamp || 'Unknown'}] ${c.author}: ${c.body.replace(/\*\*/g, '')}`).join('\n')
                : '_No recent comments_';

            const metadataBlock = [
                `Status: ${item.status}`,
                `Reporter: ${item.reporter || 'N/A'}`,
                `Assignee: ${item.assignee || 'Unassigned'}`,
                `Sprint History: ${item.sprints && item.sprints.length > 0 ? item.sprints.join(', ') : 'No Sprints'}`,
                `T-Shirt Size: ${item.tShirtSize || 'N/A'}`,
                `Work Type: ${item.workType || 'N/A'}`,
                `Business Team: ${item.businessTeam || 'N/A'}`,
                `Business Objective: ${item.businessObjective || 'N/A'}`,
                `Impact: ${item.impact || 'N/A'}`,
                `Labels: ${item.labels && item.labels.length > 0 ? item.labels.join(', ') : 'None'}`,
                `Synced: ${new Date().toLocaleString()}`,
                `Created: ${item.createdDate ? new Date(item.createdDate).toLocaleString() : 'N/A'} | Updated: ${item.updatedDate ? new Date(item.updatedDate).toLocaleString() : 'N/A'}`
            ].join('\n');

            let linkedIssuesContent = '';
            if (item.linkedIssues && item.linkedIssues.length > 0) {
                linkedIssuesContent = `\nLinked Tickets:\n` +
                    item.linkedIssues.map(li =>
                        `* ${li.key}: ${li.title}\n` +
                        `  - T-Shirt: ${li.tShirtSize || 'N/A'}\n` +
                        `  - Context: ${li.rationale || 'N/A'}`
                    ).join('\n');
            }

            const headerText = `${item.key}: ${item.title}`;
            const bodyContent = `${metadataBlock}
Link: ${item.url}

Description
${item.description}
${linkedIssuesContent}

--------------------------------------------------
Latest Comments
${commentsList}

---
\n`;

            // Note: In Google Docs batchUpdate, requests are processed sequentially.
            // But we need to insert at the end of what we just inserted.
            // Actually, if we reverse the order, we can insert at fixed index 1,
            // but it's easier to just generate a long string and insert once.
            // Let's gather all text for all items and insert in one go to simplify index math.
        }

        // REVISED STRATEGY: Build one giant string for all items
        let fullDocumentText = '';
        const styles: { start: number, end: number, type: string }[] = [];

        for (const item of items) {
            const commentsList = item.comments && item.comments.length > 0
                ? item.comments.map(c => `[${c.timestamp || 'Unknown'}] ${c.author}: ${c.body.replace(/\*\*/g, '')}`).join('\n')
                : '_No recent comments_';

            const metadataBlock = [
                `Status: ${item.status}`,
                `Reporter: ${item.reporter || 'N/A'}`,
                `Assignee: ${item.assignee || 'Unassigned'}`,
                `Sprint History: ${item.sprints && item.sprints.length > 0 ? item.sprints.join(', ') : 'No Sprints'}`,
                `T-Shirt Size: ${item.tShirtSize || 'N/A'}`,
                `Work Type: ${item.workType || 'N/A'}`,
                `Business Team: ${item.businessTeam || 'N/A'}`,
                `Business Objective: ${item.businessObjective || 'N/A'}`,
                `Impact: ${item.impact || 'N/A'}`,
                `Labels: ${item.labels && item.labels.length > 0 ? item.labels.join(', ') : 'None'}`,
                `Synced: ${new Date().toLocaleString()}`,
                `Created: ${item.createdDate ? new Date(item.createdDate).toLocaleString() : 'N/A'} | Updated: ${item.updatedDate ? new Date(item.updatedDate).toLocaleString() : 'N/A'}`
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
        const res = await fetch(`${this.baseUrl}/${docId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const errBody = await res.text();
            console.error(`DocsSync API Error [Get]: ${res.status}`, errBody);
            throw new Error(`Failed to fetch doc (${res.status}): ${errBody}`);
        }
        return await res.json();
    }

    private async batchUpdate(docId: string, token: string, requests: any[]): Promise<void> {
        const res = await fetch(`${this.baseUrl}/${docId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            console.error(`DocsSync API Error [BatchUpdate]: ${res.status}`, errBody);
            throw new Error(`Failed to update doc (${res.status}): ${errBody}`);
        }
    }

}
