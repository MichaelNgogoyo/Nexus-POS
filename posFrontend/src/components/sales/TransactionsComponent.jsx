import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, FilterList, Sync, ErrorOutline,
    ExpandMore, ExpandLess, Undo, ChevronLeft, ChevronRight
} from '@mui/icons-material';
import api from '../../services/api';

const fmt = (v) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(v || 0);

const fmtDate = (s) => {
    if (!s) return 'N/A';
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString('en-KE', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const STATUS_STYLES = {
    completed: 'bg-green-100 text-green-700',
    returned:  'bg-amber-100 text-amber-700',
};

// ── Return-reason modal ────────────────────────────────────────────────────────
const ReturnModal = ({ saleId, onConfirm, onCancel, processing }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="card p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-1">Process Return</h3>
            <p className="text-sm text-text-secondary mb-4">Sale #{String(saleId).padStart(6, '0')}</p>
            <ReturnForm onConfirm={onConfirm} onCancel={onCancel} processing={processing} />
        </div>
    </div>
);

const ReturnForm = ({ onConfirm, onCancel, processing }) => {
    const [reason, setReason] = useState('Customer return');
    return (
        <>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border border-border-secondary rounded-lg bg-bg-tertiary mb-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="Reason for return..."
            />
            <div className="flex gap-3 justify-end">
                <button onClick={onCancel} disabled={processing} className="btn-secondary">
                    Cancel
                </button>
                <button
                    onClick={() => onConfirm(reason)}
                    disabled={!reason.trim() || processing}
                    className="btn-primary flex items-center gap-2"
                >
                    {processing && <Sync className="animate-spin" sx={{ fontSize: 16 }} />}
                    Confirm Return
                </button>
            </div>
        </>
    );
};

// ── Expandable transaction row ─────────────────────────────────────────────────
const TransactionRow = ({ txn, onReturnClick }) => {
    const [expanded, setExpanded] = useState(false);
    const [detail, setDetail]     = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const toggle = async () => {
        if (!expanded && !detail) {
            // Lazy-load full sale (items + product names) only when first expanded
            try {
                setLoadingDetail(true);
                const res = await api.viewSale(txn.id);
                setDetail(res.data);
            } catch {
                setDetail({ saleItems: [] });
            } finally {
                setLoadingDetail(false);
            }
        }
        setExpanded((v) => !v);
    };

    const status = (txn.status || 'COMPLETED').toLowerCase();
    const statusClass = STATUS_STYLES[status] || 'bg-blue-100 text-blue-700';
    const items = detail?.saleItems ?? [];

    return (
        <>
            <tr
                className="border-b border-border-secondary hover:bg-bg-tertiary transition-colors cursor-pointer"
                onClick={toggle}
            >
                <td className="p-3 font-mono text-brand-primary">
                    #{String(txn.id).padStart(6, '0')}
                </td>
                <td className="p-3">{txn.cashierId || '—'}</td>
                <td className="p-3 text-sm">{fmtDate(txn.createdAt)}</td>
                <td className="p-3">{txn.paymentMethod || '—'}</td>
                <td className="p-3 font-semibold">{fmt(txn.totalAmount)}</td>
                <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                        {txn.status || 'COMPLETED'}
                    </span>
                </td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => onReturnClick(txn)}
                            disabled={txn.status === 'RETURNED'}
                            title={txn.status === 'RETURNED' ? 'Already returned' : 'Process return'}
                            className="flex items-center gap-1 rounded-md border border-border-secondary px-2 py-1 text-xs hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Undo sx={{ fontSize: 14 }} /> Return
                        </button>
                        <button className="text-text-muted" onClick={toggle}>
                            {expanded ? <ExpandLess sx={{ fontSize: 20 }} /> : <ExpandMore sx={{ fontSize: 20 }} />}
                        </button>
                    </div>
                </td>
            </tr>

            {expanded && (
                <tr className="bg-bg-tertiary border-b border-border-secondary">
                    <td colSpan="7" className="px-6 py-4">
                        {loadingDetail ? (
                            <div className="flex items-center gap-2 text-text-secondary text-sm">
                                <Sync className="animate-spin" sx={{ fontSize: 16 }} /> Loading items...
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Items table */}
                                <div>
                                    <h4 className="font-semibold mb-2 text-sm">Items</h4>
                                    {items.length === 0 ? (
                                        <p className="text-text-muted text-sm">No items recorded.</p>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-text-muted border-b border-border-secondary">
                                                    <th className="text-left pb-1">Product</th>
                                                    <th className="text-right pb-1">Qty</th>
                                                    <th className="text-right pb-1">Unit</th>
                                                    <th className="text-right pb-1">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item, i) => (
                                                    <tr key={i} className="border-b border-border-secondary/30">
                                                        <td className="py-1">{item.product?.name || `#${item.product?.id}`}</td>
                                                        <td className="text-right py-1">{item.quantity}</td>
                                                        <td className="text-right py-1">{fmt(item.price)}</td>
                                                        <td className="text-right py-1 font-medium">{fmt(item.price * item.quantity)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Payment summary */}
                                <div>
                                    <h4 className="font-semibold mb-2 text-sm">Payment Summary</h4>
                                    <div className="space-y-1 text-sm">
                                        <Row label="Subtotal"  value={fmt((detail?.totalAmount ?? 0) - (detail?.taxAmount ?? 0))} />
                                        <Row label="Tax"       value={fmt(detail?.taxAmount)} />
                                        <Row label="Total"     value={fmt(detail?.totalAmount)} bold />
                                        {txn.paymentMethod === 'Cash' && (
                                            <>
                                                <Row label="Tendered"  value={fmt(detail?.amountTendered)} />
                                                <Row label="Change"    value={fmt(detail?.changeGiven)} />
                                            </>
                                        )}
                                        <Row label="Cashier"   value={txn.cashierId} />
                                        <Row label="Date"      value={fmtDate(txn.createdAt)} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
};

const Row = ({ label, value, bold }) => (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
        <span className="text-text-muted">{label}</span>
        <span>{value}</span>
    </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

const TransactionsComponent = () => {
    const [transactions, setTransactions] = useState([]);
    const [totalPages, setTotalPages]     = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [currentPage, setCurrentPage]   = useState(0);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);
    const [searchTerm, setSearchTerm]     = useState('');
    const [returnTarget, setReturnTarget] = useState(null);   // txn being returned
    const [returning, setReturning]       = useState(false);

    const fetchTransactions = useCallback(async (page = 0) => {
        try {
            setLoading(true);
            const res = await api.getAllSales(page, PAGE_SIZE);
            const p   = res.data;
            setTransactions(p.content ?? []);
            setTotalPages(p.totalPages ?? 0);
            setTotalElements(p.totalElements ?? 0);
            setCurrentPage(p.number ?? 0);
            setError(null);
        } catch (err) {
            setError('Failed to load transactions. Check your connection and try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTransactions(0); }, [fetchTransactions]);

    const handleConfirmReturn = async (reason) => {
        if (!returnTarget) return;
        try {
            setReturning(true);
            await api.processSaleReturn(returnTarget.id, { reason });
            setReturnTarget(null);
            await fetchTransactions(currentPage);
        } catch (err) {
            setError('Return failed. Please try again.');
            console.error(err);
        } finally {
            setReturning(false);
        }
    };

    // Client-side filter on current page (by ID or cashier)
    const visible = transactions.filter((t) =>
        !searchTerm ||
        String(t.id).includes(searchTerm) ||
        (t.cashierId ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="card p-4">
            {/* Return modal */}
            {returnTarget && (
                <ReturnModal
                    saleId={returnTarget.id}
                    onConfirm={handleConfirmReturn}
                    onCancel={() => setReturnTarget(null)}
                    processing={returning}
                />
            )}

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                    <h2 className="text-xl font-bold">Transaction History</h2>
                    {!loading && (
                        <p className="text-sm text-text-muted mt-0.5">{totalElements} total sales</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" sx={{ fontSize: 18 }} />
                        <input
                            type="text"
                            placeholder="Filter by ID or cashier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-2 w-56 border border-border-secondary rounded-lg bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                        />
                    </div>
                    <button
                        onClick={() => fetchTransactions(currentPage)}
                        disabled={loading}
                        className="btn-secondary flex items-center gap-1 text-sm"
                        title="Refresh"
                    >
                        <Sync className={loading ? 'animate-spin' : ''} sx={{ fontSize: 18 }} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b-2 border-border-secondary text-text-secondary">
                            <th className="p-3">Sale #</th>
                            <th className="p-3">Cashier</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="text-center p-12">
                                    <Sync className="animate-spin text-brand-primary mx-auto" sx={{ fontSize: 36 }} />
                                    <p className="mt-2 text-text-secondary text-sm">Loading transactions...</p>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan="7" className="text-center p-12">
                                    <ErrorOutline className="text-accent-error mx-auto" sx={{ fontSize: 36 }} />
                                    <p className="mt-2 text-accent-error text-sm">{error}</p>
                                    <button onClick={() => fetchTransactions(0)} className="mt-3 btn-secondary text-sm">
                                        Retry
                                    </button>
                                </td>
                            </tr>
                        ) : visible.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center p-12 text-text-muted text-sm">
                                    {searchTerm ? `No transactions matching "${searchTerm}".` : 'No transactions yet.'}
                                </td>
                            </tr>
                        ) : (
                            visible.map((txn) => (
                                <TransactionRow
                                    key={txn.id}
                                    txn={txn}
                                    onReturnClick={setReturnTarget}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-secondary">
                    <span className="text-sm text-text-secondary">
                        Page {currentPage + 1} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 0 || loading}
                            onClick={() => fetchTransactions(currentPage - 1)}
                            className="btn-secondary p-1 disabled:opacity-40"
                        >
                            <ChevronLeft sx={{ fontSize: 20 }} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i)
                            .filter((i) => Math.abs(i - currentPage) <= 2)
                            .map((i) => (
                                <button
                                    key={i}
                                    onClick={() => fetchTransactions(i)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                                        i === currentPage
                                            ? 'bg-brand-primary text-white'
                                            : 'btn-secondary'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        <button
                            disabled={currentPage >= totalPages - 1 || loading}
                            onClick={() => fetchTransactions(currentPage + 1)}
                            className="btn-secondary p-1 disabled:opacity-40"
                        >
                            <ChevronRight sx={{ fontSize: 20 }} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionsComponent;
