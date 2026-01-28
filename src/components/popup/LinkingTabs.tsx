import React from 'react';
import { FolderBrowser } from './FolderBrowser';

interface Doc {
    id: string;
    name: string;
}

interface LinkingTabsProps {
    activeTab: 'all' | 'folders';
    setActiveTab: (tab: 'all' | 'folders') => void;
    newDocTitle: string;
    setNewDocTitle: (val: string) => void;
    currentIssueKey: string | null;
    currentIssueTitle: string | null;
    folderPath: { id: string; name: string }[];
    folders: Doc[];
    navigateToFolder: (folder: { id: string; name: string }) => void;
    navigateUp: (index: number) => void;
    searchQuery: string;
    setSearchQuery?: (val: string) => void;
    handleSearchDocs: (query: string) => void;
    isSearching: boolean;
    searchResults: Doc[];
    selectedDocId: string | null;
    setSelectedDocId: (id: string | null) => void;
    handleCreateAndLink: (forceSyncChildren?: boolean) => void;
    isSyncing: boolean;
    labelStyle: React.CSSProperties;
    inputStyle: React.CSSProperties;
    buttonStyle: React.CSSProperties;
    syncChildren: boolean;
    setSyncChildren: (val: boolean) => void;
    isEpic: boolean;
}

export function LinkingTabs({
    activeTab,
    setActiveTab,
    newDocTitle,
    setNewDocTitle,
    currentIssueKey,
    currentIssueTitle,
    folderPath,
    folders,
    navigateToFolder,
    navigateUp,
    searchQuery,
    handleSearchDocs,
    isSearching,
    searchResults,
    selectedDocId,
    setSelectedDocId,
    handleCreateAndLink,
    isSyncing,
    labelStyle,
    inputStyle,
    buttonStyle,
    syncChildren,
    setSyncChildren,
    isEpic
}: LinkingTabsProps) {
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }} className="fade-in">
            <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '10px' }}>
                <div
                    style={{ padding: '8px 15px', cursor: 'pointer', borderBottom: activeTab === 'all' ? '2px solid #0052cc' : 'none', fontWeight: activeTab === 'all' ? 'bold' : 'normal', flex: 1, textAlign: 'center' }}
                    onClick={() => setActiveTab('all')}
                >
                    Create New
                </div>
                <div
                    style={{ padding: '8px 15px', cursor: 'pointer', borderBottom: activeTab === 'folders' ? '2px solid #0052cc' : 'none', fontWeight: activeTab === 'folders' ? 'bold' : 'normal', flex: 1, textAlign: 'center' }}
                    onClick={() => setActiveTab('folders')}
                >
                    Browse Folders
                </div>
            </div>

            {activeTab === 'all' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                        <label className="label">Document Title</label>
                        <input
                            className="input"
                            value={newDocTitle}
                            onChange={(e) => setNewDocTitle(e.target.value)}
                            placeholder="Enter new document title..."
                        />
                    </div>
                    {isEpic && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#eef3fc', borderRadius: '4px', border: '1px solid #d0e0f8' }}>
                            <input
                                type="checkbox"
                                id="sync-children"
                                checked={syncChildren}
                                onChange={(e) => setSyncChildren(e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="sync-children" style={{ fontSize: '12px', cursor: 'pointer', color: '#172b4d', fontWeight: '500' }}>
                                Also sync all child tickets (Bulk Sync)
                            </label>
                        </div>
                    )}
                    <button
                        className={`btn ${syncChildren ? 'btn-success' : 'btn-primary'}`}
                        style={{ marginTop: '5px' }}
                        onClick={() => handleCreateAndLink()}
                        disabled={isSyncing || !newDocTitle.trim()}
                    >
                        {isSyncing ? 'Processing...' : syncChildren ? 'Create & Sync Epic + Children' : 'Create & Link'}
                    </button>
                    {!syncChildren && (
                        <p style={{ fontSize: '11px', color: '#666', margin: '0', textAlign: 'center' }}>
                            {currentIssueKey ? `Creating a new doc to store ${currentIssueKey}.` : 'Create a new doc and select it.'}
                        </p>
                    )}
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="input"
                            style={{ paddingLeft: '30px' }}
                            placeholder="Search docs or folders..."
                            value={searchQuery}
                            onChange={(e) => handleSearchDocs(e.target.value)}
                        />
                        <span style={{ position: 'absolute', left: '10px', top: '9px', opacity: 0.5 }}>🔍</span>
                        {isSearching && (
                            <div style={{ position: 'absolute', right: '10px', top: '10px' }}>
                                <div className="spinner-small"></div>
                            </div>
                        )}
                    </div>

                    <FolderBrowser
                        folderPath={folderPath}
                        folders={folders}
                        navigateToFolder={navigateToFolder}
                        navigateUp={navigateUp}
                        selectedDocId={selectedDocId}
                        setSelectedDocId={setSelectedDocId}
                        activeTab={activeTab}
                    />

                    <button
                        className="btn btn-primary"
                        style={{ marginTop: '10px' }}
                        onClick={() => handleCreateAndLink()}
                        disabled={!selectedDocId || isSyncing}
                    >
                        {isSyncing ? 'Linking...' : 'Link Selected Doc'}
                    </button>
                </div>
            )}
        </div>
    );
}
