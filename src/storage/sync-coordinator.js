/**
 * Sync Coordinator - Handles multi-tab synchronization
 * Prevents race conditions and broadcasts updates
 */

class SyncCoordinator {
    constructor() {
        this.tabId = null;
        this.lockTimeout = 5000; // 5 seconds
        this.initializeTabId();
        this.setupListeners();
    }

    async initializeTabId() {
        // Generate unique tab ID
        this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    setupListeners() {
        // Listen for storage changes from other tabs
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes.salesforce_data) {
                this.handleStorageChange(changes.salesforce_data);
            }
        });
    }

    handleStorageChange(change) {
        // Broadcast to all tabs that storage has been updated
        chrome.runtime.sendMessage({
            type: 'STORAGE_UPDATED',
            newValue: change.newValue,
            oldValue: change.oldValue
        }).catch(() => {
            // Ignore errors if no listeners
        });
    }

    async acquireLock() {
        const lockKey = 'storage_lock';
        const result = await chrome.storage.local.get(lockKey);
        const existingLock = result[lockKey];

        // Check if lock exists and is still valid
        if (existingLock) {
            const lockAge = Date.now() - existingLock.timestamp;
            if (lockAge < this.lockTimeout && existingLock.tabId !== this.tabId) {
                return false; // Lock held by another tab
            }
        }

        // Acquire lock
        await chrome.storage.local.set({
            [lockKey]: {
                tabId: this.tabId,
                timestamp: Date.now()
            }
        });

        return true;
    }

    async releaseLock() {
        await chrome.storage.local.remove('storage_lock');
    }

    async withLock(callback, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            const acquired = await this.acquireLock();

            if (acquired) {
                try {
                    const result = await callback();
                    return result;
                } finally {
                    await this.releaseLock();
                }
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        throw new Error('Failed to acquire lock after retries');
    }

    broadcastUpdate(objectType, data) {
        chrome.runtime.sendMessage({
            type: 'DATA_UPDATED',
            objectType,
            data,
            tabId: this.tabId
        }).catch(() => {
            // Ignore errors if no listeners
        });
    }
}

const syncCoordinator = new SyncCoordinator();
export default syncCoordinator;
