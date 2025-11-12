import React, { useState } from 'react';
import { Search, FilterList, CalendarToday, ReceiptLong, MoreVert } from '@mui/icons-material';

// Mock data for transactions
const mockTransactions = [
    { id: 'TXN75638', date: '2025-11-12 10:30 AM', customer: 'John Doe', total: 45.50, status: 'Completed', paymentMethod: 'Card', items: [{ name: 'Latte', qty: 2 }, { name: 'Muffin', qty: 1 }] },
    { id: 'TXN75639', date: '2025-11-12 09:15 AM', customer: 'Jane Smith', total: 12.75, status: 'Completed', paymentMethod: 'Cash', items: [{ name: 'Espresso', qty: 1 }, { name: 'Croissant', qty: 1 }] },
    { id: 'TXN75640', date: '2025-11-11 04:45 PM', customer: 'Guest', total: 8.25, status: 'Refunded', paymentMethod: 'Card', items: [{ name: 'Cappuccino', qty: 1 }] },
    { id: 'TXN75641', date: '2025-11-11 02:00 PM', customer: 'Peter Jones', total: 25.00, status: 'Completed', paymentMethod: 'Card', items: [{ name: 'Latte', qty: 2 }, { name: 'Muffin', qty: 2 }] },
    { id: 'TXN75642', date: '2025-11-10 11:00 AM', customer: 'Mary Johnson', total: 5.00, status: 'Completed', paymentMethod: 'Cash', items: [{ name: 'Espresso', qty: 2 }] },
];

const TransactionRow = ({ txn }) => {
    const [detailsVisible, setDetailsVisible] = useState(false);

    const getStatusClass = (status) => {
        switch (status) {
            case 'Completed': return 'bg-accent-success/20 text-accent-success';
            case 'Refunded': return 'bg-accent-warning/20 text-accent-warning';
            default: return 'bg-gray-500/20 text-gray-500';
        }
    };

    return (
        <>
            <tr className="border-b border-border-secondary hover:bg-bg-tertiary cursor-pointer" onClick={() => setDetailsVisible(!detailsVisible)}>
                <td className="p-3 font-medium text-brand-primary">#{txn.id}</td>
                <td className="p-3">{txn.customer}</td>
                <td className="p-3">{txn.date}</td>
                <td className="p-3 font-semibold">${txn.total.toFixed(2)}</td>
                <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(txn.status)}`}>
                        {txn.status}
                    </span>
                </td>
                <td className="p-3 text-center">
                    <button className="text-text-muted hover:text-text-primary"><MoreVert /></button>
                </td>
            </tr>
            {detailsVisible && (
                <tr className="bg-bg-tertiary">
                    <td colSpan="6" className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-bold">Items</h4>
                                <ul className="list-disc list-inside">
                                    {txn.items.map((item, i) => <li key={i}>{item.name} (x{item.qty})</li>)}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold">Payment Details</h4>
                                <p>Method: {txn.paymentMethod}</p>
                                <p>Total: ${txn.total.toFixed(2)}</p>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

const TransactionsComponent = () => {
    const [transactions, setTransactions] = useState(mockTransactions);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTransactions = transactions.filter(t =>
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold">Transaction History</h2>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" sx={{ fontSize: 20 }} />
                        <input
                            type="text"
                            placeholder="Search by ID or Customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-2 py-2 w-64 border border-border-secondary rounded-lg bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <button className="btn-secondary flex items-center gap-1"><FilterList sx={{ fontSize: 18 }} /> Filters</button>
                    <button className="btn-secondary flex items-center gap-1"><CalendarToday sx={{ fontSize: 18 }} /> Date Range</button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-border-secondary">
                            <th className="p-3">ID</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(txn => <TransactionRow key={txn.id} txn={txn} />)}
                    </tbody>
                </table>
            </div>
            {/* Placeholder for Pagination */}
            <div className="flex justify-end items-center mt-4 text-sm">
                <p>Showing 1-5 of {filteredTransactions.length} results</p>
                {/* Pagination controls would go here */}
            </div>
        </div>
    );
};

export default TransactionsComponent;
