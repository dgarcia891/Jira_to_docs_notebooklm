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
    | { type: 'GET_ISSUE_DOC_LINK'; payload: { issueKey: string } }
    | { type: 'CLEAR_ISSUE_DOC_LINK'; payload: { issueKey: string } }
    | { type: 'GET_CURRENT_ISSUE_KEY' }
    | { type: 'LOGOUT' };

export type ContentMessage =
    | { type: 'EXTRACT_ISSUE' };

export type ContentResponse =
    | { type: 'EXTRACT_SUCCESS'; payload: WorkItem }
    | { type: 'EXTRACT_ERROR'; error: string };
