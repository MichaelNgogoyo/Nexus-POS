import React, { useState } from 'react';
import { AddShoppingCart, RemoveShoppingCart, ClearAll, CreditCard, Money } from '@mui/icons-material';

// Mock data for products
const mockProducts = [
    { id: 1, name: 'Espresso', price: 2.50, stock: 100 },
    { id: 2, name: 'Latte', price: 3.50, stock: 50 },
    { id: 3, name: 'Cappuccino', price: 3.50, stock: 75 },
    { id: 4, name: 'Croissant', price: 2.75, stock: 30 },
    { id: 5, name: 'Muffin', price: 2.25, stock: 40 },
];

const CheckoutComponent = () => {
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const addToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const removeFromCart = (productId) => {
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem.quantity === 1) {
            setCart(cart.filter(item => item.id !== productId));
        } else {
            setCart(cart.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item));
        }
    };

    const filteredProducts = mockProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Selection */}
            <div className="lg:col-span-2">
                <div className="card p-4">
                    <input
                        type="text"
                        placeholder="Search or scan products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-border-secondary rounded-lg bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 max-h-96 overflow-y-auto p-2">
                        {filteredProducts.map(product => (
                            <div key={product.id} onClick={() => addToCart(product)} className="card p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-bg-tertiary">
                                <p className="font-bold">{product.name}</p>
                                <p className="text-text-secondary">${product.price.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cart and Payment */}
            <div className="lg:col-span-1">
                <div className="card p-4">
                    <h2 className="text-xl font-bold mb-4 flex justify-between items-center">
                        <span>Cart</span>
                        <button onClick={() => setCart([])} className="text-text-muted hover:text-accent-error" title="Clear Cart">
                            <ClearAll />
                        </button>
                    </h2>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {cart.length === 0 ? (
                            <p className="text-text-muted text-center p-4">Cart is empty</p>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{item.name}</p>
                                        <p className="text-sm text-text-secondary">${item.price.toFixed(2)} x {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                                        <button onClick={() => removeFromCart(item.id)} className="text-text-muted hover:text-accent-error">
                                            <RemoveShoppingCart sx={{ fontSize: 20 }} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="border-t border-border-secondary my-4"></div>
                    <div className="space-y-2">
                        <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${total.toFixed(2)}</span></div>
                    </div>
                    <div className="mt-6">
                        <h3 className="font-bold mb-2">Payment Method</h3>
                        <div className="flex gap-2">
                            <button className="flex-1 btn-secondary flex items-center justify-center gap-2"><CreditCard /> Card</button>
                            <button className="flex-1 btn-secondary flex items-center justify-center gap-2"><Money /> Cash</button>
                        </div>
                        <button className="btn-primary w-full mt-4" disabled={cart.length === 0}>
                            Complete Sale
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutComponent;
