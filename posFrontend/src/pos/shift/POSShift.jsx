import { useState } from 'react';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useKeycloak } from '@react-keycloak/web';

const MOCK_RECENT = [
    { id: '#1042', time: '20:14', amount: 42.50, method: 'Card' },
    { id: '#1041', time: '19:58', amount: 28.00, method: 'Cash' },
    { id: '#1040', time: '19:31', amount: 55.80, method: 'Card' },
    { id: '#1039', time: '19:05', amount: 14.00, method: 'Cash' },
    { id: '#1038', time: '18:47', amount: 89.00, method: 'Card' },
];

export default function POSShift() {
    const { keycloak } = useKeycloak();
    const cashierName = keycloak?.tokenParsed?.preferred_username ?? keycloak?.tokenParsed?.name ?? 'Cashier';

    const [shiftOpen, setShiftOpen] = useState(false);
    const [drawerAmount, setDrawerAmount] = useState('');
    const [shiftStartTime, setShiftStartTime] = useState(null);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closingCash, setClosingCash] = useState('');

    const expectedSales = MOCK_RECENT.reduce((sum, t) => sum + t.amount, 0);
    const closingCashNum = parseFloat(closingCash) || 0;
    const openingCash = parseFloat(drawerAmount) || 0;
    const cashSales = MOCK_RECENT.filter(t => t.method === 'Cash').reduce((sum, t) => sum + t.amount, 0);
    const expectedCash = openingCash + cashSales;
    const variance = closingCashNum - expectedCash;

    const handleOpenShift = () => {
        if (!drawerAmount || isNaN(parseFloat(drawerAmount))) return;
        setShiftStartTime(new Date());
        setShiftOpen(true);
    };

    const handleCloseShift = () => {
        setShiftOpen(false);
        setShowCloseModal(false);
        setDrawerAmount('');
        setClosingCash('');
        setShiftStartTime(null);
    };

    const formatTime = (date) => date?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) ?? '--:--';
    const elapsed = shiftStartTime ? Math.floor((Date.now() - shiftStartTime.getTime()) / 60000) : 0;

    return (
        <div className="flex flex-col h-full bg-[#0f0f0f] text-white overflow-y-auto">
            <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
                <AccessTimeRoundedIcon sx={{ fontSize: 28 }} className="text-brand-primary" />
                <h1 className="text-xl font-bold">Shift Management</h1>
            </div>

            <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-6">
                {!shiftOpen ? (
                    /* ── Open Shift ── */
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center">
                            <LockOpenRoundedIcon sx={{ fontSize: 32 }} className="text-brand-primary" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-white font-bold text-2xl">Open Shift</h2>
                            <p className="text-gray-500 text-sm mt-1">Enter the opening cash drawer amount to begin</p>
                        </div>
                        <div className="w-full max-w-xs space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">Opening Cash ($)</label>
                                <div className="relative">
                                    <AttachMoneyRoundedIcon sx={{ fontSize: 20 }} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={drawerAmount}
                                        onChange={e => setDrawerAmount(e.target.value)}
                                        className="w-full h-14 pl-11 pr-4 bg-[#111111] border border-white/10 rounded-2xl text-white text-lg font-semibold placeholder-gray-700 focus:outline-none focus:border-brand-primary/60 transition-colors"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleOpenShift}
                                disabled={!drawerAmount || isNaN(parseFloat(drawerAmount))}
                                className="w-full h-14 bg-brand-primary hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base rounded-2xl transition-colors"
                            >
                                Open Shift
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Shift Open ── */
                    <>
                        {/* Shift status card */}
                        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-emerald-400 font-semibold text-sm">Shift Active</span>
                                </div>
                                <button
                                    onClick={() => setShowCloseModal(true)}
                                    className="flex items-center gap-2 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                                >
                                    <LockRoundedIcon sx={{ fontSize: 16 }} />
                                    Close Shift
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Cashier',       value: cashierName },
                                    { label: 'Opened At',     value: formatTime(shiftStartTime) },
                                    { label: 'Duration',      value: `${elapsed}m` },
                                    { label: 'Opening Cash',  value: `$${openingCash.toFixed(2)}` },
                                ].map(stat => (
                                    <div key={stat.label} className="bg-black/20 rounded-2xl p-4">
                                        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">{stat.label}</p>
                                        <p className="text-white font-bold">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sales summary */}
                        <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <ReceiptLongRoundedIcon sx={{ fontSize: 20 }} className="text-brand-primary" />
                                <h2 className="text-white font-semibold">Recent Transactions</h2>
                                <span className="ml-auto text-brand-primary font-bold">${expectedSales.toFixed(2)}</span>
                            </div>
                            <div className="space-y-2">
                                {MOCK_RECENT.map(t => (
                                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-400 text-sm">{t.id}</span>
                                            <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{t.method}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-gray-500 text-xs">{t.time}</span>
                                            <span className="text-white font-semibold text-sm">${t.amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Close Shift Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-md border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-white font-bold text-lg">Close Shift Summary</h2>
                            <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-white">
                                <CloseRoundedIcon />
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            {[
                                { label: 'Opening Cash',     value: `$${openingCash.toFixed(2)}`,   color: 'text-white' },
                                { label: 'Cash Sales',       value: `$${cashSales.toFixed(2)}`,     color: 'text-white' },
                                { label: 'Expected Cash',    value: `$${expectedCash.toFixed(2)}`,  color: 'text-white' },
                                { label: 'Total Sales',      value: `$${expectedSales.toFixed(2)}`, color: 'text-emerald-400' },
                            ].map(row => (
                                <div key={row.label} className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400 text-sm">{row.label}</span>
                                    <span className={`font-semibold text-sm ${row.color}`}>{row.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mb-6">
                            <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">Closing Cash Count ($)</label>
                            <div className="relative">
                                <AttachMoneyRoundedIcon sx={{ fontSize: 20 }} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={closingCash}
                                    onChange={e => setClosingCash(e.target.value)}
                                    className="w-full h-12 pl-11 pr-4 bg-[#111111] border border-white/10 rounded-2xl text-white placeholder-gray-700 focus:outline-none focus:border-brand-primary/60 transition-colors"
                                />
                            </div>
                            {closingCash && (
                                <p className={`text-sm font-semibold mt-2 ${variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    Variance: {variance >= 0 ? '+' : ''}${variance.toFixed(2)}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowCloseModal(false)} className="flex-1 py-3 rounded-2xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white text-sm font-semibold transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleCloseShift} className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors">
                                Confirm Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
