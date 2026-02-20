import React, { useState } from 'react';
import CheckoutComponent from "../../components/sales/CheckoutComponent.jsx";
import TransactionsComponent from "../../components/sales/TransactionsComponent.jsx";
import ReportsComponent from "../../components/sales/ReportsComponent.jsx";
import { PointOfSale, Receipt, Leaderboard } from '@mui/icons-material';

const Sales = () => {
    const [activeTab, setActiveTab] = useState('checkout');

    const tabs = {
        checkout: {
            label: 'Checkout',
            icon: PointOfSale,
            component: <CheckoutComponent />
        },
        transactions: {
            label: 'Transactions',
            icon: Receipt,
            component: <TransactionsComponent />
        },
        reports: {
            label: 'Reports',
            icon: Leaderboard,
            component: <ReportsComponent />
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Sales Module</h1>

                <div className="flex border-b border-border-secondary mb-6">
                    {Object.entries(tabs).map(([key, tab]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors duration-250 ${
                                activeTab === key
                                    ? 'text-brand-primary border-b-2 border-brand-primary'
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            <tab.icon sx={{ fontSize: 20 }} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div>
                    {tabs[activeTab].component}
                </div>
            </div>
        </div>
    );
};

export default Sales;
