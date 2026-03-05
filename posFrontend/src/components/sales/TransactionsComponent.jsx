import React, { useState, useEffect } from 'react';
import { Search, FilterList, CalendarToday, MoreVert, Sync, ErrorOutline } from '@mui/icons-material';
import api from '../../services/api';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(value || 0);
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
};

const TransactionRow = ({ txn, onReturn, returnProcessingId }) => {
    const [detailsVisible, setDetailsVisible] = useState(false);

    const getStatusClass = (status) => {
        if (!status) return 'bg-gray-500/20 text-gray-500';
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-accent-success/20 text-accent-success';
            case 'returned': return 'bg-accent-warning/20 text-accent-warning';
            default: return 'bg-blue-500/20 text-blue-500';
        }
    };

    const items = txn.saleItems || [];

    return (
        <>
            <tr className="border-b border-border-secondary hover:bg-bg-tertiary cursor-pointer" onClick={() => setDetailsVisible(!detailsVisible)}>
                <td className="p-3 font-medium text-brand-primary">#{txn.id}</td>
                <td className="p-3">{txn.cashierId || 'N/A'}</td>
                <td className="p-3">{formatDate(txn.createdAt)}</td>
                <td className="p-3 font-semibold">{formatCurrency(txn.totalAmount)}</td>
                <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(txn.status)}`}>
                        {txn.status || 'COMPLETED'}
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
                            disabled={returnProcessingId === txn.id || txn.status === 'RETURNED'}
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
                                <h4 className="font-bold mb-2">Items</h4>
                                {items.length === 0 ? (
                                    <p className="text-text-muted text-sm">No items recorded.</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-text-muted border-b border-border-secondary">
                                                <th className="text-left py-1">Product</th>
                                                <th className="text-right py-1">Qty</th>
                                                <th className="text-right py-1">Price</th>
                                                <th className="text-right py-1">Line Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => (
                                                <tr key={idx} className="border-b border-border-secondary/40">
                                                    <td className="py-1">{item.product?.name || `Product #${item.product?.id}`}</td>
                                                    <td className="text-right py-1">{item.quantity}</td>
                                                    <td className="text-right py-1">{formatCurrency(item.price)}</td>
                                                    <td className="text-right py-1">{formatCurrency(item.price * item.quantity)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold mb-2">Payment Details</h4>
                                <div className="space-y-1 text-sm">
                                    <p><span className="text-text-muted">Method:</span> {txn.paymentMethod || 'N/A'}</p>
                                    <p><span className="text-text-muted">Total:</span> <span className="font-semibold">{formatCurrency(txn.totalAmount)}</span></p>
                                    <p><span className="text-text-muted">Date:</span> {formatDate(txn.createdAt)}</p>
                                    <p><span className="text-text-muted">Cashier:</span> {txn.cashierId || 'N/A'}</p>
                                </div>
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
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [returnProcessingId, setReturnProcessingId] = useState(null);

    const fetchTransactions = async (page = 0) => {
        try {
            setLoading(true);
            const response = await api.getAllSales(page, 20);
            // Backend returns a Spring Page object
            const pageData = response.data;
            setTransactions(pageData.content || pageData || []);
            setTotalPages(pageData.totalPages || 1);
            setCurrentPage(pageData.number || 0);
            setError(null);
        } catch (err) {
            setError('Failed to fetch transactions. Ensure you are logged in and the backend is running.');
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
            await fetchTransactions(currentPage);
        } catch (err) {
            setError('Return processing failed.');
            console.error(err);
        } finally {
            setReturnProcessingId(null);
        }
    };

    const filteredTransactions = transactions.filter(t =>
        (t.id?.toString().includes(searchTerm)) ||
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
                                    <button onClick={() => fetchTransactions()} className="mt-3 btn-secondary text-sm">Retry</button>
                                </td>
                            </tr>
                        ) : filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center p-10 text-text-muted">No transactions found.</td>
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
            <div className="flex justify-between items-center mt-4 text-sm text-text-secondary">
                <p>{filteredTransactions.length} result(s) on page {currentPage + 1} of {totalPages}</p>
                <div className="flex gap-2">
                    <button disabled={currentPage === 0} onClick={() => fetchTransactions(currentPage - 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">Prev</button>
                    <button disabled={currentPage >= totalPages - 1} onClick={() => fetchTransactions(currentPage + 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">Next</button>
                </div>
            </div>
        </div>
    );
};

export default TransactionsComponent;
