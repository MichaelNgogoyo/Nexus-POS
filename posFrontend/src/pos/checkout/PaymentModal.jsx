import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useKeycloak } from '@react-keycloak/web';
import { createSale, getTaxRate } from '../../services/api.js';
import { useCart } from '../../context/CartContext.jsx';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LocalAtmRoundedIcon from '@mui/icons-material/LocalAtm';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';

const PAYMENT_METHODS = [
    { value: 'CASH',  label: 'Cash',   Icon: LocalAtmRoundedIcon },
    { value: 'MPESA', label: 'M-Pesa', Icon: PhoneAndroidRoundedIcon },
    { value: 'CARD',  label: 'Card',   Icon: CreditCardRoundedIcon },
    { value: 'MIXED', label: 'Mixed',  Icon: CallSplitRoundedIcon },
];

export default function PaymentModal({ orderType, onClose }) {
    const { keycloak } = useKeycloak();
    const { cart, clearCart } = useCart();

    const [method, setMethod]         = useState('CASH');
    const [tendered, setTendered]     = useState('');
    const [phone, setPhone]           = useState('');
    const [reference, setReference]   = useState('');
    const [cardLast4, setCardLast4]   = useState('');
    const [mixedMethod1, setMixedMethod1] = useState('CASH');
    const [mixedAmount1, setMixedAmount1] = useState('');
    const [mixedMethod2, setMixedMethod2] = useState('MPESA');
    const [mixedAmount2, setMixedAmount2] = useState('');
    const [success, setSuccess]       = useState(false);

    const { data: taxData } = useQuery({
        queryKey: ['taxRate'],
        queryFn: () => getTaxRate().then(r => r.data),
        staleTime: 300_000,
    });

    const taxRate  = taxData?.taxRate ?? 16;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total    = subtotal * (1 + taxRate / 100);

    const tenderedNum = parseFloat(tendered) || 0;
    const change      = method === 'CASH' && tenderedNum > total ? tenderedNum - total : 0;

    const { mutate: submitSale, isPending } = useMutation({
        mutationFn: (saleData) => createSale(saleData),
        onSuccess: () => {
            setSuccess(true);
            setTimeout(() => {
                clearCart();
                onClose();
            }, 2000);
        },
    });

    const handleComplete = () => {
        submitSale({
            cashierId: keycloak?.tokenParsed?.sub,
            totalAmount: Math.round(total),
            paymentMethod: method,
            orderType,
            items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: i.price })),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
                {success ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8 gap-4">
                        <CheckCircleRoundedIcon sx={{ fontSize: 72 }} className="text-emerald-400" />
                        <p className="text-white text-2xl font-bold">Payment Successful!</p>
                        <p className="text-gray-400">KSh {Math.round(total).toLocaleString()} received</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h2 className="text-white font-bold text-lg">Payment</h2>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                <CloseRoundedIcon />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Amount due */}
                            <div className="bg-[#111] rounded-xl p-4 text-center">
                                <p className="text-gray-400 text-sm mb-1">Amount Due</p>
                                <p className="text-white text-4xl font-bold">
                                    KSh {Math.round(total).toLocaleString()}
                                </p>
                            </div>

                            {/* Payment method selector */}
                            <div>
                                <p className="text-gray-400 text-sm mb-2 font-medium">Payment Method</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {PAYMENT_METHODS.map((pm) => {
                                        const PmIcon = pm.Icon;
                                        return (
                                        <button
                                            key={pm.value}
                                            onClick={() => setMethod(pm.value)}
                                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                                                method === pm.value
                                                    ? 'border-violet-500 bg-violet-600/20 text-violet-400'
                                                    : 'border-white/10 bg-[#111] text-gray-400 hover:bg-white/5'
                                            }`}
                                        >
                                            <PmIcon sx={{ fontSize: 22 }} />
                                            <span className="text-xs font-medium">{pm.label}</span>
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Method-specific inputs */}
                            {method === 'CASH' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-gray-400 text-sm block mb-1">
                                            Amount Tendered (KSh)
                                        </label>
                                        <input
                                            type="number"
                                            value={tendered}
                                            onChange={e => setTendered(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full h-12 bg-[#111] border border-white/10 rounded-xl px-4 text-white text-lg font-semibold focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    {tenderedNum > 0 && (
                                        <div className={`flex justify-between items-center rounded-xl px-4 py-3 border ${
                                            change >= 0
                                                ? 'bg-emerald-600/10 border-emerald-500/20'
                                                : 'bg-red-600/10 border-red-500/20'
                                        }`}>
                                            <span className={change >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                                                {change >= 0 ? 'Change' : 'Short by'}
                                            </span>
                                            <span className={`font-bold text-lg ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                KSh {Math.abs(change).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {method === 'MPESA' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-gray-400 text-sm block mb-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="0700 000 000"
                                            className="w-full h-12 bg-[#111] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-sm block mb-1">M-Pesa Reference</label>
                                        <input
                                            type="text"
                                            value={reference}
                                            onChange={e => setReference(e.target.value)}
                                            placeholder="QTZ123456"
                                            className="w-full h-12 bg-[#111] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {method === 'CARD' && (
                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">Card Last 4 Digits</label>
                                    <input
                                        type="text"
                                        value={cardLast4}
                                        onChange={e => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="1234"
                                        maxLength={4}
                                        className="w-full h-12 bg-[#111] border border-white/10 rounded-xl px-4 text-white tracking-widest text-lg focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            )}

                            {method === 'MIXED' && (
                                <div className="space-y-3">
                                    {[
                                        {
                                            label: 'Method 1',
                                            sel: mixedMethod1,
                                            setSel: setMixedMethod1,
                                            amt: mixedAmount1,
                                            setAmt: setMixedAmount1,
                                        },
                                        {
                                            label: 'Method 2',
                                            sel: mixedMethod2,
                                            setSel: setMixedMethod2,
                                            amt: mixedAmount2,
                                            setAmt: setMixedAmount2,
                                        },
                                    ].map(({ label, sel, setSel, amt, setAmt }) => (
                                        <div key={label} className="flex gap-2">
                                            <select
                                                value={sel}
                                                onChange={e => setSel(e.target.value)}
                                                className="flex-1 h-12 bg-[#111] border border-white/10 rounded-xl px-3 text-white focus:outline-none focus:border-violet-500"
                                            >
                                                <option value="CASH">Cash</option>
                                                <option value="MPESA">M-Pesa</option>
                                                <option value="CARD">Card</option>
                                            </select>
                                            <input
                                                type="number"
                                                value={amt}
                                                onChange={e => setAmt(e.target.value)}
                                                placeholder="KSh"
                                                className="flex-1 h-12 bg-[#111] border border-white/10 rounded-xl px-3 text-white focus:outline-none focus:border-violet-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={onClose}
                                className="flex-1 h-12 rounded-xl bg-[#2a2a2a] text-gray-300 hover:bg-[#333] font-medium transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={isPending || cart.length === 0}
                                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all flex items-center justify-center gap-2"
                            >
                                {isPending ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircleRoundedIcon sx={{ fontSize: 20 }} />
                                        Complete Payment
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
