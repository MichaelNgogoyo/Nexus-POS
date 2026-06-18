import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTaxRate } from '../../services/api.js';
import { useCart } from '../../context/CartContext.jsx';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LocalDiningRoundedIcon from '@mui/icons-material/LocalDiningRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded';

const ORDER_TYPE_LABELS = {
    DINE_IN: 'Dine In',
    TAKEAWAY: 'Takeaway',
    DELIVERY: 'Delivery',
};

const ORDER_TYPE_COLORS = {
    DINE_IN:  'bg-violet-600/20 text-violet-400 border-violet-500/30',
    TAKEAWAY: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
    DELIVERY: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
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

    const taxRate  = taxData?.taxRate ?? 16;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmt   = subtotal * (taxRate / 100);
    const total    = subtotal + taxAmt;

    const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id));
    const clearCart  = () => setCart([]);

    const typeColor = ORDER_TYPE_COLORS[orderType] ?? 'bg-violet-600/20 text-violet-400 border-violet-500/30';

    return (
        <aside className="w-[420px] flex-shrink-0 bg-[#0f0f0f] flex flex-col h-full border-l border-white/5">

            {/* ── Order header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl border text-sm font-bold ${typeColor}`}>
                        {ORDER_TYPE_LABELS[orderType] ?? orderType}
                    </span>
                    <span className="text-gray-600 text-sm font-mono">#{orderNumber}</span>
                </div>
                {cart.length > 0 && (
                    <button
                        onClick={clearCart}
                        className="text-xs text-gray-600 hover:text-red-400 transition-colors font-medium"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* ── Customer row ── */}
            <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
                <button className="flex items-center gap-3 w-full h-12 bg-[#1a1a1a] hover:bg-[#222] border border-white/8 rounded-2xl px-4 transition-all text-left group">
                    <PersonOutlineRoundedIcon sx={{ fontSize: 20 }} className="text-gray-500 group-hover:text-violet-400 transition-colors" />
                    <div className="flex-1">
                        <p className="text-gray-400 text-sm group-hover:text-white transition-colors">Walk-in Customer</p>
                    </div>
                    <span className="text-gray-600 text-xs">Tap to select</span>
                </button>
            </div>

            {/* ── Cart items — scrollable ── */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-4 py-12">
                        <ReceiptLongRoundedIcon sx={{ fontSize: 56 }} />
                        <div className="text-center">
                            <p className="text-base font-semibold text-gray-500">Order is empty</p>
                            <p className="text-sm text-gray-700 mt-1">Tap products to add them</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 space-y-2.5">
                        {cart.map((item, idx) => (
                            <div
                                key={item.id}
                                className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors"
                            >
                                {/* Item name + delete */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <p className="text-white font-semibold leading-tight flex-1 text-[15px]">
                                        {item.name}
                                    </p>
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
                                        aria-label={`Remove ${item.name}`}
                                    >
                                        <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                                    </button>
                                </div>

                                {/* Qty controls + line price */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center bg-[#222] rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="w-12 h-12 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#2a2a2a] transition-all"
                                            aria-label="Decrease"
                                        >
                                            <RemoveRoundedIcon sx={{ fontSize: 18 }} />
                                        </button>
                                        <span className="text-white font-bold text-lg w-10 text-center">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => addToCart(item)}
                                            className="w-12 h-12 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#2a2a2a] transition-all"
                                            aria-label="Increase"
                                        >
                                            <AddRoundedIcon sx={{ fontSize: 18 }} />
                                        </button>
                                    </div>
                                    <p className="text-white font-bold text-lg">
                                        KSh {(item.price * item.quantity).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Notes ── */}
            <div className="px-4 py-3 border-t border-white/5 flex-shrink-0">
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Order notes (e.g. no onions, extra spicy)..."
                    rows={2}
                    className="w-full bg-[#1a1a1a] border border-white/8 rounded-2xl p-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none transition-all"
                />
            </div>

            {/* ── Order summary ── */}
            <div className="px-5 py-4 border-t border-white/5 space-y-2 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Subtotal</span>
                    <span className="text-gray-200 text-sm font-medium">KSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Tax ({taxRate}%)</span>
                    <span className="text-gray-200 text-sm font-medium">KSh {Math.round(taxAmt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/8">
                    <span className="text-white font-bold text-lg">Total</span>
                    <span className="text-white font-black text-2xl tracking-tight">
                        KSh {Math.round(total).toLocaleString()}
                    </span>
                </div>
            </div>

            {/* ── Action buttons ── */}
            <div className="px-4 pb-4 flex-shrink-0 space-y-2.5">
                {/* Secondary row */}
                <div className="grid grid-cols-2 gap-2.5">
                    <button className="h-14 rounded-2xl bg-[#1e1e1e] hover:bg-[#252525] border border-white/8 text-gray-300 text-sm font-semibold transition-all flex items-center justify-center gap-2">
                        <PauseCircleOutlineRoundedIcon sx={{ fontSize: 20 }} />
                        Hold Order
                    </button>
                    <button className="h-14 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 text-sm font-semibold transition-all flex items-center justify-center gap-2">
                        <LocalDiningRoundedIcon sx={{ fontSize: 20 }} />
                        Send Kitchen
                    </button>
                </div>

                {/* Pay button — primary CTA */}
                <button
                    onClick={() => cart.length > 0 && onPaymentOpen()}
                    disabled={cart.length === 0}
                    className="w-full h-[72px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-35 disabled:cursor-not-allowed text-white font-black text-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                >
                    {cart.length === 0 ? 'Add items to pay' : `Pay  KSh ${Math.round(total).toLocaleString()}`}
                </button>
            </div>
        </aside>
    );
}
