import { useState, useEffect } from 'react';

/**
 * Custom hook to manage storage data
 * Loads data from chrome.storage and subscribes to changes
 */
export function useStorageData() {
    const [data, setData] = useState({
        leads: [],
        contacts: [],
        accounts: [],
        opportunities: [],
        tasks: [],
        lastSync: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await chrome.runtime.sendMessage({
                type: 'GET_STORAGE_DATA'
            });

            if (response.success) {
                setData(response.data);
                setError(null);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Listen for storage updates
        const handleMessage = (message) => {
            if (message.type === 'STORAGE_UPDATED') {
                loadData();
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);

        return () => {
            chrome.runtime.onMessage.removeListener(handleMessage);
        };
    }, []);

    return { data, loading, error, refresh: loadData };
}
