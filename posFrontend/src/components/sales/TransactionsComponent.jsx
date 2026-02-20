import React, { useState, useEffect } from 'react';
import { Search, FilterList, CalendarToday, MoreVert, Sync, ErrorOutline } from '@mui/icons-material';
import api from '../../services/api';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(value || 0);
};

const TransactionRow = ({ txn, onReturn, returnProcessingId }) => {
    const [detailsVisible, setDetailsVisible] = useState(false);

    const getStatusClass = (status) => {
        // This is a placeholder. You'll need to determine status based on your data.
        if (!status) return 'bg-gray-500/20 text-gray-500';
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-accent-success/20 text-accent-success';
            case 'refunded': return 'bg-accent-warning/20 text-accent-warning';
            default: return 'bg-blue-500/20 text-blue-500';
        }
    };

    return (
        <>
            <tr className="border-b border-border-secondary hover:bg-bg-tertiary cursor-pointer" onClick={() => setDetailsVisible(!detailsVisible)}>
                <td className="p-3 font-medium text-brand-primary">#{txn.id}</td>
                <td className="p-3">{txn.cashierId || 'N/A'}</td>
                <td className="p-3">{new Date(txn.saleDate).toLocaleString()}</td>
                <td className="p-3 font-semibold">{formatCurrency(txn.totalAmount)}</td>
                <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(txn.status || 'Completed')}`}>
                        {txn.status || 'Completed'}
                    </span>
                </td>
                <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <button className="text-text-muted hover:text-text-primary"><MoreVert /></button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onReturn(txn.id);
                            }}
                            disabled={returnProcessingId === txn.id}
                            className="rounded-md border border-border-secondary px-2 py-1 text-xs hover:bg-bg-tertiary disabled:opacity-60"
                        >
                            {returnProcessingId === txn.id ? 'Returning...' : 'Return'}
                        </button>
                    </div>
                </td>
            </tr>
            {detailsVisible && (
                <tr className="bg-bg-tertiary">
                    <td colSpan="6" className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-bold">Items</h4>
                                <p className="text-text-muted">Item details not available yet.</p>
                                {/* When your API provides item details, you can map them here */}
                            </div>
                            <div>
                                <h4 className="font-bold">Payment Details</h4>
                                <p>Method: {txn.paymentMethod}</p>
                                <p>Total: {formatCurrency(txn.totalAmount)}</p>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

const TransactionsComponent = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [returnProcessingId, setReturnProcessingId] = useState(null);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await api.getAllSales();
            setTransactions(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch transactions. Please ensure the backend is running and the endpoint is available.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handleProcessReturn = async (saleId) => {
        try {
            setReturnProcessingId(saleId);
            await api.processSaleReturn(saleId, { reason: 'Customer return' });
            await fetchTransactions();
        } catch (err) {
            setError('Return processing failed. Confirm backend return endpoint and try again.');
            console.error(err);
        } finally {
            setReturnProcessingId(null);
        }
    };


    const filteredTransactions = transactions.filter(t =>
        (t.id?.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.cashierId?.toLowerCase().includes(searchTerm.toLowerCase()))
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
                            placeholder="Search by ID or Cashier..."
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
                            <th className="p-3">Cashier</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="text-center p-10">
                                    <Sync className="animate-spin text-brand-primary mx-auto" sx={{ fontSize: 40 }} />
                                    <p className="mt-2 text-text-secondary">Loading Transactions...</p>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan="6" className="text-center p-10">
                                    <ErrorOutline className="text-accent-error mx-auto" sx={{ fontSize: 40 }} />
                                    <p className="mt-2 text-accent-error">{error}</p>
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map(txn => (
                                <TransactionRow
                                    key={txn.id}
                                    txn={txn}
                                    onReturn={handleProcessReturn}
                                    returnProcessingId={returnProcessingId}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Placeholder for Pagination */}
            <div className="flex justify-end items-center mt-4 text-sm">
                <p>Showing {filteredTransactions.length} of {filteredTransactions.length} results</p>
                {/* Pagination controls would go here */}
            </div>
        </div>
    );
};

export default TransactionsComponent;
