import React, { useEffect, useState } from 'react';
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDashboardSummary } from '../../services/api';

const Charts = () => {
    const [dailyData, setDailyData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDashboardSummary()
            .then(res => {
                const data = res.data;
                // Map daily stats: [{day, revenue, salesCount}] → chart format
                const daily = (data?.dailyStats ?? []).map(d => ({
                    name: d.day?.substring(5),   // "MM-DD"
                    revenue: Math.round(d.revenue),
                    sales: d.salesCount,
                }));
                setDailyData(daily);
                setTopProducts(data?.topProducts ?? []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const tooltipStyle = {
        contentStyle: {
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-primary)'
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="card p-4">
                <h3 className="text-xl font-bold mb-4">Daily Revenue (Last 30 Days)</h3>
                {loading ? (
                    <p className="text-text-muted animate-pulse h-[300px] flex items-center justify-center">Loading chart…</p>
                ) : dailyData.length === 0 ? (
                    <p className="text-text-muted h-[300px] flex items-center justify-center">No sales data yet.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border-secondary" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip {...tooltipStyle} />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenue (KES)" fill="var(--color-brand-primary)" />
                            <Bar dataKey="sales" name="Transactions" fill="var(--color-brand-secondary)" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
            <div className="card p-4">
                <h3 className="text-xl font-bold mb-4">Top Products by Sales</h3>
                {loading ? (
                    <p className="text-text-muted animate-pulse h-[300px] flex items-center justify-center">Loading chart…</p>
                ) : topProducts.length === 0 ? (
                    <p className="text-text-muted h-[300px] flex items-center justify-center">No sales data yet.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border-secondary" />
                            <XAxis type="number" />
                            <YAxis dataKey="productName" type="category" width={110} tick={{ fontSize: 11 }} />
                            <Tooltip {...tooltipStyle} />
                            <Legend />
                            <Bar dataKey="totalQty" name="Units Sold" fill="var(--color-brand-primary)" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default Charts;
