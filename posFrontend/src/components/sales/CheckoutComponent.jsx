import React, { useState, useEffect } from 'react';
import { AddShoppingCart, RemoveShoppingCart, ClearAll, CreditCard, Money, Sync, ErrorOutline, Print } from '@mui/icons-material';
import api from '../../services/api';
import ProductCard from './ProductCard';
import {useKeycloak} from "@react-keycloak/web";

const CART_STORAGE_KEY = 'pos_checkout_cart';

const CheckoutComponent = () => {
    const {keycloak} = useKeycloak();
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingSale, setProcessingSale] = useState(false);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [taxRate, setTaxRate] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [amountTendered, setAmountTendered] = useState('');
    const [receipt, setReceipt] = useState(null);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES'
        }).format(value || 0);
    };

    // Persist cart to localStorage on every change
    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        } catch {
            // ignore storage errors
        }
    }, [cart]);

    // Fetch products and tax rate from backend on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [productsRes, taxRes] = await Promise.all([
                    api.getAllProducts(),
                    api.getTaxRate(),
                ]);
                setProducts(productsRes.data);
                setTaxRate((taxRes.data?.taxRate ?? 0) / 100);
                setError(null);
            } catch (err) {
                setError('Failed to fetch products. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const addToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id);
        const currentQuantity = existingItem ? existingItem.quantity : 0;

        if (currentQuantity >= Number(product.quantity || 0)) {
            return;
        }

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

    const handleCompleteSale = async () => {
        if (cart.length === 0 || processingSale) return;

        const tendered = parseFloat(amountTendered);
        if (paymentMethod === 'Cash' && (!amountTendered || tendered < total)) {
            setError('Amount tendered must be equal to or greater than the total.');
            return;
        }

        setProcessingSale(true);
        setError(null);

        const saleData = {
            cashierId: keycloak?.tokenParsed?.preferred_username || keycloak?.subject || 'system-user',
            paymentMethod,
            items: cart.map(item => ({
                productId: item.id,
                quantity: item.quantity,
            })),
            amountTendered: paymentMethod === 'Cash' ? tendered : total,
        };

        try {
            const response = await api.createSale(saleData);
            const savedSale = response?.data || {};

            setReceipt({
                saleId: savedSale.id || `TMP-${Date.now()}`,
                createdAt: savedSale.createdAt || new Date().toISOString(),
                cashierId: saleData.cashierId,
                paymentMethod,
                items: cart.map(item => ({
                    productId: item.id,
                    productName: item.name,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    lineTotal: item.price * item.quantity,
                })),
                subtotal,
                discountAmount,
                tax: savedSale.taxAmount ?? tax,
                total: savedSale.totalAmount ?? total,
                amountTendered: savedSale.amountTendered ?? tendered,
                changeGiven: savedSale.changeGiven ?? Math.max(0, tendered - total),
            });

            // Clear cart from state and localStorage
            setCart([]);
            localStorage.removeItem(CART_STORAGE_KEY);
            setDiscountPercent(0);
            setAmountTendered('');
        } catch (err) {
            setError('Failed to complete sale. Please check connection and try again.');
            console.error(err);
        } finally {
            setProcessingSale(false);
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = subtotal * (Number(discountPercent || 0) / 100);
    const taxableAmount = Math.max(subtotal - discountAmount, 0);
    const tax = taxableAmount * taxRate;
    const total = taxableAmount + tax;
    const tendered = parseFloat(amountTendered) || 0;
    const change = Math.max(0, tendered - total);

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
                        <button onClick={() => { setCart([]); localStorage.removeItem(CART_STORAGE_KEY); }} className="text-text-muted hover:text-accent-error" title="Clear Cart">
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
                                        <p className="text-sm text-text-secondary">{formatCurrency(item.price)} x {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
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
                        <div className="flex justify-between"><span>Subtotal</span><span className="text-data">{formatCurrency(subtotal)}</span></div>
                        <div className="flex justify-between items-center">
                            <label htmlFor="discount" className="text-sm">Discount (%)</label>
                            <input
                                id="discount"
                                min="0"
                                max="100"
                                type="number"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                                className="w-20 rounded-lg border border-border-secondary bg-bg-tertiary px-2 py-1 text-right text-data"
                            />
                        </div>
                        <div className="flex justify-between"><span>Discount</span><span className="text-data">-{formatCurrency(discountAmount)}</span></div>
                        <div className="flex justify-between"><span>Tax ({(taxRate * 100).toFixed(0)}%)</span><span className="text-data">{formatCurrency(tax)}</span></div>
                        <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-kpi">{formatCurrency(total)}</span></div>
                    </div>
                    <div className="mt-6">
                        <h3 className="font-bold mb-2">Payment Method</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setPaymentMethod('Card'); setAmountTendered(''); }}
                                className={`flex-1 btn-secondary flex items-center justify-center gap-2 ${paymentMethod === 'Card' ? 'ring-2 ring-brand-primary' : ''}`}
                                disabled={processingSale || cart.length === 0}
                            >
                                <CreditCard /> Card
                            </button>
                            <button
                                onClick={() => setPaymentMethod('Cash')}
                                className={`flex-1 btn-secondary flex items-center justify-center gap-2 ${paymentMethod === 'Cash' ? 'ring-2 ring-brand-primary' : ''}`}
                                disabled={processingSale || cart.length === 0}
                            >
                                <Money /> Cash
                            </button>
                        </div>

                        {/* Amount tendered — only shown for cash payments */}
                        {paymentMethod === 'Cash' && (
                            <div className="mt-3 space-y-1">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="amountTendered" className="text-sm font-medium">Amount Tendered</label>
                                    <input
                                        id="amountTendered"
                                        type="number"
                                        min={total}
                                        step="0.01"
                                        value={amountTendered}
                                        onChange={(e) => setAmountTendered(e.target.value)}
                                        placeholder={formatCurrency(total)}
                                        className="w-32 rounded-lg border border-border-secondary bg-bg-tertiary px-2 py-1 text-right text-data"
                                    />
                                </div>
                                {tendered > 0 && (
                                    <div className="flex justify-between font-semibold text-green-600">
                                        <span>Change</span>
                                        <span>{formatCurrency(change)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && <p className="mt-2 text-sm text-accent-error">{error}</p>}

                        <button onClick={handleCompleteSale} className="btn-primary w-full mt-4" disabled={cart.length === 0 || processingSale}>
                            {processingSale ? (
                                <>
                                    <Sync className="animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : 'Complete Sale'}
                        </button>
                    </div>
                </div>

                {receipt && (
                    <div className="card p-4 mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold">Receipt</h3>
                            <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
                                <Print sx={{fontSize: 18}}/> Print
                            </button>
                        </div>
                        <p className="text-sm text-text-secondary">Sale ID: {receipt.saleId}</p>
                        <p className="text-sm text-text-secondary">Cashier: {receipt.cashierId}</p>
                        <p className="text-sm text-text-secondary mb-3">Date: {new Date(receipt.createdAt).toLocaleString()}</p>
                        <div className="space-y-1 text-sm mb-3">
                            {receipt.items.map((item, index) => (
                                <div key={`${item.productId}-${index}`} className="flex justify-between">
                                    <span>{item.productName} x {item.quantity}</span>
                                    <span>{formatCurrency(item.lineTotal)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-border-secondary pt-2 space-y-1 text-sm">
                            <div className="flex justify-between"><span>Subtotal</span><span className="text-data">{formatCurrency(receipt.subtotal)}</span></div>
                            <div className="flex justify-between"><span>Discount</span><span className="text-data">-{formatCurrency(receipt.discountAmount)}</span></div>
                            <div className="flex justify-between"><span>Tax ({(taxRate * 100).toFixed(0)}%)</span><span className="text-data">{formatCurrency(receipt.tax)}</span></div>
                            <div className="flex justify-between font-bold"><span>Total</span><span className="text-data">{formatCurrency(receipt.total)}</span></div>
                            {receipt.paymentMethod === 'Cash' && (
                                <>
                                    <div className="flex justify-between"><span>Tendered</span><span>{formatCurrency(receipt.amountTendered)}</span></div>
                                    <div className="flex justify-between font-semibold text-green-600"><span>Change</span><span>{formatCurrency(receipt.changeGiven)}</span></div>
                                </>
                            )}
                            <div className="flex justify-between"><span>Payment</span><span>{receipt.paymentMethod}</span></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutComponent;
