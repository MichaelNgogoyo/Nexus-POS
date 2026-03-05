import { useEffect, useMemo, useState } from 'react';
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { CalendarToday, ArrowUpward, ArrowDownward, Sync, ErrorOutline } from '@mui/icons-material';
import api from '../../services/api';

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value || 0);

const pct = (current, previous) =>
    previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

const ReportCard = ({ title, value, change }) => {
    const isPositive = change >= 0;
    return (
        <div className="card p-4">
            <h3 className="text-text-secondary font-medium text-sm">{title}</h3>
            <p className="text-kpi my-2 text-text-primary text-2xl font-bold">{value}</p>
            <div className={`flex items-center text-sm ${isPositive ? 'text-accent-success' : 'text-accent-error'}`}>
                {isPositive ? <ArrowUpward sx={{ fontSize: 16 }} /> : <ArrowDownward sx={{ fontSize: 16 }} />}
                <span className="ml-1 font-semibold">{Math.abs(change).toFixed(1)}%</span>
                <span className="text-text-muted ml-2">vs previous period</span>
            </div>
        </div>
    );
};

const ReportsComponent = () => {
    const [timeframe, setTimeframe] = useState('week');
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await api.getDashboardSummary();
                setSummary(res.data);
                setError('');
            } catch (err) {
                console.error(err);
                setError('Failed to load analytics data.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Slice dailyStats based on selected timeframe
    const trendData = useMemo(() => {
        if (!summary?.dailyStats?.length) return [];
        const all = [...summary.dailyStats]; // sorted ASC from backend
        const slice = timeframe === 'today' ? 1 : timeframe === 'week' ? 7 : 30;
        return all.slice(-slice).map((d) => ({
            name: timeframe === 'today'
                ? 'Today'
                : new Date(d.day + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' }),
            revenue: d.revenue,
            sales: d.salesCount,
        }));
    }, [summary, timeframe]);

    // KPI values derived from daily stats for the selected window
    const kpis = useMemo(() => {
        if (!summary) return null;
        if (timeframe === 'today') {
            return {
                revenue: summary.todayRevenue,
                count: summary.todaySalesCount,
                avgSale: summary.todaySalesCount > 0
                    ? summary.todayRevenue / summary.todaySalesCount : 0,
            };
        }
        const all = summary.dailyStats ?? [];
        const slice = timeframe === 'week' ? 7 : 30;
        const current = all.slice(-slice);
        const previous = all.slice(-slice * 2, -slice);
        const curRevenue = current.reduce((s, d) => s + d.revenue, 0);
        const prevRevenue = previous.reduce((s, d) => s + d.revenue, 0);
        const curCount = current.reduce((s, d) => s + d.salesCount, 0);
        const prevCount = previous.reduce((s, d) => s + d.salesCount, 0);
        return {
            revenue: curRevenue,
            count: curCount,
            avgSale: curCount > 0 ? curRevenue / curCount : 0,
            revenueChange: pct(curRevenue, prevRevenue),
            countChange: pct(curCount, prevCount),
        };
    }, [summary, timeframe]);

    const topProducts = useMemo(
        () => (summary?.topProducts ?? []).map((p) => ({
            name: p.productName,
            unitsSold: p.totalQty,
            revenue: p.totalRevenue,
        })),
        [summary]
    );

    if (loading) {
        return (
            <div className="card p-8 flex flex-col items-center justify-center">
                <Sync className="animate-spin text-brand-primary" sx={{ fontSize: 44 }} />
                <p className="mt-3 text-text-secondary">Loading reports...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card p-8 flex flex-col items-center justify-center">
                <ErrorOutline className="text-accent-error" sx={{ fontSize: 44 }} />
                <p className="mt-3 text-accent-error">{error}</p>
            </div>
        );
    }

    return (
        <div>
            {/* ── Header + timeframe selector ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold">Sales Analytics</h2>
                <div className="flex items-center gap-2">
                    <div className="btn-secondary flex items-center gap-1">
                        <CalendarToday sx={{ fontSize: 18 }} /> Period
                    </div>
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="rounded-lg border border-border-secondary bg-bg-tertiary px-3 py-2 text-text-primary"
                    >
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                    </select>
                </div>
            </div>

            {/* ── KPI cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReportCard
                    title="Total Revenue"
                    value={formatCurrency(kpis?.revenue)}
                    change={kpis?.revenueChange ?? (kpis?.revenue > 0 ? 100 : 0)}
                />
                <ReportCard
                    title="Total Sales"
                    value={kpis?.count ?? 0}
                    change={kpis?.countChange ?? (kpis?.count > 0 ? 100 : 0)}
                />
                <ReportCard
                    title="Avg Sale Value"
                    value={formatCurrency(kpis?.avgSale)}
                    change={kpis?.revenueChange ?? 0}
                />
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-6">
                {/* Revenue trend line chart */}
                <div className="lg:col-span-3 card p-4">
                    <h3 className="font-bold mb-4">Revenue Trend</h3>
                    {trendData.length === 0 ? (
                        <p className="text-text-muted text-center py-16">No sales data for this period.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border-secondary" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(v) => formatCurrency(v)}
                                    contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone" dataKey="revenue"
                                    stroke="var(--color-brand-primary)" strokeWidth={2}
                                    dot={{ r: 3 }} name="Revenue"
                                />
                                <Line
                                    type="monotone" dataKey="sales"
                                    stroke="var(--color-accent-info, #6366f1)" strokeWidth={2}
                                    dot={{ r: 3 }} name="# Sales"
                                    yAxisId={0}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Top 5 products by units sold */}
                <div className="lg:col-span-2 card p-4">
                    <h3 className="font-bold mb-4">Top 5 Products (Units Sold)</h3>
                    {topProducts.length === 0 ? (
                        <p className="text-text-muted text-center py-16">No sales data yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topProducts} layout="vertical" margin={{ left: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border-secondary" />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(v, name) => name === 'revenue' ? formatCurrency(v) : v}
                                    contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}
                                />
                                <Bar dataKey="unitsSold" fill="var(--color-brand-primary)" name="Units Sold" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Recent sales table ── */}
            {summary?.recentSales?.length > 0 && (
                <div className="card p-4 mt-6">
                    <h3 className="font-bold mb-4">Recent Sales</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-text-secondary border-b border-border-secondary">
                                    <th className="text-left pb-2">Sale #</th>
                                    <th className="text-left pb-2">Cashier</th>
                                    <th className="text-left pb-2">Items</th>
                                    <th className="text-left pb-2">Payment</th>
                                    <th className="text-left pb-2">Status</th>
                                    <th className="text-right pb-2">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.recentSales.map((sale) => (
                                    <tr key={sale.id} className="border-b border-border-secondary last:border-0 hover:bg-bg-tertiary">
                                        <td className="py-2 font-mono">#{String(sale.id).padStart(6, '0')}</td>
                                        <td className="py-2">{sale.cashierId}</td>
                                        <td className="py-2 text-text-secondary">
                                            {sale.items?.map((i) => `${i.productName} ×${i.quantity}`).join(', ') || '—'}
                                        </td>
                                        <td className="py-2">{sale.paymentMethod}</td>
                                        <td className="py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                sale.status === 'COMPLETED'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-600'
                                            }`}>
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="py-2 text-right font-semibold">{formatCurrency(sale.totalAmount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsComponent;
