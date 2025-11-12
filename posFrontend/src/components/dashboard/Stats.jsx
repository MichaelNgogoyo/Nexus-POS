import React from 'react';
import { ArrowUpward, ArrowDownward, AttachMoney, ShoppingCart, People } from '@mui/icons-material';

const StatCard = ({ title, value, change, changeType, icon }) => {
    const IconComponent = icon;
    const isPositive = changeType === 'positive';

    return (
        <div className="card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
                <h3 className="text-text-secondary font-medium">{title}</h3>
                <IconComponent className={`text-brand-primary`} />
            </div>
            <p className="text-3xl font-bold my-2">{value}</p>
            <div className="flex items-center text-sm">
                {isPositive ? (
                    <ArrowUpward className="text-accent-success" sx={{ fontSize: 16 }} />
                ) : (
                    <ArrowDownward className="text-accent-error" sx={{ fontSize: 16 }} />
                )}
                <span className={`ml-1 ${isPositive ? 'text-accent-success' : 'text-accent-error'}`}>
                    {change}
                </span>
                <span className="text-text-muted ml-2">vs. last month</span>
            </div>
        </div>
    );
};

const Stats = () => {
    const statsData = [
        {
            title: 'Total Revenue',
            value: '$45,231.89',
            change: '+20.1%',
            changeType: 'positive',
            icon: AttachMoney,
        },
        {
            title: 'Total Sales',
            value: '+12,234',
            change: '+15.3%',
            changeType: 'positive',
            icon: ShoppingCart,
        },
        {
            title: 'New Customers',
            value: '+3,456',
            change: '-2.8%',
            changeType: 'negative',
            icon: People,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statsData.map((stat, index) => (
                <StatCard key={index} {...stat} />
            ))}
        </div>
    );
};

export default Stats;
