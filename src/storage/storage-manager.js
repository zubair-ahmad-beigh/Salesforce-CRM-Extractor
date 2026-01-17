/**
 * Storage Manager - Handles all chrome.storage.local operations
 * Provides deduplication, CRUD operations, and sync coordination
 */

const STORAGE_KEY = 'salesforce_data';

class StorageManager {
    constructor() {
        this.initializeStorage();
    }

    async initializeStorage() {
        const data = await this.getAllData();
        if (!data) {
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
    }

    async getAllData() {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        return result[STORAGE_KEY] || null;
    }

    async getRecords(objectType) {
        const data = await this.getAllData();
        return data?.[objectType] || [];
    }

    async saveRecords(objectType, newRecords) {
        if (!newRecords || newRecords.length === 0) {
            return { success: false, message: 'No records to save' };
        }

        const data = await this.getAllData();
        const existing = data[objectType] || [];

        // Deduplication: Create a Map with record IDs as keys
        const recordMap = new Map(existing.map(r => [r.id, r]));

        // Merge new records (newer records overwrite older ones)
        newRecords.forEach(record => {
            if (record.id) {
                recordMap.set(record.id, {
                    ...record,
                    lastUpdated: Date.now()
                });
            }
        });

        // Convert back to array
        const mergedRecords = Array.from(recordMap.values());

        // Update storage
        data[objectType] = mergedRecords;
        data.lastSync[objectType] = Date.now();

        await chrome.storage.local.set({ [STORAGE_KEY]: data });

        return {
            success: true,
            count: newRecords.length,
            total: mergedRecords.length
        };
    }

    async deleteRecord(objectType, recordId) {
        const data = await this.getAllData();
        const records = data[objectType] || [];

        const filteredRecords = records.filter(r => r.id !== recordId);

        if (filteredRecords.length === records.length) {
            return { success: false, message: 'Record not found' };
        }

        data[objectType] = filteredRecords;
        await chrome.storage.local.set({ [STORAGE_KEY]: data });

        return { success: true, message: 'Record deleted' };
    }

    async clearAll() {
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
        return { success: true, message: 'All data cleared' };
    }

    async clearObjectType(objectType) {
        const data = await this.getAllData();
        data[objectType] = [];
        delete data.lastSync[objectType];
        await chrome.storage.local.set({ [STORAGE_KEY]: data });
        return { success: true, message: `${objectType} cleared` };
    }

    async getLastSync(objectType) {
        const data = await this.getAllData();
        return data?.lastSync?.[objectType] || null;
    }

    async getStats() {
        const data = await this.getAllData();
        return {
            leads: data.leads.length,
            contacts: data.contacts.length,
            accounts: data.accounts.length,
            opportunities: data.opportunities.length,
            tasks: data.tasks.length,
            total: data.leads.length + data.contacts.length +
                data.accounts.length + data.opportunities.length +
                data.tasks.length
        };
    }
}

// Export singleton instance
const storageManager = new StorageManager();
export default storageManager;
