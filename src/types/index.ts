export * from './parser';
export * from './doc';
export interface Comment {
    id: string;
    author: string;
    body: string;
    timestamp?: string;
    url?: string;
}

export type WorkItemType = 'bug' | 'story' | 'task' | 'epic' | 'other';

export interface LinkedIssue {
    id: string;
    key: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    comments?: Comment[];
    tShirtSize?: string;
    rationale?: string; // Standard summary fallback
    url: string;
}

export interface WorkItem {
    /** Unique identifier (e.g., JIRA-123) */
    id: string;

    /** Source system (jira, trello, etc.) */
    source: 'jira' | 'trello' | 'github' | 'other';

    /** Human readable ID usually same as id */
    key: string;

    title: string;
    description: string;
    status: string;
    type: WorkItemType;
    priority?: string;
    assignee?: string;
    reporter?: string; // v4.0
    labels: string[];

    /** URL to the original item */
    url: string;

    /** Latest comments (sorted newest first in v3.1.1) */
    comments: Comment[];

    /** v4.0 Expanded Metadata */
    sprints?: string[];
    tShirtSize?: string;
    storyPoints?: string;
    workType?: string;
    businessTeam?: string;
    businessObjective?: string;
    impact?: string;
    createdDate?: string;
    updatedDate?: string;

    /** v4.0 Linked context */
    linkedIssues?: LinkedIssue[];

    /** Raw metadata for source-specific handling if needed */
    metadata?: Record<string, any>;
}
