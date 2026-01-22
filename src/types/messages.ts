import { WorkItem } from './index';

export type BackgroundMessage =
    | { type: 'LOGIN' }
    | { type: 'CHECK_AUTH' }
    | { type: 'LIST_DOCS' }
    | { type: 'LIST_DRIVE_FOLDERS'; payload?: { parentId?: string } }
    | { type: 'SEARCH_DOCS'; payload: { query: string } }
    | { type: 'CREATE_DOC'; payload: { title: string; folderId?: string } }
    | { type: 'GET_SELECTED_DOC' }
    | { type: 'SET_SELECTED_DOC'; payload: { docId: string; name: string } }
    | { type: 'SYNC_CURRENT_PAGE' }
    | { type: 'SYNC_EPIC'; payload: { epicKey: string } }
    | { type: 'GET_ISSUE_DOC_LINK'; payload: { issueKey: string } }
    | { type: 'CLEAR_ISSUE_DOC_LINK'; payload: { issueKey: string } }
    | { type: 'GET_CURRENT_ISSUE_KEY' }
    | { type: 'GET_LAST_SYNC'; payload: { issueKey: string } }
    | { type: 'LOGOUT' };

export type ProgressMessage =
    | { type: 'SYNC_PROGRESS'; payload: { current: number; total: number; key: string } };

export type ContentMessage =
    | { type: 'EXTRACT_ISSUE' }
    | { type: 'GET_ISSUE_KEY' }
    | { type: 'FETCH_EPIC_BULK'; payload: { epicKey: string } };

export type ContentResponse =
    | { type: 'EXTRACT_SUCCESS'; payload: WorkItem }
    | { type: 'EXTRACT_ERROR'; error: string }
    | { type: 'EPIC_BULK_SUCCESS'; success: true; payload: { epicKey: string; items: WorkItem[] } }
    | { type: 'EPIC_BULK_PROGRESS'; payload: { current: number; total: number; key: string } }
    | { type: 'EPIC_BULK_ERROR'; success: false; error: string };
