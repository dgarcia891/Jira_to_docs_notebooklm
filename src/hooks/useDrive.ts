import { useState, useCallback, useEffect, useMemo } from 'react';
import { Doc } from '../types';

export function useDrive() {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [folders, setFolders] = useState<Doc[]>([]);
    const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Doc[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

    const loadDocs = useCallback(async () => {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'LIST_DOCS' });
            if (response && Array.isArray(response)) {
                setDocs(response);
            }
        } catch (e) {
            console.error('Failed to load docs:', e);
        }
    }, []);

    const loadFolders = useCallback(async (parentId: string) => {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'LIST_DRIVE_FOLDERS', payload: { parentId } });
            if (response && Array.isArray(response)) {
                // Map folders to include suffix for UI compatibility
                const mapped = response.map((item: any) => ({
                    id: item.id,
                    name: item.mimeType === 'application/vnd.google-apps.folder' ? `${item.name} (Folder)` : item.name
                }));
                setFolders(mapped);
            }
        } catch (e) {
            console.error('Failed to load folders:', e);
        }
    }, []);

    const restoreLastFolder = useCallback(async () => {
        const data = await chrome.storage.local.get('last_folder_path');
        if (data.last_folder_path && Array.isArray(data.last_folder_path)) {
            setFolderPath(data.last_folder_path);
            const lastFolder = data.last_folder_path[data.last_folder_path.length - 1];
            loadFolders(lastFolder.id);
        } else {
            loadFolders('root');
        }
    }, [loadFolders]);

    const saveLastFolder = useCallback(async (path: { id: string; name: string }[]) => {
        await chrome.storage.local.set({ 'last_folder_path': path });
    }, []);

    const navigateToFolder = useCallback((folder: { id: string; name: string }) => {
        const newPath = [...folderPath, folder];
        setFolderPath(newPath);
        saveLastFolder(newPath);
        loadFolders(folder.id);
    }, [folderPath, loadFolders, saveLastFolder]);

    const navigateUp = useCallback((index: number) => {
        if (index === -1) {
            setFolderPath([]);
            saveLastFolder([]);
            loadFolders('root');
        } else {
            const newPath = folderPath.slice(0, index + 1);
            setFolderPath(newPath);
            saveLastFolder(newPath);
            loadFolders(newPath[newPath.length - 1].id);
        }
    }, [folderPath, loadFolders, saveLastFolder]);

    const handleSearchDocs = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await chrome.runtime.sendMessage({ type: 'SEARCH_DOCS', payload: { query } });

            if (results && Array.isArray(results)) {
                const mapped = results.map((item: any) => ({
                    id: item.id,
                    name: item.mimeType === 'application/vnd.google-apps.folder' ? `${item.name} (Folder)` : item.name
                }));
                setSearchResults(mapped);
            } else {
                setSearchResults([]);
            }
        } catch (e) {
            console.error('Search failed:', e);
        } finally {
            setIsSearching(false);
        }
    }, []);

    return useMemo(() => ({
        docs, setDocs,
        folders, setFolders,
        folderPath, setFolderPath,
        isSearching,
        searchResults,
        searchQuery, setSearchQuery,
        selectedDocId, setSelectedDocId,
        loadDocs,
        loadFolders,
        restoreLastFolder,
        navigateToFolder,
        navigateUp,
        handleSearchDocs
    }), [docs, folders, folderPath, isSearching, searchResults, searchQuery, selectedDocId, loadDocs, loadFolders, restoreLastFolder, navigateToFolder, navigateUp, handleSearchDocs]);
}
