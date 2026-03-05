import React, { useEffect, useState } from 'react';
import { getDashboardSummary } from '../../services/api';

const Tables = () => {
    const [recentSales, setRecentSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDashboardSummary()
            .then(res => setRecentSales(res.data?.recentSales ?? []))
            .catch(() => setRecentSales([]))
            .finally(() => setLoading(false));
    }, []);

    const getStatusClass = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-accent-success/20 text-accent-success';
            case 'RETURNED':  return 'bg-accent-error/20 text-accent-error';
            default:          return 'bg-gray-500/20 text-gray-500';
        }
    };

    const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n ?? 0);

    return (
        <div className="card p-4 mt-4">
            <h3 className="text-xl font-bold mb-4">Recent Transactions</h3>
            {loading ? (
                <p className="text-text-muted animate-pulse">Loading...</p>
            ) : recentSales.length === 0 ? (
                <p className="text-text-muted">No sales recorded yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border-secondary">
                                <th className="p-2">Sale #</th>
                                <th className="p-2">Cashier</th>
                                <th className="p-2">Items</th>
                                <th className="p-2">Total</th>
                                <th className="p-2">Payment</th>
                                <th className="p-2">Date</th>
                                <th className="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSales.map((sale) => (
                                <tr key={sale.id} className="border-b border-border-secondary">
                                    <td className="p-2 font-medium">#{sale.id}</td>
                                    <td className="p-2 text-sm text-text-secondary">{sale.cashierId?.substring(0, 8)}…</td>
                                    <td className="p-2 text-sm">
                                        {sale.items?.map(i => i.productName).join(', ') || '—'}
                                    </td>
                                    <td className="p-2 font-semibold">{fmt(sale.totalAmount)}</td>
                                    <td className="p-2 text-sm capitalize">{sale.paymentMethod?.toLowerCase()}</td>
                                    <td className="p-2 text-sm text-text-muted">
                                        {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="p-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(sale.status)}`}>
                                            {sale.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Tables;
