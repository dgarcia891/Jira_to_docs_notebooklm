import React from 'react';

interface Doc {
    id: string;
    name: string;
}

interface FolderBrowserProps {
    folderPath: { id: string; name: string }[];
    folders: Doc[];
    navigateToFolder: (folder: { id: string; name: string }) => void;
    navigateUp: (index: number) => void;
    selectedDocId: string | null;
    setSelectedDocId: (id: string | null) => void;
    activeTab: 'all' | 'folders';
}

export function FolderBrowser({
    folderPath,
    folders,
    navigateToFolder,
    navigateUp,
    selectedDocId,
    setSelectedDocId,
    activeTab
}: FolderBrowserProps) {
    if (activeTab !== 'folders') return null;

    return (
        <div style={{ marginTop: '10px', flex: 1, overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', background: '#f9f9f9' }}>
            <div style={{ padding: '5px', background: '#eee', borderBottom: '1px solid #ddd', fontSize: '11px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                <span style={{ cursor: 'pointer', color: '#0052cc', fontWeight: 'bold' }} onClick={() => navigateUp(-1)}>My Drive</span>
                {folderPath.map((f, i) => (
                    <React.Fragment key={f.id}>
                        <span>/</span>
                        <span
                            style={{ cursor: 'pointer', color: '#0052cc', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            onClick={() => navigateUp(i)}
                            title={f.name}
                        >
                            {f.name}
                        </span>
                    </React.Fragment>
                ))}
            </div>
            {folders.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>This folder is empty.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {folders.map(f => (
                        <div
                            key={f.id}
                            style={{
                                padding: '8px 10px',
                                borderBottom: '1px solid #eee',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: selectedDocId === f.id ? '#e6effc' : 'transparent',
                                transition: 'background 0.2s'
                            }}
                            onClick={() => {
                                if (f.name.endsWith(' (Folder)')) {
                                    navigateToFolder({ id: f.id, name: f.name.replace(' (Folder)', '') });
                                } else {
                                    setSelectedDocId(selectedDocId === f.id ? null : f.id);
                                }
                            }}
                        >
                            <span style={{ fontSize: '16px' }}>{f.name.endsWith(' (Folder)') ? '📁' : '📄'}</span>
                            <span style={{ fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.name.replace(' (Folder)', '')}
                            </span>
                            {selectedDocId === f.id && <span style={{ color: '#0052cc', fontWeight: 'bold' }}>✓</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
