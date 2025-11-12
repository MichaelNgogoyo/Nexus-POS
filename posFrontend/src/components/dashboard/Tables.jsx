import React from 'react';

const recentOrders = [
    { id: '86437', product: 'Cool T-Shirt', date: '2025-11-12', price: '$35.00', status: 'Delivered' },
    { id: '86438', product: 'Fancy Mug', date: '2025-11-12', price: '$15.50', status: 'Shipped' },
    { id: '86439', product: 'Stylish Cap', date: '2025-11-11', price: '$25.00', status: 'Delivered' },
    { id: '86440', product: 'Awesome Sticker Pack', date: '2025-11-10', price: '$9.99', status: 'Processing' },
    { id: '86441', product: 'Limited Edition Poster', date: '2025-11-09', price: '$55.25', status: 'Delivered' },
];

const Tables = () => {
    const getStatusClass = (status) => {
        switch (status) {
            case 'Delivered':
                return 'bg-accent-success/20 text-accent-success';
            case 'Shipped':
                return 'bg-blue-500/20 text-blue-500';
            case 'Processing':
                return 'bg-accent-warning/20 text-accent-warning';
            default:
                return 'bg-gray-500/20 text-gray-500';
        }
    };

    return (
        <div className="card p-4 mt-4">
            <h3 className="text-xl font-bold mb-4">Recent Orders</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-border-secondary">
                            <th className="p-2">Order ID</th>
                            <th className="p-2">Product</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">Price</th>
                            <th className="p-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentOrders.map((order) => (
                            <tr key={order.id} className="border-b border-border-secondary">
                                <td className="p-2 font-medium">#{order.id}</td>
                                <td className="p-2">{order.product}</td>
                                <td className="p-2">{order.date}</td>
                                <td className="p-2">{order.price}</td>
                                <td className="p-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(order.status)}`}>
                                        {order.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Tables;
