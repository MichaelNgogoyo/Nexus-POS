import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, BarChart, People, Settings } from '@mui/icons-material';
import {ROUTES} from "../../routes.js";

const ModuleCard = ({ title, description, icon, link }) => {
    const IconComponent = icon;
    return (
        <Link to={link} className="card p-4 flex items-start gap-4 hover:shadow-lg hover:scale-105 transform transition-all duration-250">
            <div className="bg-brand-primary/10 p-3 rounded-lg">
                <IconComponent className="text-brand-primary" />
            </div>
            <div>
                <h4 className="font-bold text-lg">{title}</h4>
                <p className="text-text-secondary text-sm">{description}</p>
            </div>
        </Link>
    );
};

const Modules = () => {
    const moduleData = [
        {
            title: 'Sales',
            description: 'Manage sales, checkout, and view transactions.',
            icon: ShoppingCart,
            link: ROUTES.SALES,
        },
        {
            title: 'Products',
            description: 'Add, edit, and manage your products.',
            icon: BarChart,
            link: ROUTES.PRODUCTS,
        },
        {
            title: 'Customers',
            description: 'View and manage your customer base.',
            icon: People,
            link: '/customers', // Example link
        },
        {
            title: 'Settings',
            description: 'Configure application settings.',
            icon: Settings,
            link: '/settings', // Example link
        },
    ];

    return (
        <div className="mt-4">
            <h3 className="text-xl font-bold mb-4">Application Modules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {moduleData.map((module, index) => (
                    <ModuleCard key={index} {...module} />
                ))}
            </div>
        </div>
    );
};

export default Modules;
