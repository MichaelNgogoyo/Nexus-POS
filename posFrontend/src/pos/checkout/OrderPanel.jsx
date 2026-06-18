import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTaxRate } from '../../services/api.js';
import { useCart } from '../../context/CartContext.jsx';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LocalDiningRoundedIcon from '@mui/icons-material/LocalDiningRounded';

const ORDER_TYPE_LABELS = {
    DINE_IN: 'Dine In',
    TAKEAWAY: 'Takeaway',
    DELIVERY: 'Delivery',
};

export default function OrderPanel({ orderType, onPaymentOpen }) {
    const { cart, addToCart, removeFromCart, setCart } = useCart();
    const [notes, setNotes] = useState('');
    const [orderNumber] = useState(() => Math.floor(Math.random() * 9000) + 1000);

    const { data: taxData } = useQuery({
        queryKey: ['taxRate'],
        queryFn: () => getTaxRate().then(r => r.data),
        staleTime: 300_000,
    });

    const taxRate = taxData?.taxRate ?? 16;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const removeItemCompletely = (productId) => {
        setCart(prev => prev.filter(i => i.id !== productId));
    };

    return (
        <aside className="w-80 flex-shrink-0 bg-[#111111] flex flex-col h-full border-l border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-400 text-xs font-semibold">
                    {ORDER_TYPE_LABELS[orderType] ?? orderType}
                </span>
                <span className="text-gray-500 text-sm">Order #{orderNumber}</span>
            </div>

            {/* Order items — scrollable */}
            <div className="flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                        <ReceiptLongRoundedIcon sx={{ fontSize: 48 }} />
                        <p className="text-sm">No items added</p>
                    </div>
                ) : (
                    <div className="p-3 space-y-2">
                        {cart.map(item => (
                            <div key={item.id} className="bg-[#1a1a1a] rounded-xl p-3 border border-white/5">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <p className="text-white text-sm font-medium leading-tight flex-1 line-clamp-2">
                                        {item.name}
                                    </p>
                                    <button
                                        onClick={() => removeItemCompletely(item.id)}
                                        className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                                        aria-label={`Remove ${item.name}`}
                                    >
                                        <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    {/* Qty controls */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="w-8 h-8 bg-[#2a2a2a] rounded-lg flex items-center justify-center text-gray-300 hover:bg-[#333] hover:text-white transition-all"
                                            aria-label="Decrease quantity"
                                        >
                                            <RemoveRoundedIcon sx={{ fontSize: 16 }} />
                                        </button>
                                        <span className="text-white font-semibold text-sm w-6 text-center">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => addToCart(item)}
                                            className="w-8 h-8 bg-[#2a2a2a] rounded-lg flex items-center justify-center text-gray-300 hover:bg-[#333] hover:text-white transition-all"
                                            aria-label="Increase quantity"
                                        >
                                            <AddRoundedIcon sx={{ fontSize: 16 }} />
                                        </button>
                                    </div>
                                    {/* Line total */}
                                    <p className="text-gray-300 text-sm font-semibold">
                                        KSh {(item.price * item.quantity).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Notes */}
            <div className="px-3 pt-3 pb-2 border-t border-white/5">
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add order notes..."
                    rows={2}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
                />
            </div>

            {/* Totals */}
            <div className="px-4 py-3 border-t border-white/5 space-y-1.5">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-gray-300">KSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tax ({taxRate}%)</span>
                    <span className="text-gray-300">KSh {Math.round(taxAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1 border-t border-white/10">
                    <span className="text-white">Total</span>
                    <span className="text-white">KSh {Math.round(total).toLocaleString()}</span>
                </div>
            </div>

            {/* Action buttons */}
            <div className="p-3 border-t border-white/5 grid grid-cols-3 gap-2">
                <button
                    className="h-12 rounded-xl bg-[#2a2a2a] text-gray-300 hover:bg-[#333] text-sm font-medium transition-all"
                >
                    Hold
                </button>
                <button
                    className="h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-all flex items-center justify-center gap-1"
                >
                    <LocalDiningRoundedIcon sx={{ fontSize: 18 }} />
                    Kitchen
                </button>
                <button
                    onClick={() => cart.length > 0 && onPaymentOpen()}
                    disabled={cart.length === 0}
                    className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all"
                >
                    Pay&nbsp;KSh {Math.round(total).toLocaleString()}
                </button>
            </div>
        </aside>
    );
}
