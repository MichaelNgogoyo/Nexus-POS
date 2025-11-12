import React, { useState, useEffect } from 'react';
import { AddShoppingCart, RemoveShoppingCart, ClearAll, CreditCard, Money, Sync, ErrorOutline } from '@mui/icons-material';
import api from '../../services/api';
import ProductCard from './ProductCard'; // Import the new ProductCard component

const CheckoutComponent = () => {
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingSale, setProcessingSale] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await api.getAllProducts();
                setProducts(response.data);
                setError(null);
            } catch (err) {
                setError('Failed to fetch products. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

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

    const handleCompleteSale = async (paymentMethod) => {
        if (cart.length === 0 || processingSale) return;

        setProcessingSale(true);
        const saleData = {
            cashierId: 'default-user', // NOTE: Replace with actual logged-in user ID
            totalAmount: total,
            paymentMethod: paymentMethod,
            // Depending on your backend, you might need to send the items
            // items: cart.map(item => ({ productId: item.id, quantity: item.quantity }))
        };

        try {
            await api.createSale(saleData);
            alert('Sale Completed Successfully!');
            setCart([]); // Clear the cart on success
        } catch (err) {
            setError('Failed to complete sale. Please check connection and try again.');
            console.error(err);
        } finally {
            setProcessingSale(false);
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
                        {loading ? (
                            <div className="col-span-full flex flex-col items-center justify-center p-10">
                                <Sync className="animate-spin text-brand-primary" sx={{ fontSize: 40 }} />
                                <p className="mt-2 text-text-secondary">Loading Products...</p>
                            </div>
                        ) : error ? (
                            <div className="col-span-full flex flex-col items-center justify-center p-10">
                                <ErrorOutline className="text-accent-error" sx={{ fontSize: 40 }} />
                                <p className="mt-2 text-accent-error">{error}</p>
                            </div>
                        ) : (
                            filteredProducts.map(product => (
                                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                            ))
                        )}
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
                            <button onClick={() => handleCompleteSale('Card')} className="flex-1 btn-secondary flex items-center justify-center gap-2" disabled={processingSale || cart.length === 0}><CreditCard /> Card</button>
                            <button onClick={() => handleCompleteSale('Cash')} className="flex-1 btn-secondary flex items-center justify-center gap-2" disabled={processingSale || cart.length === 0}><Money /> Cash</button>
                        </div>
                        <button onClick={() => handleCompleteSale('Card')} className="btn-primary w-full mt-4" disabled={cart.length === 0 || processingSale}>
                            {processingSale ? (
                                <>
                                    <Sync className="animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : 'Complete Sale'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutComponent;
