import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CalendarToday, ArrowUpward, ArrowDownward, AttachMoney, ShoppingCart, TrendingUp } from '@mui/icons-material';

// Mock data for reports
const salesSummary = {
    today: { revenue: 1250.50, sales: 80, avgSale: 15.63, change: 5.2 },
    week: { revenue: 8750.00, sales: 560, avgSale: 15.62, change: -1.5 },
    month: { revenue: 35200.00, sales: 2250, avgSale: 15.64, change: 12.8 },
};

const salesOverTime = [
    { name: 'Mon', sales: 1100 }, { name: 'Tue', sales: 1300 }, { name: 'Wed', sales: 950 },
    { name: 'Thu', sales: 1500 }, { name: 'Fri', sales: 2100 }, { name: 'Sat', sales: 2500 }, { name: 'Sun', sales: 2300 },
];

const topProducts = [
    { name: 'Latte', sales: 500 },
    { name: 'Espresso', sales: 450 },
    { name: 'Croissant', sales: 300 },
    { name: 'Cappuccino', sales: 250 },
    { name: 'Muffin', sales: 150 },
];
const COLORS = ['var(--color-brand-primary)', 'var(--color-brand-secondary)', '#FFBB28', '#FF8042', '#0088FE'];


const ReportCard = ({ title, value, change }) => {
    const isPositive = change >= 0;
    return (
        <div className="card p-4">
            <h3 className="text-text-secondary font-medium">{title}</h3>
            <p className="text-3xl font-bold my-2">{value}</p>
            <div className={`flex items-center text-sm ${isPositive ? 'text-accent-success' : 'text-accent-error'}`}>
                {isPositive ? <ArrowUpward sx={{ fontSize: 16 }} /> : <ArrowDownward sx={{ fontSize: 16 }} />}
                <span className="ml-1 font-semibold">{Math.abs(change)}%</span>
                <span className="text-text-muted ml-2">vs. previous period</span>
            </div>
        </div>
    );
};

const ReportsComponent = () => {
    const [timeframe, setTimeframe] = useState('week');

    return (
        <div>
            {/* Header and Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold">Sales Analytics</h2>
                <div className="flex items-center gap-2">
                    <button className="btn-secondary flex items-center gap-1"><CalendarToday sx={{ fontSize: 18 }} /> Custom Date</button>
                    {/* Timeframe selector */}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReportCard title="Total Revenue" value={`$${salesSummary[timeframe].revenue.toFixed(2)}`} change={salesSummary[timeframe].change} />
                <ReportCard title="Total Sales" value={salesSummary[timeframe].sales} change={salesSummary[timeframe].change} />
                <ReportCard title="Average Sale Value" value={`$${salesSummary[timeframe].avgSale.toFixed(2)}`} change={salesSummary[timeframe].change > 0 ? 2.1 : -0.5} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-6">
                <div className="lg:col-span-3 card p-4">
                    <h3 className="font-bold mb-4">Sales Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesOverTime}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border-secondary" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }} />
                            <Legend />
                            <Line type="monotone" dataKey="sales" stroke="var(--color-brand-primary)" strokeWidth={2} name="Sales Volume" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="lg:col-span-2 card p-4">
                    <h3 className="font-bold mb-4">Top Selling Products</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={topProducts} dataKey="sales" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {topProducts.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ReportsComponent;
