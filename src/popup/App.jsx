import React, { useState, useMemo } from 'react';
import { useStorageData } from './hooks/useStorageData';
import TabNavigation from './components/TabNavigation';
import SearchBar from './components/SearchBar';
import DataTable from './components/DataTable';
import OpportunityStageView from './components/OpportunityStageView';
import ExportButton from './components/ExportButton';

export default function App() {
    const { data, loading, error, refresh } = useStorageData();
    const [activeTab, setActiveTab] = useState('leads');
    const [searchQuery, setSearchQuery] = useState('');
    const [extracting, setExtracting] = useState(false);

    // Calculate stats
    const stats = {
        leads: data.leads?.length || 0,
        contacts: data.contacts?.length || 0,
        accounts: data.accounts?.length || 0,
        opportunities: data.opportunities?.length || 0,
        tasks: data.tasks?.length || 0
    };

    // Filter data based on search query
    const filteredData = useMemo(() => {
        if (!searchQuery) return data[activeTab] || [];

        const query = searchQuery.toLowerCase();
        return (data[activeTab] || []).filter(record => {
            return Object.values(record).some(value => {
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(query);
            });
        });
    }, [data, activeTab, searchQuery]);

    const handleExtract = async () => {
        setExtracting(true);
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'EXTRACT_CURRENT_OBJECT'
            });

            if (!response.success) {
                alert(response.message || 'Extraction failed');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setExtracting(false);
        }
    };

    const handleDelete = async (recordId) => {
        if (!confirm('Are you sure you want to delete this record?')) {
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'DELETE_RECORD',
                objectType: activeTab,
                recordId: recordId
            });

            if (response.success) {
                refresh();
            } else {
                alert(response.message || 'Delete failed');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'CLEAR_ALL'
            });

            if (response.success) {
                refresh();
            } else {
                alert(response.message || 'Clear failed');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString;
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Define columns for each object type
    const columnConfigs = {
        leads: [
            { key: 'name', label: 'Name' },
            { key: 'company', label: 'Company' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'leadStatus', label: 'Status' }
        ],
        contacts: [
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'accountName', label: 'Account' },
            { key: 'title', label: 'Title' }
        ],
        accounts: [
            { key: 'accountName', label: 'Account Name' },
            { key: 'website', label: 'Website' },
            { key: 'phone', label: 'Phone' },
            { key: 'industry', label: 'Industry' },
            {
                key: 'annualRevenue',
                label: 'Annual Revenue',
                render: (value) => formatCurrency(value)
            }
        ],
        opportunities: [
            { key: 'opportunityName', label: 'Opportunity' },
            {
                key: 'amount',
                label: 'Amount',
                render: (value) => formatCurrency(value)
            },
            { key: 'stage', label: 'Stage' },
            {
                key: 'probability',
                label: 'Probability',
                render: (value) => value !== null ? `${value}%` : '-'
            },
            {
                key: 'closeDate',
                label: 'Close Date',
                render: (value) => formatDate(value)
            }
        ],
        tasks: [
            { key: 'subject', label: 'Subject' },
            {
                key: 'dueDate',
                label: 'Due Date',
                render: (value) => formatDate(value)
            },
            { key: 'status', label: 'Status' },
            { key: 'priority', label: 'Priority' },
            { key: 'assignedTo', label: 'Assigned To' }
        ]
    };

    const lastSyncTime = data.lastSync?.[activeTab];
    const lastSyncFormatted = lastSyncTime
        ? new Date(lastSyncTime).toLocaleString()
        : 'Never';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-salesforce-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen p-4">
                <div className="text-center text-red-600">
                    <p className="font-semibold">Error loading data</p>
                    <p className="text-sm mt-2">{error}</p>
                    <button
                        onClick={refresh}
                        className="mt-4 px-4 py-2 bg-salesforce-blue text-white rounded-lg hover:bg-salesforce-darkblue"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-salesforce-darkblue text-white px-4 py-3">
                <h1 className="text-lg font-bold">Salesforce CRM Extractor</h1>
                <p className="text-xs text-gray-300 mt-1">Extract and manage CRM data locally</p>
            </div>

            {/* Tab Navigation */}
            <TabNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                stats={stats}
            />

            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
                <div className="flex gap-2">
                    <button
                        onClick={handleExtract}
                        disabled={extracting}
                        className="flex-1 px-4 py-2 bg-salesforce-blue text-white rounded-lg hover:bg-salesforce-darkblue transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {extracting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Extracting...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                </svg>
                                Extract Current Object
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleClearAll}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        title="Clear all data"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <SearchBar onSearch={setSearchQuery} />
                    <ExportButton
                        data={filteredData}
                        objectType={activeTab}
                    />
                </div>

                <div className="text-xs text-gray-500">
                    Last sync: {lastSyncFormatted}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-white">
                {activeTab === 'opportunities' ? (
                    <OpportunityStageView
                        opportunities={filteredData}
                        onDelete={handleDelete}
                    />
                ) : (
                    <DataTable
                        data={filteredData}
                        columns={columnConfigs[activeTab]}
                        onDelete={handleDelete}
                    />
                )}
            </div>
        </div>
    );
}
