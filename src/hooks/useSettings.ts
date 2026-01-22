import { useState, useCallback, useEffect, useMemo } from 'react';

export function useSettings() {
    const [jiraApiToken, setJiraApiToken] = useState('');
    const [jiraEmail, setJiraEmail] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    const loadJiraSettings = useCallback(async () => {
        const result = await chrome.storage.local.get(['jira_api_token', 'jira_email']);
        if (result.jira_api_token) setJiraApiToken(String(result.jira_api_token));
        if (result.jira_email) setJiraEmail(String(result.jira_email));
    }, []);

    const saveJiraSettings = useCallback(async () => {
        await chrome.storage.local.set({ jira_api_token: jiraApiToken, jira_email: jiraEmail });
    }, [jiraApiToken, jiraEmail]);

    useEffect(() => {
        loadJiraSettings();
    }, [loadJiraSettings]);

    return useMemo(() => ({
        jiraApiToken, setJiraApiToken,
        jiraEmail, setJiraEmail,
        showSettings, setShowSettings,
        saveJiraSettings
    }), [jiraApiToken, jiraEmail, showSettings, saveJiraSettings]);
}
