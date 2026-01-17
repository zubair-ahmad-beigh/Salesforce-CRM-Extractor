/**
 * Service Worker (Background Script)
 * Handles message passing and storage coordination
 */

// Import storage manager (note: in service worker context, we need to handle imports differently)
// For now, we'll inline the storage logic

const STORAGE_KEY = 'salesforce_data';

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async () => {
    console.log('[Service Worker] Extension installed');

    // Initialize storage structure
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (!result[STORAGE_KEY]) {
        await chrome.storage.local.set({
            [STORAGE_KEY]: {
                leads: [],
                contacts: [],
                accounts: [],
                opportunities: [],
                tasks: [],
                lastSync: {}
            }
        });
    }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Service Worker] Received message:', message.type);

    switch (message.type) {
        case 'EXTRACTION_COMPLETE':
            handleExtractionComplete(message, sendResponse);
            return true; // Keep channel open

        case 'GET_STORAGE_DATA':
            handleGetStorageData(message, sendResponse);
            return true;

        case 'DELETE_RECORD':
            handleDeleteRecord(message, sendResponse);
            return true;

        case 'CLEAR_OBJECT_TYPE':
            handleClearObjectType(message, sendResponse);
            return true;

        case 'CLEAR_ALL':
            handleClearAll(sendResponse);
            return true;

        case 'EXTRACT_CURRENT_OBJECT':
            handleExtractRequest(sender, sendResponse);
            return true;

        default:
            sendResponse({ success: false, message: 'Unknown message type' });
    }
});

async function handleExtractionComplete(message, sendResponse) {
    try {
        const { objectType, records, pageInfo } = message;

        // Get existing data
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const data = result[STORAGE_KEY];

        // Deduplication
        const existing = data[objectType] || [];
        const recordMap = new Map(existing.map(r => [r.id, r]));

        // Merge new records
        records.forEach(record => {
            if (record.id) {
                recordMap.set(record.id, {
                    ...record,
                    lastUpdated: Date.now()
                });
            }
        });

        // Update storage
        data[objectType] = Array.from(recordMap.values());
        data.lastSync[objectType] = Date.now();

        await chrome.storage.local.set({ [STORAGE_KEY]: data });

        console.log(`[Service Worker] Saved ${records.length} ${objectType}, total: ${data[objectType].length}`);

        sendResponse({
            success: true,
            count: records.length,
            total: data[objectType].length
        });

        // Broadcast update to all tabs
        broadcastUpdate(objectType, data[objectType]);

    } catch (error) {
        console.error('[Service Worker] Error saving data:', error);
        sendResponse({ success: false, message: error.message });
    }
}

async function handleGetStorageData(message, sendResponse) {
    try {
        const { objectType } = message;
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const data = result[STORAGE_KEY];

        if (objectType) {
            sendResponse({
                success: true,
                data: data[objectType] || [],
                lastSync: data.lastSync[objectType] || null
            });
        } else {
            sendResponse({
                success: true,
                data: data
            });
        }
    } catch (error) {
        console.error('[Service Worker] Error getting data:', error);
        sendResponse({ success: false, message: error.message });
    }
}

async function handleDeleteRecord(message, sendResponse) {
    try {
        const { objectType, recordId } = message;
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const data = result[STORAGE_KEY];

        const records = data[objectType] || [];
        const filteredRecords = records.filter(r => r.id !== recordId);

        if (filteredRecords.length === records.length) {
            sendResponse({ success: false, message: 'Record not found' });
            return;
        }

        data[objectType] = filteredRecords;
        await chrome.storage.local.set({ [STORAGE_KEY]: data });

        sendResponse({ success: true, message: 'Record deleted' });

        // Broadcast update
        broadcastUpdate(objectType, data[objectType]);

    } catch (error) {
        console.error('[Service Worker] Error deleting record:', error);
        sendResponse({ success: false, message: error.message });
    }
}

async function handleClearObjectType(message, sendResponse) {
    try {
        const { objectType } = message;
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const data = result[STORAGE_KEY];

        data[objectType] = [];
        delete data.lastSync[objectType];

        await chrome.storage.local.set({ [STORAGE_KEY]: data });

        sendResponse({ success: true, message: `${objectType} cleared` });

        // Broadcast update
        broadcastUpdate(objectType, []);

    } catch (error) {
        console.error('[Service Worker] Error clearing object type:', error);
        sendResponse({ success: false, message: error.message });
    }
}

async function handleClearAll(sendResponse) {
    try {
        await chrome.storage.local.set({
            [STORAGE_KEY]: {
                leads: [],
                contacts: [],
                accounts: [],
                opportunities: [],
                tasks: [],
                lastSync: {}
            }
        });

        sendResponse({ success: true, message: 'All data cleared' });

    } catch (error) {
        console.error('[Service Worker] Error clearing all:', error);
        sendResponse({ success: false, message: error.message });
    }
}

async function handleExtractRequest(sender, sendResponse) {
    try {
        // Forward to content script in the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            sendResponse({ success: false, message: 'No active tab found' });
            return;
        }

        // Check if tab URL is a Salesforce page
        const url = tab.url || '';
        const isSalesforcePage = url.includes('salesforce.com') ||
            url.includes('lightning.force.com') ||
            url.includes('my.salesforce.com');

        if (!isSalesforcePage) {
            sendResponse({
                success: false,
                message: 'Please navigate to a Salesforce page first'
            });
            return;
        }

        console.log('[Service Worker] Sending extract request to tab:', tab.id, url);

        // Send message to content script with error handling
        chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CURRENT_OBJECT' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Service Worker] Error:', chrome.runtime.lastError.message);
                sendResponse({
                    success: false,
                    message: 'Content script not loaded. Please refresh the Salesforce page and try again.'
                });
            } else if (!response) {
                console.warn('[Service Worker] No response from content script');
                sendResponse({
                    success: false,
                    message: 'No response from content script. Please refresh the page.'
                });
            } else {
                sendResponse(response);
            }
        });

    } catch (error) {
        console.error('[Service Worker] Error forwarding extract request:', error);
        sendResponse({ success: false, message: error.message });
    }
}

function broadcastUpdate(objectType, data) {
    // Send message to all tabs
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                type: 'STORAGE_UPDATED',
                objectType: objectType,
                data: data
            }).catch(() => {
                // Ignore errors for tabs without content script
            });
        });
    });

    // Also notify popup if open
    chrome.runtime.sendMessage({
        type: 'STORAGE_UPDATED',
        objectType: objectType,
        data: data
    }).catch(() => {
        // Popup might not be open
    });
}

console.log('[Service Worker] Loaded successfully');
