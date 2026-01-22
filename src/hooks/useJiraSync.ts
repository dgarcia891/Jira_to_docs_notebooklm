import { useState, useCallback, useEffect, useMemo } from 'react';

export function useJiraSync() {
    const [currentIssueKey, setCurrentIssueKey] = useState<string | null>(null);
    const [currentIssueTitle, setCurrentIssueTitle] = useState<string | null>(null);
    const [newDocTitle, setNewDocTitle] = useState('');
    const [issueType, setIssueType] = useState<string | null>(null);
    const [linkedDoc, setLinkedDoc] = useState<{ id: string; name: string } | null>(null);
    const [lastSync, setLastSync] = useState<number | null>(null);
    const [timeAgo, setTimeAgo] = useState<string | null>(null);
    const [isLoadingLink, setIsLoadingLink] = useState(false);
    const [isEpic, setIsEpic] = useState(false);

    const refreshLastSync = useCallback(async (issueKey: string) => {
        try {
            const result = await chrome.runtime.sendMessage({
                type: 'GET_LAST_SYNC',
                payload: { issueKey }
            });
            if (result && result.time) {
                setLastSync(result.time);
                updateTimeAgo(result.time);
            } else {
                setLastSync(null);
                setTimeAgo(null);
            }
        } catch (e) {
            console.error('Failed to get last sync:', e);
        }
    }, []);

    const updateTimeAgo = useCallback((timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) setTimeAgo('Just now');
        else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
        else if (seconds < 86400) setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);
        else setTimeAgo(`${Math.floor(seconds / 86400)}d ago`);
    }, []);

    const checkCurrentPageLink = useCallback(async (retries = 3) => {
        setIsLoadingLink(true);
        try {
            const keyData = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_ISSUE_KEY' });
            if (keyData?.error || !keyData) {
                setCurrentIssueKey(null);
                setIsLoadingLink(false);
                return;
            }
            const key = keyData.key || keyData;
            setCurrentIssueKey(key);
            setCurrentIssueTitle(keyData.title || key);

            if (keyData.childKeys && keyData.childKeys.length > 0) {
                const combinedKeys = [key, ...keyData.childKeys].join(', ');
                setNewDocTitle(combinedKeys);
            } else {
                setNewDocTitle(keyData.title || key);
            }

            if (keyData.type) {
                setIssueType(keyData.type);
                setIsEpic(keyData.type.toLowerCase().includes('epic'));
            }

            const link = await chrome.runtime.sendMessage({
                type: 'GET_ISSUE_DOC_LINK',
                payload: { issueKey: key }
            });

            if (link) {
                setLinkedDoc(link);
                refreshLastSync(key);
            } else {
                setLinkedDoc(null);
            }
        } catch (e: any) {
            const isConnectionError = e.message?.includes('Could not establish connection') || e.message?.includes('Receiving end does not exist');
            if (isConnectionError && retries > 0) {
                setTimeout(() => checkCurrentPageLink(retries - 1), 500);
                return;
            }
            console.error('Page check failed:', e);
        } finally {
            setIsLoadingLink(false);
        }
    }, [refreshLastSync]);

    return useMemo(() => ({
        currentIssueKey,
        currentIssueTitle,
        newDocTitle, setNewDocTitle,
        issueType,
        linkedDoc, setLinkedDoc,
        lastSync,
        timeAgo,
        isLoadingLink,
        isEpic,
        checkCurrentPageLink,
        refreshLastSync,
        updateTimeAgo
    }), [currentIssueKey, currentIssueTitle, newDocTitle, issueType, linkedDoc, lastSync, timeAgo, isLoadingLink, isEpic, checkCurrentPageLink, refreshLastSync, updateTimeAgo]);
}
