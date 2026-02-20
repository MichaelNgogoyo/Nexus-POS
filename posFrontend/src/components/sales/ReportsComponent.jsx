import {useEffect, useMemo, useState} from 'react';
import {BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import {CalendarToday, ArrowUpward, ArrowDownward, Sync, ErrorOutline} from '@mui/icons-material';
import api from '../../services/api';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(value || 0);
};

const ReportCard = ({title, value, change}) => {
    const isPositive = change >= 0;
    return (
        <div className="card p-4">
            <h3 className="text-text-secondary font-medium">{title}</h3>
            <p className="text-3xl font-bold my-2 text-text-primary">{value}</p>
            <div className={`flex items-center text-sm ${isPositive ? 'text-accent-success' : 'text-accent-error'}`}>
                {isPositive ? <ArrowUpward sx={{fontSize: 16}}/> : <ArrowDownward sx={{fontSize: 16}}/>}
                <span className="ml-1 font-semibold">{Math.abs(change).toFixed(1)}%</span>
                <span className="text-text-muted ml-2">vs previous period</span>
            </div>
        </div>
    );
};

const ReportsComponent = () => {
    const [timeframe, setTimeframe] = useState('week');
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [salesResponse, productsResponse] = await Promise.all([
                    api.getAllSales(),
                    api.getAllProducts()
                ]);

                setSales(salesResponse.data || []);
                setProducts(productsResponse.data || []);
                setError('');
            } catch (err) {
                console.error(err);
                setError('Failed to load analytics data.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const days = timeframe === 'today' ? 1 : timeframe === 'week' ? 7 : 30;

    const periodData = useMemo(() => {
        const now = new Date();
        const currentStart = new Date(now);
        currentStart.setDate(now.getDate() - days + 1);
        currentStart.setHours(0, 0, 0, 0);

        const previousStart = new Date(currentStart);
        previousStart.setDate(currentStart.getDate() - days);

        const currentSales = sales.filter((item) => {
            const date = new Date(item.saleDate || item.createdAt || item.date || now);
            return date >= currentStart && date <= now;
        });

        const previousSales = sales.filter((item) => {
            const date = new Date(item.saleDate || item.createdAt || item.date || now);
            return date >= previousStart && date < currentStart;
        });

        return {currentSales, previousSales};
    }, [days, sales]);

    const summary = useMemo(() => {
        const currentRevenue = periodData.currentSales.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
        const previousRevenue = periodData.previousSales.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
        const currentCount = periodData.currentSales.length;
        const previousCount = periodData.previousSales.length;

        const avgSale = currentCount > 0 ? currentRevenue / currentCount : 0;

        const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue > 0 ? 100 : 0;
        const salesChange = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : currentCount > 0 ? 100 : 0;

        return {
            revenue: currentRevenue,
            salesCount: currentCount,
            avgSale,
            revenueChange,
            salesChange,
        };
    }, [periodData]);

    const salesTrend = useMemo(() => {
        const labels = timeframe === 'today'
            ? ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']
            : timeframe === 'week'
                ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                : ['W1', 'W2', 'W3', 'W4'];

        const initial = labels.map((name) => ({name, revenue: 0, sales: 0}));

        periodData.currentSales.forEach((sale) => {
            const date = new Date(sale.saleDate || sale.createdAt || Date.now());
            let index = 0;

            if (timeframe === 'today') {
                index = Math.min(Math.floor(date.getHours() / 4), labels.length - 1);
            } else if (timeframe === 'week') {
                index = Math.max((date.getDay() + 6) % 7, 0);
            } else {
                index = Math.min(Math.floor((date.getDate() - 1) / 7), labels.length - 1);
            }

            initial[index].revenue += Number(sale.totalAmount || 0);
            initial[index].sales += 1;
        });

        return initial;
    }, [periodData.currentSales, timeframe]);

    const topProducts = useMemo(() => {
        const seeded = products.slice(0, 5).map((product) => ({
            name: product.name,
            quantity: Number(product.quantity || 0),
            price: Number(product.price || 0),
        }));

        return seeded.sort((a, b) => b.quantity - a.quantity);
    }, [products]);

    if (loading) {
        return (
            <div className="card p-8 flex flex-col items-center justify-center">
                <Sync className="animate-spin text-brand-primary" sx={{fontSize: 44}}/>
                <p className="mt-3 text-text-secondary">Loading reports...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card p-8 flex flex-col items-center justify-center">
                <ErrorOutline className="text-accent-error" sx={{fontSize: 44}}/>
                <p className="mt-3 text-accent-error">{error}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold">Sales Analytics</h2>
                <div className="flex items-center gap-2">
                    <div className="btn-secondary flex items-center gap-1">
                        <CalendarToday sx={{fontSize: 18}}/>
                        Period
                    </div>
                    <select
                        value={timeframe}
                        onChange={(event) => setTimeframe(event.target.value)}
                        className="rounded-lg border border-border-secondary bg-bg-tertiary px-3 py-2 text-text-primary"
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReportCard title="Total Revenue" value={formatCurrency(summary.revenue)} change={summary.revenueChange}/>
                <ReportCard title="Total Sales" value={summary.salesCount} change={summary.salesChange}/>
                <ReportCard title="Average Sale Value" value={formatCurrency(summary.avgSale)} change={summary.revenueChange}/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-6">
                <div className="lg:col-span-3 card p-4">
                    <h3 className="font-bold mb-4">Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesTrend}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border-secondary"/>
                            <XAxis dataKey="name"/>
                            <YAxis/>
                            <Tooltip contentStyle={{backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)'}}/>
                            <Legend/>
                            <Line type="monotone" dataKey="revenue" stroke="var(--color-brand-primary)" strokeWidth={2} name="Revenue"/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="lg:col-span-2 card p-4">
                    <h3 className="font-bold mb-4">Top Stocked Products</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts} layout="vertical" margin={{left: 12}}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border-secondary"/>
                            <XAxis type="number"/>
                            <YAxis dataKey="name" type="category" width={90}/>
                            <Tooltip contentStyle={{backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)'}}/>
                            <Bar dataKey="quantity" fill="var(--color-brand-primary)" name="Units"/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ReportsComponent;
