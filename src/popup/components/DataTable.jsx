import React from 'react';

export default function DataTable({ data, columns, onDelete }) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                </svg>
                <p className="text-lg font-medium">No records found</p>
                <p className="text-sm mt-1">Click "Extract Current Object" to get started</p>
            </div>
        );
    }

    return (
        <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                    <tr>
                        {columns.map(col => (
                            <th
                                key={col.key}
                                className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200"
                            >
                                {col.label}
                            </th>
                        ))}
                        <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200 w-20">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((record, index) => (
                        <tr
                            key={record.id || index}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                            {columns.map(col => (
                                <td key={col.key} className="px-4 py-3 text-gray-800">
                                    {col.render ? col.render(record[col.key], record) : (record[col.key] || '-')}
                                </td>
                            ))}
                            <td className="px-4 py-3">
                                <button
                                    onClick={() => onDelete(record.id)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Delete record"
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
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
