import { useState, useCallback, useMemo } from 'react';

export function useAuth(loadDocs: () => void, loadSelectedDoc: () => void) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const checkAuth = useCallback(async (retries = 3) => {
        try {
            const token = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
            setIsAuthenticated(!!token);
            if (token) {
                loadDocs();
                loadSelectedDoc();
            }
        } catch (e: any) {
            const isConnectionError = e.message?.includes('Could not establish connection') || e.message?.includes('Receiving end does not exist');
            if (isConnectionError && retries > 0) {
                console.log(`Retrying checkAuth... (${retries} left)`);
                setTimeout(() => checkAuth(retries - 1), 500);
                return;
            }
            console.error('Auth check failed after retries:', e);
        }
    }, [loadDocs, loadSelectedDoc]);

    const handleLogin = async () => {
        try {
            const token = await chrome.runtime.sendMessage({ type: 'LOGIN' });
            if (token) {
                setIsAuthenticated(true);
                loadDocs();
                loadSelectedDoc();
            }
        } catch (e) {
            console.error('Login failed:', e);
        }
    };

    const handleLogout = async () => {
        try {
            await chrome.runtime.sendMessage({ type: 'LOGOUT' });
            setIsAuthenticated(false);
        } catch (e) {
            console.error('Logout failed:', e);
        }
    };

    return useMemo(() => ({
        isAuthenticated,
        setIsAuthenticated,
        checkAuth,
        handleLogin,
        handleLogout
    }), [isAuthenticated, checkAuth]);
}
