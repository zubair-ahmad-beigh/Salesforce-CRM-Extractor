import React from 'react';

export default function TabNavigation({ activeTab, onTabChange, stats }) {
    const tabs = [
        { id: 'leads', label: 'Leads', count: stats.leads },
        { id: 'contacts', label: 'Contacts', count: stats.contacts },
        { id: 'accounts', label: 'Accounts', count: stats.accounts },
        { id: 'opportunities', label: 'Opportunities', count: stats.opportunities },
        { id: 'tasks', label: 'Tasks', count: stats.tasks }
    ];

    return (
        <div className="flex border-b border-gray-200 bg-white">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`
            flex-1 px-4 py-3 text-sm font-medium transition-colors
            ${activeTab === tab.id
                            ? 'text-salesforce-blue border-b-2 border-salesforce-blue bg-salesforce-lightblue'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }
          `}
                >
                    <div className="flex flex-col items-center gap-1">
                        <span>{tab.label}</span>
                        <span className={`
              text-xs px-2 py-0.5 rounded-full
              ${activeTab === tab.id
                                ? 'bg-salesforce-blue text-white'
                                : 'bg-gray-200 text-gray-600'
                            }
            `}>
                            {tab.count}
                        </span>
                    </div>
                </button>
            ))}
        </div>
    );
}
