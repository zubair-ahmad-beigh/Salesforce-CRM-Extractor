import React from 'react';

const STAGES = [
    { name: 'Prospecting', color: 'bg-gray-100 text-gray-800' },
    { name: 'Qualification', color: 'bg-blue-100 text-blue-800' },
    { name: 'Proposal', color: 'bg-yellow-100 text-yellow-800' },
    { name: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
    { name: 'Closed Won', color: 'bg-green-100 text-green-800' },
    { name: 'Closed Lost', color: 'bg-red-100 text-red-800' }
];

export default function OpportunityStageView({ opportunities, onDelete }) {
    if (opportunities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                </svg>
                <p className="text-lg font-medium">No opportunities found</p>
                <p className="text-sm mt-1">Click "Extract Current Object" to get started</p>
            </div>
        );
    }

    // Group by stage
    const groupedByStage = STAGES.map(stage => {
        const stageOpps = opportunities.filter(opp => opp.stage === stage.name);
        const totalAmount = stageOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);

        return {
            ...stage,
            opportunities: stageOpps,
            count: stageOpps.length,
            totalAmount: totalAmount
        };
    });

    const formatCurrency = (amount) => {
        if (!amount) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getProbabilityColor = (probability) => {
        if (!probability) return 'text-gray-500';
        if (probability >= 75) return 'text-green-600';
        if (probability >= 50) return 'text-yellow-600';
        if (probability >= 25) return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-4 max-h-96 overflow-auto p-4">
            {groupedByStage.map(stage => (
                <div key={stage.name} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className={`px-4 py-3 ${stage.color} flex justify-between items-center`}>
                        <div>
                            <h3 className="font-semibold">{stage.name}</h3>
                            <p className="text-xs mt-1">{stage.count} opportunities</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg">{formatCurrency(stage.totalAmount)}</p>
                        </div>
                    </div>

                    {stage.opportunities.length > 0 && (
                        <div className="bg-white">
                            {stage.opportunities.map(opp => (
                                <div
                                    key={opp.id}
                                    className="px-4 py-3 border-t border-gray-100 hover:bg-gray-50 flex justify-between items-start"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-800">{opp.opportunityName}</p>
                                        <div className="flex gap-4 mt-1 text-sm text-gray-600">
                                            <span>{formatCurrency(opp.amount)}</span>
                                            {opp.probability !== null && (
                                                <span className={`font-medium ${getProbabilityColor(opp.probability)}`}>
                                                    {opp.probability}% probability
                                                </span>
                                            )}
                                            {opp.closeDate && (
                                                <span>Close: {new Date(opp.closeDate).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                        {opp.associatedAccount && (
                                            <p className="text-xs text-gray-500 mt-1">Account: {opp.associatedAccount}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onDelete(opp.id)}
                                        className="text-red-600 hover:text-red-800 ml-4"
                                        title="Delete opportunity"
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
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
