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
     * Syncs a WorkItem to a Google Doc.
     * - If section exists (Find by H2), updates it.
     * - If not, appends it.
     */
    async syncItem(docId: string, item: WorkItem, token: string): Promise<void> {
        // 1. Fetch current Doc content to find position
        const doc = await this.getDoc(docId, token);
        const existingRange = this.findSectionRange(doc, item.key);

        console.log('DocsSyncService: Syncing item', item.key, 'with', item.comments?.length || 0, 'comments');

        const checkmark = item.status.toLowerCase() === 'done' ? '✅' : '⏳';
        const commentsList = item.comments && item.comments.length > 0
            ? item.comments.map(c => `- **[${c.timestamp || 'Unknown'}] ${c.author}:** ${c.body}`).join('\n')
            : '_No recent comments_';

        // v4.0 Full Metadata Block
        const metadataBlock = [
            `**Status:** ${item.status}`,
            `**Reporter:** ${item.reporter || 'N/A'}`,
            `**Assignee:** ${item.assignee || 'Unassigned'}`,
            `**Sprint History:** ${item.sprints && item.sprints.length > 0 ? item.sprints.join(', ') : 'No Sprints'}`,
            `**T-Shirt Size:** ${item.tShirtSize || 'N/A'}`,
            `**Work Type:** ${item.workType || 'N/A'}`,
            `**Business Team:** ${item.businessTeam || 'N/A'}`,
            `**Business Objective:** ${item.businessObjective || 'N/A'}`,
            `**Impact:** ${item.impact || 'N/A'}`,
            `**Labels:** ${item.labels && item.labels.length > 0 ? item.labels.join(', ') : 'None'}`,
            `**Created:** ${item.createdDate ? new Date(item.createdDate).toLocaleString() : 'N/A'} | **Updated:** ${item.updatedDate ? new Date(item.updatedDate).toLocaleString() : 'N/A'}`
        ].join('\n');

        // v4.0 Linked Ticket Context
        let linkedIssuesContent = '';
        if (item.linkedIssues && item.linkedIssues.length > 0) {
            linkedIssuesContent = `\n### Linked Ticket Context\n` +
                item.linkedIssues.map(li =>
                    `* **${li.key}: ${li.title}**\n` +
                    `  - **T-Shirt Size:** ${li.tShirtSize || 'N/A'}\n` +
                    `  - **Context:** ${li.rationale || 'N/A'}\n` +
                    `  - [View in Jira](${li.url})`
                ).join('\n');
        }

        // Pure text content
        const headerText = `${item.key}: ${item.title}`;
        const newContent = `${headerText}
${metadataBlock}
**Link:** ${item.url}

### Description
${item.description}
${linkedIssuesContent}

### Latest Comments
${commentsList}

---
`;

        const syncRequests: any[] = [];
        let insertIndex: number;

        if (existingRange) {
            // 2. Prepare Update (Delete then Insert)
            insertIndex = existingRange.startIndex;
            syncRequests.push({
                deleteContentRange: {
                    range: {
                        startIndex: existingRange.startIndex,
                        endIndex: existingRange.endIndex,
                    },
                },
            });
        } else {
            // 2. Prepare Append (Insert at end)
            insertIndex = doc.body.content[doc.body.content.length - 1].endIndex - 1;
            syncRequests.push({
                insertText: {
                    location: { index: insertIndex },
                    text: '\n',
                },
            });
            insertIndex += 1; // Content starts after the newline
        }

        // Add main content
        syncRequests.push({
            insertText: {
                location: { index: insertIndex },
                text: newContent,
            },
        });

        // 3. Apply Styling (HEADING_2 to the header line)
        const titleLineLength = headerText.length;
        syncRequests.push({
            updateParagraphStyle: {
                range: {
                    startIndex: insertIndex,
                    endIndex: insertIndex + titleLineLength,
                },
                paragraphStyle: { namedStyleType: 'HEADING_2' },
                fields: 'namedStyleType',
            },
        });

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

    /**
     * Scans the document structure to find a Heading 2 with the Issue Key.
     * Returns the startIndex and endIndex of the entire section (up to next H2 or end).
     */
    public findSectionRange(doc: any, key: string): { startIndex: number; endIndex: number } | null {
        const content = doc.body.content;
        let start = -1;
        let end = -1;

        // Iterate through structural elements
        for (let i = 0; i < content.length; i++) {
            const el = content[i];
            if (!el.paragraph) continue;

            // Join all text runs in the paragraph to handle partial styles/links
            const fullText = el.paragraph.elements
                .map((e: any) => e.textRun?.content || '')
                .join('')
                .trim();

            const isH2 = el.paragraph.paragraphStyle?.namedStyleType === 'HEADING_2';

            // PREFIX-AGNOSTIC MATCH
            // Strip any leading punctuation/markdown like "## " or "**" or "ID: "
            const cleanText = fullText.replace(/^[^a-zA-Z0-9]+/, '').trim();

            if (cleanText.startsWith(key)) {
                start = el.startIndex;
                console.log(`DocsSync: Found section for ${key} at index ${start}`);
                continue;
            }

            // BOUNDARY DETECTION
            if (start !== -1) {
                const style = el.paragraph.paragraphStyle?.namedStyleType;
                // Stop at next H1, H2 or the horizontal rule "---"
                if (style === 'HEADING_1' || style === 'HEADING_2' || fullText === '---' || fullText === '***') {
                    // Include the separator in the range to be replaced
                    end = (fullText === '---' || fullText === '***') ? el.endIndex : el.startIndex;
                    break;
                }
            }
        }

        // If we found start but never hit another H2, section goes to end of doc
        if (start !== -1 && end === -1) {
            end = content[content.length - 1].endIndex - 1;
        }

        return start !== -1 ? { startIndex: start, endIndex: end } : null;
    }
}
