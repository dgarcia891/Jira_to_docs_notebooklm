import React, { useState, useEffect } from 'react';
import { BackgroundMessage } from './types/messages';

interface Doc {
    id: string;
    name: string;
}

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [docs, setDocs] = useState<Doc[]>([]);
    const [selectedDocId, setSelectedDocId] = useState('');
    const [status, setStatus] = useState<{ message: string; type: 'info' | 'success' | 'error' | 'debug' }>({ message: '', type: 'info' });
    const [isSyncing, setIsSyncing] = useState(false);
    const [manualToken, setManualToken] = useState('');
    const [showManual, setShowManual] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [jiraApiToken, setJiraApiToken] = useState('');
    const [jiraEmail, setJiraEmail] = useState('');

    // First-run workflow state
    const [currentIssueKey, setCurrentIssueKey] = useState<string | null>(null);
    const [currentIssueTitle, setCurrentIssueTitle] = useState<string>('');
    const [linkedDoc, setLinkedDoc] = useState<{ docId: string; name: string } | null>(null);
    const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
    const [isLoadingLink, setIsLoadingLink] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState('');
    const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'My Drive' }]);
    const [activeTab, setActiveTab] = useState<'create' | 'link'>('create');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLinking, setIsLinking] = useState(false);

    useEffect(() => {
        checkAuth();
        loadJiraSettings();

        const listener = (msg: any) => {
            if (msg.type === 'AUTH_SUCCESS') {
                setIsAuthenticated(true);
                checkCurrentPageLink();
                setStatus({ message: 'Authenticated!', type: 'success' });
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    // Check for existing link when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            checkCurrentPageLink();
        }
    }, [isAuthenticated]);

    const checkCurrentPageLink = async () => {
        setIsLoadingLink(true);
        try {
            // Get current issue key from active tab
            const keyData = await sendMessage({ type: 'GET_CURRENT_ISSUE_KEY' });
            if (keyData?.error || !keyData) {
                setCurrentIssueKey(null);
                setIsLoadingLink(false);
                return;
            }
            setCurrentIssueKey(keyData.key || keyData);
            setCurrentIssueTitle(keyData.title || keyData.key || keyData);
            setNewDocTitle(keyData.title || keyData.key || keyData);

            // Check if this issue has a linked doc
            const link = await sendMessage({ type: 'GET_ISSUE_DOC_LINK', payload: { issueKey: keyData.key || keyData } });
            if (link) {
                setLinkedDoc(link);
            } else {
                setLinkedDoc(null);
                // Restore last used folder or default to root
                await restoreLastFolder();
            }
        } catch (err) {
            console.error('Failed to check page link', err);
        } finally {
            setIsLoadingLink(false);
        }
    };

    const loadFolders = async (parentId: string) => {
        try {
            const folderList = await sendMessage({ type: 'LIST_DRIVE_FOLDERS', payload: { parentId } });
            setFolders(folderList || []);
        } catch (err) {
            console.error('Failed to load folders', err);
            setFolders([]);
        }
    };

    const restoreLastFolder = async () => {
        try {
            const stored = await chrome.storage.local.get('lastFolderPath');
            if (Array.isArray(stored.lastFolderPath) && stored.lastFolderPath.length > 0) {
                const path = stored.lastFolderPath as { id: string; name: string }[];
                setFolderPath(path);
                const lastFolder = path[path.length - 1];
                setSelectedFolderId(lastFolder.id === 'root' ? '' : lastFolder.id);
                await loadFolders(lastFolder.id);
            } else {
                await loadFolders('root');
            }
        } catch (err) {
            console.error('Failed to restore folder', err);
            await loadFolders('root');
        }
    };

    const saveLastFolder = async (path: { id: string; name: string }[]) => {
        await chrome.storage.local.set({ lastFolderPath: path });
    };

    const navigateToFolder = async (folder: { id: string; name: string }) => {
        // Add to path and load subfolders
        const newPath = [...folderPath, folder];
        setFolderPath(newPath);
        setSelectedFolderId(folder.id);
        await loadFolders(folder.id);
        await saveLastFolder(newPath);
    };

    const navigateUp = async (index: number) => {
        // Go back to a specific level in the path
        const newPath = folderPath.slice(0, index + 1);
        setFolderPath(newPath);
        const targetId = newPath[newPath.length - 1].id;
        setSelectedFolderId(targetId === 'root' ? '' : targetId);
        await loadFolders(targetId);
        await saveLastFolder(newPath);
    };

    const loadJiraSettings = async () => {
        const result = await chrome.storage.local.get(['jira_api_token', 'jira_email']);
        if (result.jira_api_token) setJiraApiToken(String(result.jira_api_token));
        if (result.jira_email) setJiraEmail(String(result.jira_email));
    };

    const saveJiraSettings = async () => {
        await chrome.storage.local.set({ jira_api_token: jiraApiToken, jira_email: jiraEmail });
        setStatus({ message: 'Jira settings saved!', type: 'success' });
    };

    const sendMessage = (msg: BackgroundMessage): Promise<any> => {
        return chrome.runtime.sendMessage(msg);
    };

    const checkAuth = async () => {
        try {
            const token = await sendMessage({ type: 'CHECK_AUTH' });
            setIsAuthenticated(!!token);
            if (token) {
                loadDocs();
                loadSelectedDoc();
            }
        } catch (err) {
            console.error('Auth check failed', err);
        }
    };

    const handleLogin = async () => {
        setStatus({ message: 'Logging in...', type: 'info' });
        try {
            const resp = await chrome.runtime.sendMessage({ type: 'LOGIN' });
            if (resp && resp.error) {
                setStatus({ message: `Login Error: ${resp.error}`, type: 'error' });
            } else {
                setIsAuthenticated(true);
                loadDocs();
                loadSelectedDoc();
                setStatus({ message: 'Authenticated!', type: 'success' });
            }
        } catch (err: any) {
            setStatus({ message: `Login Failed: ${err.message}`, type: 'error' });
        }
    };

    const handleLogout = async () => {
        try {
            await sendMessage({ type: 'LOGOUT' });
            setIsAuthenticated(false);
            setDocs([]);
            setSelectedDocId('');
            setStatus({ message: 'Logged out. You can now sign in with a different account.', type: 'info' });
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    const handleManualToken = async () => {
        if (!manualToken) return;
        try {
            // Use same unified parsing logic
            let token = manualToken;
            if (token.includes('access_token=')) {
                const cleanUrl = token.replace('#', '?');
                const params = new URLSearchParams(cleanUrl.includes('?') ? cleanUrl.split('?')[1] : cleanUrl);
                token = params.get('access_token') || token;
            }

            await chrome.storage.local.set({
                auth_token: token,
                token_expiry: Date.now() + 3500 * 1000
            });
            setIsAuthenticated(true);
            loadDocs();
            loadSelectedDoc();
            setStatus({ message: 'Authenticated manually!', type: 'success' });
        } catch (err: any) {
            setStatus({ message: 'Invalid token format', type: 'error' });
        }
    };

    const loadDocs = async () => {
        try {
            const result = await sendMessage({ type: 'LIST_DOCS' });
            if (result && Array.isArray(result)) {
                setDocs(result);
            }
        } catch (err: any) {
            setStatus({ message: 'Failed to load docs: ' + err.message, type: 'error' });
        }
    };

    const loadSelectedDoc = async () => {
        try {
            const doc = await sendMessage({ type: 'GET_SELECTED_DOC' });
            if (doc && doc.docId) {
                setSelectedDocId(doc.docId);
            }
        } catch (err) {
            console.error('Failed to load selected doc', err);
        }
    };

    const handleSelectDoc = async (docId: string) => {
        setSelectedDocId(docId);
        const doc = docs.find(d => d.id === docId);
        if (doc) {
            await sendMessage({ type: 'SET_SELECTED_DOC', payload: { docId: doc.id, name: doc.name } });
        }
    };

    const handleCreateDoc = async () => {
        const title = prompt('Enter new document title:');
        if (!title) return;

        setStatus({ message: 'Creating doc...', type: 'info' });
        try {
            const docId = await sendMessage({ type: 'CREATE_DOC', payload: { title } });
            await loadDocs();
            setSelectedDocId(docId);
            await sendMessage({ type: 'SET_SELECTED_DOC', payload: { docId, name: title } });
            setStatus({ message: 'Document created!', type: 'success' });
        } catch (err: any) {
            setStatus({ message: 'Create failed: ' + err.message, type: 'error' });
        }
    };

    const handleCreateAndLink = async () => {
        if (!isAuthenticated) return; // Ensure authenticated
        if (activeTab === 'create' && !newDocTitle.trim()) {
            setStatus({ message: 'Please provide a document title.', type: 'error' });
            return;
        }
        if (activeTab === 'link' && !selectedDocId) {
            setStatus({ message: 'Please select a document to link.', type: 'error' });
            return;
        }
        if (!currentIssueKey) {
            setStatus({ message: 'No Jira issue detected on this page.', type: 'error' });
            return;
        }

        setIsSyncing(true);
        setStatus({ message: activeTab === 'create' ? 'Creating doc...' : 'Linking doc...', type: 'info' });

        try {
            let docIdToLink = selectedDocId;
            let docNameToLink = '';

            if (activeTab === 'create') {
                docIdToLink = await sendMessage({
                    type: 'CREATE_DOC',
                    payload: {
                        title: newDocTitle.trim(),
                        folderId: selectedFolderId || undefined
                    }
                });
                docNameToLink = newDocTitle.trim();
            } else { // activeTab === 'link'
                const foundDoc = searchResults.find(d => d.id === selectedDocId);
                if (!foundDoc) {
                    throw new Error('Selected document not found in search results.');
                }
                docNameToLink = foundDoc.name;
            }

            // Store link for the current issue
            const links = await chrome.storage.local.get('issueDocLinks');
            const allLinks = (links.issueDocLinks || {}) as Record<string, { docId: string; name: string }>;
            allLinks[currentIssueKey] = { docId: docIdToLink, name: docNameToLink };
            await chrome.storage.local.set({ issueDocLinks: allLinks });

            // Set the selected doc globally for immediate sync
            await sendMessage({ type: 'SET_SELECTED_DOC', payload: { docId: docIdToLink, name: docNameToLink } });

            // Perform initial sync
            const res = await sendMessage({ type: 'SYNC_CURRENT_PAGE' });
            if (res?.error) throw new Error(res.error);

            setLinkedDoc({ docId: docIdToLink, name: docNameToLink });
            setShowCreateForm(false); // Assuming this form is now replaced by the tabbed UI
            setStatus({ message: `✅ Created & synced: ${res.key}`, type: 'success' });
        } catch (err: any) {
            console.error('Create/Link failed', err);
            setStatus({ message: 'Operation failed: ' + err.message, type: 'error' });
        } finally {
            setIsSyncing(false);
        }
    };

    const saveIssueLink = async (issueKey: string, docId: string) => {
        // We need a way to save this mapping in chrome.storage
        // The background script doesn't have a direct 'SAVE_ISSUE_LINK' message exposed in types yet?
        // Let's check background.ts... it has GET and CLEAR.
        // Actually, 'SET_SELECTED_DOC' in background.ts just sets a global variable?
        // Let's look at background.ts implementation provided in context earlier.
        // It seems we rely on `storage.local` directly in background.
        // For now, let's use the fact that `handleSync` uses `selectedDocId` as fallback?
        // Actually, let's look at `handleSync` in App.tsx... it sends `SYNC_CURRENT_PAGE`.
        // In background.ts, `SYNC_CURRENT_PAGE` logic:
        // 1. Get issue key. 2. Check for linked doc. 3. If no linked doc, use global `selectedDocId`.
        // 4. Then it saves the link! `await saveIssueDocLink(issue.key, docId);`
        // So yes, setting the selected doc globally then syncing will create the link.
        // BUT, for "Link Existing", we must ensure `selectedDocId` is set to the one we chose.
        // We do that above with `SET_SELECTED_DOC`.
    };

    const handleSearchDocs = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await sendMessage({ type: 'SEARCH_DOCS', payload: { query } });
            setSearchResults(results || []);
        } catch (err) {
            console.error('Search failed', err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setStatus({ message: 'Syncing...', type: 'info' });
        try {
            const res = await sendMessage({ type: 'SYNC_CURRENT_PAGE' });
            if (res?.error) throw new Error(res.error);
            const commentCount = res.commentsCount !== undefined ? ` (${res.commentsCount} comments)` : '';
            setStatus({ message: `✅ Synced: ${res.key}${commentCount}`, type: 'success' });
        } catch (err: any) {
            setStatus({ message: '❌ Sync Error: ' + err.message, type: 'error' });
        } finally {
            setIsSyncing(false);
        }
    };

    const containerStyle: React.CSSProperties = {
        padding: '20px',
        width: '320px',
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        backgroundColor: '#ffffff',
        color: '#172B4D',
    };

    const buttonStyle: React.CSSProperties = {
        backgroundColor: '#0052CC',
        color: 'white',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        width: '100%',
        marginTop: '10px',
    };

    const secondaryButtonStyle: React.CSSProperties = {
        backgroundColor: 'transparent',
        color: '#0052CC',
        border: '1px solid #0052CC',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        marginTop: '5px',
    };

    const selectStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #DFE1E6',
        marginTop: '10px',
        backgroundColor: '#FAFBFC',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#172B4D',
        display: 'block',
        marginBottom: '4px',
        marginTop: '12px'
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #DFE1E6',
        fontSize: '14px',
        boxSizing: 'border-box',
        marginBottom: '8px'
    };

    const getStatusBackgroundColor = (type: 'info' | 'success' | 'error' | 'debug') => {
        switch (type) {
            case 'error': return '#FFEBE6';
            case 'success': return '#E3FCEF';
            case 'info': return '#DEEBFF';
            case 'debug': return '#F4F5F7';
            default: return '#F4F5F7';
        }
    };

    const getStatusColor = (type: 'info' | 'success' | 'error' | 'debug') => {
        switch (type) {
            case 'error': return '#BF2600';
            case 'success': return '#006644';
            case 'info': return '#0052CC';
            case 'debug': return '#42526E';
            default: return '#42526E';
        }
    };

    if (!isAuthenticated) {
        return (
            <div style={containerStyle}>
                <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>Jira Connector</h2>
                <p style={{ fontSize: '14px', marginBottom: '15px' }}>Connect your Google Workspace to start syncing Jira issues.</p>
                <button onClick={handleLogin} style={buttonStyle}>Sign in with Google</button>
                {status.message && (
                    <div style={{
                        marginTop: '15px',
                        padding: '10px',
                        borderRadius: '4px',
                        backgroundColor: getStatusBackgroundColor(status.type),
                        color: getStatusColor(status.type),
                        fontSize: '12px',
                        lineHeight: '1.4'
                    }}>
                        {status.message}
                        {status.type === 'error' && status.message.includes('403') && (
                            <div style={{ marginTop: '8px', padding: '8px', background: '#FFF7E6', border: '1px solid #FFAB00', borderRadius: '4px', fontSize: '11px', color: '#172B4D' }}>
                                <strong>Tip:</strong> Make sure to <strong>check the checkbox</strong> on the Google permission screen to "See and edit all your Google Drive files".
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <h2 style={{ fontSize: '18px', margin: '0 0 15px 0' }}>Jira Connector</h2>

            {/* Loading State */}
            {isLoadingLink && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6B778C' }}>Loading...</div>
            )}

            {/* Not a Jira Page */}
            {!isLoadingLink && !currentIssueKey && (
                <div style={{ padding: '15px', background: '#DEEBFF', borderRadius: '4px', fontSize: '12px', color: '#0052CC' }}>
                    Navigate to a Jira issue page to sync it to Google Docs.
                </div>
            )}

            {/* State 2: Linked Page (Returning User) */}
            {!isLoadingLink && currentIssueKey && linkedDoc && (
                <div>
                    <div style={{ marginBottom: '15px', padding: '12px', background: '#E3FCEF', borderRadius: '4px' }}>
                        <div style={{ fontSize: '11px', color: '#006644', fontWeight: 'bold' }}>🔗 Linked Document</div>
                        <a
                            href={`https://docs.google.com/document/d/${linkedDoc.docId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '14px', color: '#006644', marginTop: '4px', display: 'block', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                            {linkedDoc.name} ↗
                        </a>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        style={{
                            ...buttonStyle,
                            backgroundColor: isSyncing ? '#DFE1E6' : '#0052CC',
                            cursor: isSyncing ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSyncing ? 'Syncing...' : 'Sync Issue to Doc'}
                    </button>
                </div>
            )}

            {/* State 1: Unlinked Page (First-Time User) */}
            {!isLoadingLink && currentIssueKey && !linkedDoc && (
                <div>
                    <div style={{ marginBottom: '15px', padding: '12px', background: '#FFF7E6', borderRadius: '4px' }}>
                        <div style={{ fontSize: '11px', color: '#FF991F', fontWeight: 'bold' }}>⚠️ No Linked Document</div>
                        <div style={{ fontSize: '12px', color: '#172B4D', marginTop: '4px' }}>Create a Google Doc to sync this issue.</div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        {/* Updated Create/Link UI */}
                        <div style={{
                            marginBottom: '10px',
                            display: 'flex',
                            borderBottom: '1px solid #DFE1E6'
                        }}>
                            <button
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: activeTab === 'create' ? '2px solid #0052CC' : 'none',
                                    color: activeTab === 'create' ? '#0052CC' : '#6B778C',
                                    fontWeight: activeTab === 'create' ? '600' : '400',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setActiveTab('create')}
                            >
                                New Doc
                            </button>
                            <button
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: activeTab === 'link' ? '2px solid #0052CC' : 'none',
                                    color: activeTab === 'link' ? '#0052CC' : '#6B778C',
                                    fontWeight: activeTab === 'link' ? '600' : '400',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setActiveTab('link')}
                            >
                                Link Existing
                            </button>
                        </div>

                        {activeTab === 'create' ? (
                            <>
                                <label style={labelStyle}>Document Title:</label>
                                <input
                                    type="text"
                                    value={newDocTitle}
                                    onChange={(e) => setNewDocTitle(e.target.value)}
                                    placeholder={`${currentIssueKey || 'Jira'} - ${currentIssueTitle || 'Spec'}`}
                                    style={inputStyle}
                                />

                                <label style={labelStyle}>Save to Folder:</label>
                                {/* Breadcrumbs */}
                                <div style={{
                                    marginBottom: '8px',
                                    fontSize: '12px',
                                    color: '#6B778C',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '4px',
                                    alignItems: 'center'
                                }}>
                                    <span
                                        style={{ cursor: 'pointer', color: '#0052CC' }}
                                        onClick={() => navigateUp(-1)} // -1 to go to root
                                    >
                                        My Drive
                                    </span>
                                    {folderPath.slice(1).map((folder, index) => ( // Slice to skip 'My Drive'
                                        <React.Fragment key={folder.id}>
                                            <span>/</span>
                                            <span
                                                style={{ cursor: 'pointer', color: index === folderPath.slice(1).length - 1 ? '#172B4D' : '#0052CC', fontWeight: index === folderPath.slice(1).length - 1 ? '600' : '400' }}
                                                onClick={() => navigateUp(index + 1)} // +1 to account for sliced array
                                            >
                                                {folder.name}
                                            </span>
                                        </React.Fragment>
                                    ))}
                                </div>

                                {/* Folder List */}
                                <div style={{
                                    border: '1px solid #DFE1E6',
                                    borderRadius: '4px',
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    background: '#FAFBFC'
                                }}>
                                    {folders.length === 0 ? (
                                        <div style={{ padding: '10px', fontSize: '12px', color: '#6B778C', textAlign: 'center' }}>
                                            No subfolders
                                        </div>
                                    ) : (
                                        folders.map(f => (
                                            <div
                                                key={f.id}
                                                onClick={() => navigateToFolder(f)}
                                                style={{
                                                    padding: '8px 12px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #F4F5F7',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#EBECF0'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                            >
                                                <span>📁</span> {f.name}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div style={{ fontSize: '10px', color: '#6B778C', marginTop: '4px' }}>
                                    Saving to: <strong>{folderPath.length > 0 ? folderPath[folderPath.length - 1].name : 'My Drive'}</strong>
                                </div>
                            </>
                        ) : (
                            <>
                                <label style={labelStyle}>Search Google Docs:</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchDocs(e.target.value)}
                                    placeholder="Type doc name..."
                                    style={inputStyle}
                                />

                                <div style={{
                                    border: '1px solid #DFE1E6',
                                    borderRadius: '4px',
                                    height: '150px',
                                    overflowY: 'auto',
                                    background: '#FAFBFC'
                                }}>
                                    {isSearching && <div style={{ padding: '10px', fontSize: '12px', color: '#6B778C' }}>Searching...</div>}
                                    {!isSearching && searchResults.length === 0 && searchQuery.length >= 3 && (
                                        <div style={{ padding: '10px', fontSize: '12px', color: '#6B778C' }}>No docs found</div>
                                    )}
                                    {!isSearching && searchResults.length === 0 && searchQuery.length < 3 && (
                                        <div style={{ padding: '10px', fontSize: '12px', color: '#6B778C' }}>Type at least 3 characters to search.</div>
                                    )}
                                    {!isSearching && searchResults.map(doc => (
                                        <div
                                            key={doc.id}
                                            onClick={() => setSelectedDocId(doc.id)}
                                            style={{
                                                padding: '8px 12px',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #F4F5F7',
                                                background: selectedDocId === doc.id ? '#E3FCEF' : 'none',
                                                color: selectedDocId === doc.id ? '#006644' : '#172B4D'
                                            }}
                                        >
                                            📄 {doc.name}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={handleCreateAndLink}
                        disabled={isSyncing || (activeTab === 'create' ? !newDocTitle.trim() : !selectedDocId)}
                        style={{
                            ...buttonStyle,
                            backgroundColor: (isSyncing || (activeTab === 'create' ? !newDocTitle.trim() : !selectedDocId)) ? '#DFE1E6' : '#0052CC',
                            cursor: (isSyncing || (activeTab === 'create' ? !newDocTitle.trim() : !selectedDocId)) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSyncing ? 'Processing...' : (activeTab === 'create' ? 'Create & Link Doc' : 'Link & Sync Doc')}
                    </button>
                </div>
            )}

            {/* Account Controls */}
            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={() => chrome.runtime.openOptionsPage()}
                    title="Settings"
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        color: '#6B778C',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <span style={{ fontSize: '12px' }}>Settings</span> ⚙️
                </button>
            </div>

            {status.message && (
                <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    borderRadius: '4px',
                    backgroundColor: getStatusBackgroundColor(status.type),
                    color: getStatusColor(status.type),
                    fontSize: '12px',
                    lineHeight: '1.4'
                }}>
                    {status.message}
                    {status.type === 'error' && status.message.includes('403') && (
                        <div style={{ marginTop: '8px', padding: '8px', background: '#FFF7E6', border: '1px solid #FFAB00', borderRadius: '4px', fontSize: '11px', color: '#172B4D' }}>
                            <strong>Tip:</strong> Click "Switch Account" and make sure to <strong>check the checkbox</strong> on the Google permission screen to "See and edit all your Google Drive files".
                        </div>
                    )}
                </div>
            )}

            {/* Settings Section - replaced with gear icon in controls */}
        </div >
    );
}

export default App;
