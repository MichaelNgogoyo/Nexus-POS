import React, { useEffect, useState } from 'react';
import { ArrowUpward, ArrowDownward, AttachMoney, ShoppingCart, Inventory, Warning } from '@mui/icons-material';
import { getDashboardSummary } from '../../services/api';

const StatCard = ({ title, value, subtitle, icon, loading, warn }) => {
    const IconComponent = icon;
    return (
        <div className="card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
                <h3 className="text-text-secondary font-medium">{title}</h3>
                <IconComponent className={warn ? 'text-accent-warning' : 'text-brand-primary'} />
            </div>
            <p className="text-kpi my-2 text-data">
                {loading ? <span className="animate-pulse text-text-muted">—</span> : value}
            </p>
            {subtitle && (
                <p className="text-sm text-text-muted">{subtitle}</p>
            )}
        </div>
    );
};

const Stats = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDashboardSummary()
            .then(res => setSummary(res.data))
            .catch(() => setSummary(null))
            .finally(() => setLoading(false));
    }, []);

    const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n ?? 0);

    const cards = [
        {
            title: "Today's Revenue",
            value: fmt(summary?.todayRevenue),
            subtitle: `${summary?.todaySalesCount ?? 0} sales today`,
            icon: AttachMoney,
        },
        {
            title: "Month Revenue",
            value: fmt(summary?.monthRevenue),
            subtitle: `${summary?.monthSalesCount ?? 0} sales this month`,
            icon: ShoppingCart,
        },
        {
            title: "Products",
            value: summary?.totalProducts ?? '—',
            subtitle: `Active products in system`,
            icon: Inventory,
        },
        {
            title: "Low Stock Alerts",
            value: summary?.lowStockCount ?? '—',
            subtitle: summary?.lowStockCount > 0 ? 'Products need restocking' : 'All stock levels OK',
            icon: Warning,
            warn: summary?.lowStockCount > 0,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => (
                <StatCard key={index} {...card} loading={loading} />
            ))}
        </div>
    );
};

export default Stats;
