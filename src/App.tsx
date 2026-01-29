import React, { useState, useEffect, useCallback } from 'react';
import { StatusBanners } from './components/popup/StatusBanners';
import { LinkingTabs } from './components/popup/LinkingTabs';
import { useAuth } from './hooks/useAuth';
import { useDrive } from './hooks/useDrive';
import { useJiraSync } from './hooks/useJiraSync';
import { useSettings } from './hooks/useSettings';
import './App.css';

import { ProgressBar } from './components/popup/ProgressBar';

interface SyncState {
    isSyncing: boolean;
    progress: number;
    status: string;
    result?: { status: string; message: string; time: number };
    key?: string;
}

const App: React.FC = () => {
    const [status, setStatus] = useState<{ text: string; type: 'info' | 'success' | 'error' | 'debug' } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncStatusText, setSyncStatusText] = useState('');
    const [showLinkingOptions, setShowLinkingOptions] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'folders'>('all');
    const [syncChildren, setSyncChildren] = useState(false);
    const [pendingLink, setPendingLink] = useState<{ id: string; name: string } | null>(null);

    const drive = useDrive();
    const jiraSync = useJiraSync();
    const settings = useSettings();
    const noop = useCallback(() => { }, []);
    const auth = useAuth(drive.loadDocs, noop);

    const checkPendingLink = useCallback(async () => {
        const result = await chrome.storage.local.get('selectedDoc');
        const selectedDoc = result.selectedDoc as { id: string; name: string } | undefined;
        if (selectedDoc && selectedDoc.name) {
            setPendingLink(selectedDoc);
        } else {
            setPendingLink(null);
        }
    }, []);

    const updateStatus = useCallback((newStatus: { text: string; type: 'info' | 'success' | 'error' | 'debug' } | null) => {
        setStatus(newStatus);
    }, []);

    const resumeSyncState = useCallback(async () => {
        const result = await chrome.storage.local.get('activeSyncState');
        const activeSyncState = result.activeSyncState as SyncState | undefined;

        if (activeSyncState) {
            // Strict Check: Only show state if it matches current issue or is generic 'pending'
            if (activeSyncState.key && activeSyncState.key !== jiraSync.currentIssueKey && activeSyncState.key !== 'pending') {
                return;
            }

            setIsSyncing(activeSyncState.isSyncing);
            setSyncProgress(activeSyncState.progress);
            setSyncStatusText(activeSyncState.status);

            if (!activeSyncState.isSyncing && activeSyncState.result) {
                updateStatus({
                    text: activeSyncState.result.message,
                    type: activeSyncState.result.status as any
                });
                // Clear the state so it doesn't show again on next open unless a new sync starts
                await chrome.storage.local.remove('activeSyncState');
            }
        }
    }, [updateStatus, jiraSync.currentIssueKey]);

    useEffect(() => {
        // Cleanup stale selection state on mount to prevent cross-issue pollution
        try {
            if (typeof chrome !== 'undefined' && chrome?.storage?.local?.remove) {
                chrome.storage.local.remove('selectedDoc').catch(() => { });
            }
        } catch (e) {
            // Ignore errors in environments where chrome is not defined
        }

        auth.checkAuth();
        jiraSync.checkCurrentPageLink();
        resumeSyncState();
        checkPendingLink();

        const timer = setInterval(() => {
            if (jiraSync.currentIssueKey) jiraSync.refreshLastSync(jiraSync.currentIssueKey);
        }, 60000);

        const listener = (msg: any) => {
            if (msg.type === 'SYNC_STATE_UPDATE') {
                const state = msg.payload;

                // Strict Check: Ignore updates for other issues
                if (state.key && state.key !== jiraSync.currentIssueKey && state.key !== 'pending') {
                    return;
                }

                setIsSyncing(state.isSyncing);
                setSyncProgress(state.progress);
                setSyncStatusText(state.status);

                if (!state.isSyncing && state.result) {
                    setSyncProgress(0);
                    updateStatus({
                        text: state.result.message,
                        type: state.result.status as any
                    });
                    checkPendingLink(); // Re-check
                    // Refresh link state if it was a success
                    if (state.result.status === 'success') {
                        jiraSync.checkCurrentPageLink();
                    }
                    // Clear storage so it doesn't show again on next open
                    if (chrome?.storage?.local) {
                        chrome.storage.local.remove('activeSyncState');
                    }
                }
            } else if (msg.type === 'SYNC_COMPLETE') {
                setIsSyncing(false);
                setSyncProgress(100);
                updateStatus({ text: 'Sync Complete!', type: 'success' });
                checkPendingLink();
                jiraSync.checkCurrentPageLink();
                if (chrome?.storage?.local) {
                    chrome.storage.local.remove('activeSyncState');
                }
            } else if (msg.type === 'SYNC_ERROR') {
                setIsSyncing(false);
                setSyncProgress(0);
                updateStatus({ text: `Error: ${msg.payload.message}`, type: 'error' });
                checkPendingLink();
                if (chrome?.storage?.local) {
                    chrome.storage.local.remove('activeSyncState');
                }
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => {
            chrome.runtime?.onMessage?.removeListener?.(listener);
            clearInterval(timer);
        };
    }, [jiraSync.currentIssueKey, jiraSync.refreshLastSync, auth.checkAuth, resumeSyncState, updateStatus, checkPendingLink]);

    const handleSync = async (bypassLinkCheck = false) => {
        // If not linked and no pending link, open linking options instead of failing
        // We skip this check if bypassLinkCheck is true (called from handleCreateAndLink)
        if (!bypassLinkCheck && !jiraSync.linkedDoc && !pendingLink) {
            setShowLinkingOptions(true);
            return;
        }

        setIsSyncing(true);
        setSyncProgress(10);
        setSyncStatusText('Initializing...');
        try {
            const response = await chrome.runtime.sendMessage({ type: 'SYNC_CURRENT_PAGE' });
            if (response && response.error) throw new Error(response.error);
        } catch (err: any) {
            const errorMessage = err?.message || '';
            if (errorMessage.includes('context invalidated')) {
                setSyncStatusText('Extension updated. Please refresh page.');
            }
        } finally {
            setIsSyncing(false);
            setSyncProgress(0);
        }
    };

    const handleEpicSync = async () => {
        if (!jiraSync.currentIssueKey) return;
        setIsSyncing(true);
        setSyncProgress(5);
        setSyncStatusText('Starting Bulk Sync...');
        try {
            const epicResponse = await chrome.runtime.sendMessage({
                type: 'SYNC_EPIC',
                payload: { epicKey: jiraSync.currentIssueKey }
            });
            if (epicResponse && epicResponse.error) throw new Error(epicResponse.error);
        } catch (err: any) {
            // Error is handled by background update
        } finally {
            setIsSyncing(false);
            setSyncProgress(0);
        }
    };

    const handleCopy = async () => {
        setIsSyncing(true);
        setSyncStatusText('Extracting for copy...');
        try {
            const text = await chrome.runtime.sendMessage({ type: 'EXTRACT_FOR_COPY' });
            await navigator.clipboard.writeText(text);
            updateStatus({ text: 'Copied to clipboard!', type: 'success' });
        } catch (err: any) {
            updateStatus({ text: `Copy failed: ${err.message}`, type: 'error' });
        } finally {
            setIsSyncing(false);
            setSyncStatusText('');
        }
    };

    const handleCancelPending = async () => {
        await chrome.runtime.sendMessage({ type: 'REMOVE_SELECTED_DOC' });
        // Also remove locally to be sure, though message handler typically handles storage
        await chrome.storage.local.remove('selectedDoc');
        setPendingLink(null);
    };

    const handleCreateAndLink = async (forceSyncChildren?: boolean) => {
        if (!jiraSync.currentIssueKey) return;
        setIsSyncing(true);
        setSyncProgress(5);
        setSyncStatusText('Preparing document...');
        try {
            let docIdToLink = drive.selectedDocId;
            let docNameToLink = '';

            if (activeTab === 'all') { // LinkingTabs 'all' corresponds to 'create' logic
                const folderId = drive.folderPath.length > 0 ? drive.folderPath[drive.folderPath.length - 1].id : undefined;
                const response = await chrome.runtime.sendMessage({
                    type: 'CREATE_DOC',
                    payload: { title: jiraSync.newDocTitle.trim(), folderId }
                });
                if (response && response.error) throw new Error(response.error);
                docIdToLink = response;
                docNameToLink = jiraSync.newDocTitle.trim();
            } else {
                const found = drive.searchResults.find(d => d.id === drive.selectedDocId) ||
                    drive.folders.find(d => d.id === drive.selectedDocId);
                docNameToLink = found?.name || 'Linked Doc';
            }

            const setResponse = await chrome.runtime.sendMessage({ type: 'SET_SELECTED_DOC', payload: { id: docIdToLink, name: docNameToLink } });
            if (setResponse && setResponse.error) throw new Error(setResponse.error);
            setPendingLink({ id: docIdToLink as string, name: docNameToLink });

            if (syncChildren || forceSyncChildren) {
                await handleEpicSync();
            } else {
                await handleSync(true);
            }
            setShowLinkingOptions(false);
        } catch (err: any) {
            updateStatus({ text: `Operation failed: ${err.message}`, type: 'error' });
            setIsSyncing(false);
            setSyncProgress(0);
            setSyncStatusText('');
        }
    };

    return (
        <div className="app-container">
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="version-badge">v9.5.30</span>
                    <button
                        onClick={() => jiraSync.checkCurrentPageLink()}
                        className="icon-btn"
                        title="Refresh page info"
                        disabled={isSyncing}
                    >
                        🔄
                    </button>
                </div>
                {auth.isAuthenticated && (
                    <button
                        onClick={auth.handleLogout}
                        className="text-link"
                    >
                        Logout
                    </button>
                )}
            </header>

            <StatusBanners
                status={status}
                onClose={() => updateStatus(null)}
            />

            {(isSyncing || syncProgress > 0) && (
                <ProgressBar progress={syncProgress} status={syncStatusText} />
            )}

            {!auth.isAuthenticated ? (
                <div style={{ textAlign: 'center', paddingTop: '40px' }} className="fade-in">
                    <h2 style={{ marginBottom: '20px' }}>Jira to NotebookLM</h2>
                    <p style={{ color: '#666', marginBottom: '30px' }}>Connect your Google account to start syncing Jira issues to Docs.</p>
                    <button
                        onClick={auth.handleLogin}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                    >
                        Login with Google
                    </button>
                </div>
            ) : jiraSync.isLoadingLink ? (
                <div className="loading-state">
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
                    <div style={{ fontSize: '14px', color: '#6B778C' }}>Loading page info...</div>
                </div>
            ) : !jiraSync.currentIssueKey ? (
                <div className="card card-info-blue">
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>ℹ️</div>
                    <p style={{ fontSize: '13px', color: '#0747A6', margin: 0 }}>
                        Navigate to a Jira issue page to start syncing.
                    </p>
                </div>
            ) : showLinkingOptions ? (
                <LinkingTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    newDocTitle={jiraSync.newDocTitle}
                    setNewDocTitle={jiraSync.setNewDocTitle}
                    currentIssueKey={jiraSync.currentIssueKey}
                    currentIssueTitle={jiraSync.currentIssueTitle}
                    searchQuery={drive.searchQuery}
                    handleSearchDocs={drive.handleSearchDocs}
                    isSearching={drive.isSearching}
                    searchResults={drive.searchResults}
                    selectedDocId={drive.selectedDocId}
                    setSelectedDocId={drive.setSelectedDocId}
                    folders={drive.folders}
                    folderPath={drive.folderPath}
                    navigateToFolder={drive.navigateToFolder}
                    navigateUp={drive.navigateUp}
                    isSyncing={isSyncing}
                    syncChildren={syncChildren}
                    setSyncChildren={setSyncChildren}
                    handleCreateAndLink={handleCreateAndLink}
                    labelStyle={{}}
                    inputStyle={{}}
                    buttonStyle={{}}
                    isEpic={jiraSync.isEpic}
                />
            ) : (
                <div className="fade-in">
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="label">Current Issue</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#172B4D' }}>
                                {jiraSync.currentIssueKey}: {jiraSync.currentIssueTitle}
                            </div>
                        </div>
                        <button
                            onClick={handleCopy}
                            title="Copy issue details"
                            disabled={isSyncing}
                            className="icon-btn"
                        >
                            📋
                        </button>
                    </div>

                    {pendingLink ? (
                        <div className="card card-pending">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>New Link Pending: <b>{pendingLink.name}</b></div>
                                <button
                                    onClick={handleCancelPending}
                                    className="icon-btn"
                                    style={{ padding: '0 4px', fontSize: '14px' }}
                                    title="Cancel pending link"
                                >
                                    ✕
                                </button>
                            </div>
                            <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>Sync to confirm and save this link.</div>
                        </div>
                    ) : jiraSync.linkedDoc ? (
                        <div className="card card-info">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#006644', textTransform: 'uppercase' }}>🔗 Linked Document</div>
                                    <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: 'bold', color: '#006644' }}>{jiraSync.linkedDoc.name}</div>
                                </div>
                                <a
                                    href={`https://docs.google.com/document/d/${jiraSync.linkedDoc.id || (jiraSync.linkedDoc as any).docId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-link"
                                    style={{
                                        color: '#006644',
                                        background: '#E3FCEF',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #36B37E'
                                    }}
                                >
                                    Open
                                </a>
                            </div>
                            {jiraSync.timeAgo && (
                                <div style={{ fontSize: '10px', marginTop: '6px', color: '#006644', opacity: 0.8 }}>
                                    Last synced: {jiraSync.timeAgo}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card card-warning">
                            <div style={{ fontSize: '12px', color: '#824100' }}>No document linked yet.</div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <button
                            onClick={() => handleSync()}
                            disabled={isSyncing}
                            className={`btn ${(jiraSync.lastSyncType === 'single' || !jiraSync.lastSyncType) ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1 }}
                        >
                            {isSyncing ? 'Syncing...' : (!jiraSync.linkedDoc && !pendingLink) ? 'Link & Sync' : 'Sync Individual'}
                        </button>

                        {jiraSync.isEpic && (
                            <button
                                onClick={handleEpicSync}
                                disabled={isSyncing}
                                className={`btn ${(jiraSync.lastSyncType === 'bulk') ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1 }}
                            >
                                {isSyncing ? 'Syncing...' : 'Sync All'}
                            </button>
                        )}
                    </div>

                    <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '15px', borderTop: '1px solid #EBECF0', paddingTop: '15px' }}>
                        <button
                            onClick={() => setShowLinkingOptions(true)}
                            className="text-link"
                        >
                            Change Link
                        </button>
                        <button
                            onClick={() => chrome.runtime.openOptionsPage()}
                            className="text-link"
                        >
                            Settings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
