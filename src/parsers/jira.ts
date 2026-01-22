import { WorkItem, WorkItemParser } from '../types';
import { parseADF } from './jira/adf';
import * as utils from './jira/utils';
import * as api from './jira/api';

export class JiraParser implements WorkItemParser {
    canParse(url: string): boolean {
        const jiraUrlPattern = /atlassian\.net\/(browse\/|jira\/software\/.*(selectedIssue=|issues\/))/;
        return jiraUrlPattern.test(url);
    }

    private baseUrlOverride: string | null = null;
    private jiraEmail: string | null = null;
    private jiraApiToken: string | null = null;

    setCredentials(email: string, apiToken: string) {
        this.jiraEmail = email;
        this.jiraApiToken = apiToken;
    }

    setBaseUrl(url: string) {
        try {
            const parsed = new URL(url);
            this.baseUrlOverride = `${parsed.protocol}//${parsed.host}`;
        } catch (e) {
            this.baseUrlOverride = null;
        }
    }

    private getApiUrl(path: string): string {
        if (this.baseUrlOverride) return `${this.baseUrlOverride}${path}`;
        return path;
    }

    private getBaseUrl(): string {
        return this.baseUrlOverride || '';
    }

    private getAuthHeaders(): Record<string, string> {
        if (this.jiraEmail && this.jiraApiToken) {
            const credentials = btoa(`${this.jiraEmail}:${this.jiraApiToken}`);
            return { 'Authorization': `Basic ${credentials}` };
        }
        return {};
    }

    async parse(document: Document, url: string): Promise<WorkItem> {
        this.setBaseUrl(url);
        let key = utils.extractKeyFromUrl(url);
        if (!key) {
            const keyEl = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"] a');
            key = keyEl?.textContent?.trim() || '';
        }
        if (!key) throw new Error('Could not extract Issue Key');
        return this.parseByKey(key, document);
    }

    async parseByKey(key: string, document?: Document): Promise<WorkItem> {
        console.log(`JiraParser: Fetching issue ${key} data via API...`);

        let fieldMap: Record<string, string> = {};
        try {
            const fieldRes = await fetch(this.getApiUrl('/rest/api/3/field'), {
                headers: { 'Accept': 'application/json', ...this.getAuthHeaders() }
            });
            if (fieldRes.ok) {
                const fieldsArr = await fieldRes.json();
                fieldsArr.forEach((fld: any) => {
                    fieldMap[fld.name.toLowerCase()] = fld.id;
                });
            }
        } catch (e) {
            console.warn('JiraParser: Field discovery failed', e);
        }

        const response = await fetch(this.getApiUrl(`/rest/api/3/issue/${key}`), {
            method: 'GET',
            headers: { 'Accept': 'application/json', ...this.getAuthHeaders() }
        });

        if (!response.ok) {
            throw new Error(`JiraParser: API Error ${response.status} fetching issue ${key}`);
        }

        const issue = await response.json();
        const f = issue.fields || {};

        const getCustom = (searchNames: string[]) => {
            const normalizedNames = searchNames.map(n => n.toLowerCase());
            const matchedIds = normalizedNames
                .map(name => fieldMap[name])
                .filter(id => id !== undefined);

            for (const id of matchedIds) {
                const val = f[id];
                if (val !== undefined && val !== null) {
                    if (typeof val === 'object') {
                        if (val.value) return val.value;
                        if (val.name) return val.name;
                        return JSON.stringify(val);
                    }
                    if (String(val).trim() !== '') return String(val);
                }
            }
            return 'N/A';
        };

        const typeRaw = f.issuetype?.name || 'other';
        const type = utils.mapType(typeRaw);
        const url = `${this.getBaseUrl() || window.location.origin}/browse/${key}`;

        const comments = await api.extractComments(this.getBaseUrl(), this.getAuthHeaders(), document || (null as any), key);

        let tShirtSize = getCustom(['t-shirt size', 'tshirt', 'sizing', 'size', 'et - size']);
        if (tShirtSize === 'N/A') {
            const customFields = Object.keys(f).filter(k => k.startsWith('customfield_'));
            for (const cf of customFields) {
                const val = f[cf];
                if (val && typeof val === 'object' && val.value && /^(XS|S|M|L|XL|XXL)$/i.test(val.value)) {
                    tShirtSize = val.value;
                    break;
                }
            }
        }
        if (tShirtSize === 'N/A' && comments.length > 0) {
            const sizeRegex = /estimated as (XS|S|M|L|XL|XXL)/i;
            for (const c of comments) {
                const match = c.body.match(sizeRegex);
                if (match) {
                    tShirtSize = match[1].toUpperCase();
                    break;
                }
            }
        }

        let linkedIssues: any[] = [];
        const links = f.issuelinks || [];
        const subtasks = f.subtasks || [];
        const targetKeys = Array.from(new Set([
            ...links.map((l: any) => (l.outwardIssue || l.inwardIssue)?.key),
            ...subtasks.map((st: any) => st.key)
        ].filter(Boolean))).slice(0, 10);

        if (targetKeys.length > 0) {
            linkedIssues = await Promise.all(targetKeys.map(k => api.fetchLinkedIssueDetails(k, fieldMap, this.getBaseUrl(), this.getAuthHeaders())));
        }

        return {
            id: key,
            source: 'jira',
            key,
            title: f.summary || '',
            description: utils.cleanDescription(f.description ? parseADF(f.description) : ''),
            status: f.status?.name || 'Pending',
            type,
            priority: f.priority?.name || 'Medium',
            assignee: utils.cleanAssignee(f.assignee?.displayName || 'Unassigned'),
            reporter: f.reporter?.displayName || 'Unknown',
            labels: f.labels || [],
            url,
            comments,
            createdDate: f.created,
            updatedDate: f.updated,
            sprints: f[fieldMap['sprint']]?.map((s: any) => s.name) || [],
            tShirtSize,
            workType: getCustom(['work type', 'work item type']),
            businessTeam: getCustom(['requesting business team', 'team']),
            businessObjective: getCustom(['business objective', 'goal', 'business value']),
            impact: getCustom(['et - impact', 'impact', 'level', 'severity', 'class']),
            linkedIssues: linkedIssues.filter(Boolean),
            metadata: f
        };
    }

    async fetchEpicChildren(epicKey: string): Promise<string[]> {
        return api.fetchEpicChildren(epicKey, this.getBaseUrl(), this.getAuthHeaders());
    }
}
