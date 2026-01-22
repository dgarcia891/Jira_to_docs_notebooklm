import React, { useState, useEffect, useCallback } from 'react';
import { StatusBanners } from './components/popup/StatusBanners';
import { LinkingTabs } from './components/popup/LinkingTabs';
import { useAuth } from './hooks/useAuth';
import { useDrive } from './hooks/useDrive';
import { useJiraSync } from './hooks/useJiraSync';
import { useSettings } from './hooks/useSettings';
import * as styles from './styles/popup';

const App: React.FC = () => {
    const [status, setStatus] = useState<{ text: string; type: 'info' | 'success' | 'error' | 'debug' } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showLinkingOptions, setShowLinkingOptions] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'folders'>('all');
    const [syncChildren, setSyncChildren] = useState(false);

    const drive = useDrive();
    const jiraSync = useJiraSync();
    const settings = useSettings();
    const noop = useCallback(() => { }, []);
    const auth = useAuth(drive.loadDocs, noop);

    const STALE_SYNC_TIMEOUT = 60 * 60 * 1000; // 1 hour

    const updateStatus = useCallback((newStatus: { text: string; type: 'info' | 'success' | 'error' | 'debug' } | null) => {
        setStatus(newStatus);
    }, []);

    const restoreSyncState = useCallback(async () => {
        // ROLLBACK: No persistence
    }, []);

    useEffect(() => {
        auth.checkAuth();
        jiraSync.checkCurrentPageLink();
        restoreSyncState();

        const timer = setInterval(() => {
            if (jiraSync.currentIssueKey) jiraSync.refreshLastSync(jiraSync.currentIssueKey);
        }, 60000);

        const listener = (msg: any) => {
            console.log('App: Received message:', msg.type);
            if (msg.type === 'SYNC_COMPLETE') {
                setIsSyncing(false);
                updateStatus({ text: 'Sync Complete!', type: 'success' });
                if (jiraSync.currentIssueKey) jiraSync.refreshLastSync(jiraSync.currentIssueKey);
            } else if (msg.type === 'SYNC_ERROR') {
                setIsSyncing(false);
                updateStatus({ text: `Error: ${msg.payload.message}`, type: 'error' });
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => {
            chrome.runtime?.onMessage?.removeListener?.(listener);
            clearInterval(timer);
        };
    }, [jiraSync.currentIssueKey, jiraSync.refreshLastSync, auth.checkAuth, restoreSyncState]);

    const handleSync = async () => {
        setIsSyncing(true);
        updateStatus({ text: 'Syncing...', type: 'info' });
        try {
            const result = await chrome.runtime.sendMessage({ type: 'SYNC_CURRENT_PAGE' });
            if (result.error) throw new Error(result.error);

            setIsSyncing(false);
            updateStatus({ text: 'Sync Complete!', type: 'success' });
            if (jiraSync.currentIssueKey) jiraSync.refreshLastSync(jiraSync.currentIssueKey);
        } catch (err: any) {
            updateStatus({ text: `Sync Error: ${err.message}`, type: 'error' });
            setIsSyncing(false);
        }
    };

    const handleEpicSync = async () => {
        if (!jiraSync.currentIssueKey) return;
        setIsSyncing(true);
        updateStatus({ text: 'Syncing Epic & Children...', type: 'info' });
        try {
            const result = await chrome.runtime.sendMessage({
                type: 'SYNC_EPIC',
                payload: { epicKey: jiraSync.currentIssueKey }
            });
            if (result.error) throw new Error(result.error);

            setIsSyncing(false);
            updateStatus({ text: `Bulk Sync Complete!`, type: 'success' });
            if (jiraSync.currentIssueKey) jiraSync.refreshLastSync(jiraSync.currentIssueKey);
        } catch (err: any) {
            updateStatus({ text: `Bulk Sync Error: ${err.message}`, type: 'error' });
            setIsSyncing(false);
        }
    };

    const handleCreateAndLink = async (forceSyncChildren?: boolean) => {
        if (!jiraSync.currentIssueKey) return;
        setIsSyncing(true);
        try {
            let docIdToLink = drive.selectedDocId;
            let docNameToLink = '';

            if (activeTab === 'all') { // LinkingTabs 'all' corresponds to 'create' logic
                const folderId = drive.folderPath.length > 0 ? drive.folderPath[drive.folderPath.length - 1].id : undefined;
                docIdToLink = await chrome.runtime.sendMessage({
                    type: 'CREATE_DOC',
                    payload: { title: jiraSync.newDocTitle.trim(), folderId }
                });
                docNameToLink = jiraSync.newDocTitle.trim();
            } else {
                const found = drive.searchResults.find(d => d.id === drive.selectedDocId);
                docNameToLink = found?.name || 'Linked Doc';
            }

            await chrome.runtime.sendMessage({ type: 'SET_SELECTED_DOC', payload: { docId: docIdToLink, name: docNameToLink } });

            if (syncChildren || forceSyncChildren) {
                await handleEpicSync();
            } else {
                await handleSync();
            }
            setShowLinkingOptions(false);
        } catch (err: any) {
            updateStatus({ text: `Operation failed: ${err.message}`, type: 'error' });
            setIsSyncing(false);
        }
    };

    if (!auth.isAuthenticated) {
        return (
            <div style={styles.containerStyle}>
                <h2 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>Jira Connector</h2>
                <div style={{ padding: '20px', textAlign: 'center', background: '#F4F5F7', borderRadius: '8px' }}>
                    <p style={{ fontSize: '14px', color: '#42526E', marginBottom: '20px' }}>
                        Connect your Google account to sync Jira issues directly to NotebookLM.
                    </p>
                    <button onClick={auth.handleLogin} style={styles.buttonStyle}>
                        Sign in with Google
                    </button>
                </div>
                {status && (
                    <div style={{ marginTop: '20px' }}>
                        <StatusBanners
                            status={status}
                            getStatusBackgroundColor={styles.getStatusBackgroundColor}
                            getStatusColor={styles.getStatusColor}
                            onClose={() => updateStatus(null)}
                        />
                    </div>
                )}
            </div>
        );
    }

    if (jiraSync.isLoadingLink) {
        return (
            <div style={styles.containerStyle}>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
                    <div style={{ fontSize: '14px', color: '#6B778C' }}>Loading page info...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.containerStyle}>

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '10px', color: '#6B778C', fontWeight: 'bold' }}>v4.8.22</span>
                <h2 style={{ fontSize: '18px', margin: 0, color: '#172B4D' }}>Jira Connector</h2>
                <button onClick={auth.handleLogout} style={{ ...styles.secondaryButtonStyle, marginTop: 0, padding: '4px 8px' }}>Logout</button>
            </header>

            <StatusBanners
                status={status}
                getStatusBackgroundColor={styles.getStatusBackgroundColor}
                getStatusColor={styles.getStatusColor}
                onClose={() => updateStatus(null)}
            />

            {!jiraSync.currentIssueKey ? (
                <div style={{ padding: '20px', background: '#DEEBFF', borderRadius: '8px', textAlign: 'center' }}>
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
                    labelStyle={styles.labelStyle}
                    inputStyle={styles.inputStyle}
                    buttonStyle={styles.buttonStyle}
                    isEpic={jiraSync.isEpic}
                />
            ) : (
                <div>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '4px' }}>CURRENT ISSUE</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#172B4D' }}>
                            {jiraSync.currentIssueKey}: {jiraSync.currentIssueTitle}
                        </div>
                    </div>

                    {jiraSync.linkedDoc ? (
                        <div style={{
                            marginBottom: '20px',
                            padding: '12px',
                            background: '#E3FCEF',
                            borderRadius: '8px',
                            border: '1px solid #36B37E'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#006644', textTransform: 'uppercase' }}>🔗 Linked Document</div>
                                    <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: 'bold', color: '#006644' }}>{jiraSync.linkedDoc.name}</div>
                                </div>
                                <a
                                    href={`https://docs.google.com/document/d/${jiraSync.linkedDoc.id || (jiraSync.linkedDoc as any).docId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        fontSize: '11px',
                                        color: '#006644',
                                        fontWeight: 'bold',
                                        textDecoration: 'underline',
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
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#FFF7E6', borderRadius: '8px', border: '1px solid #FFAB00' }}>
                            <div style={{ fontSize: '12px', color: '#824100' }}>No document linked yet.</div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            style={{ ...styles.buttonStyle, marginTop: 0, flex: 1 }}
                        >
                            {isSyncing ? 'Syncing...' : 'Sync Individual'}
                        </button>

                        {jiraSync.isEpic && (
                            <button
                                onClick={handleEpicSync}
                                disabled={isSyncing}
                                style={{ ...styles.buttonStyle, marginTop: 0, flex: 1, backgroundColor: '#0065FF' }}
                            >
                                {isSyncing ? 'Syncing...' : 'Sync All'}
                            </button>
                        )}
                    </div>

                    <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '15px', borderTop: '1px solid #EBECF0', paddingTop: '15px' }}>
                        <button
                            onClick={() => setShowLinkingOptions(true)}
                            style={styles.textLinkStyle}
                        >
                            Change Link
                        </button>
                        <button
                            onClick={() => chrome.runtime.openOptionsPage()}
                            style={styles.textLinkStyle}
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
