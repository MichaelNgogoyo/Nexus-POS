import { useState, useEffect, useCallback } from 'react';
import KitchenRoundedIcon from '@mui/icons-material/KitchenRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';

const COLUMNS = [
    { key: 'PENDING',   label: 'Pending',   color: 'text-amber-400',   dot: 'bg-amber-500',   nextLabel: 'Start Preparing' },
    { key: 'PREPARING', label: 'Preparing', color: 'text-blue-400',    dot: 'bg-blue-500',    nextLabel: 'Mark Ready' },
    { key: 'READY',     label: 'Ready',     color: 'text-emerald-400', dot: 'bg-emerald-500', nextLabel: 'Mark Served' },
    { key: 'SERVED',    label: 'Served',    color: 'text-gray-400',    dot: 'bg-gray-500',    nextLabel: null },
];

const NEXT_STATUS = { PENDING: 'PREPARING', PREPARING: 'READY', READY: 'SERVED' };

const INITIAL_TICKETS = [
    { id: 'KT-001', orderNo: '#1042', type: 'Dine In',  table: 'T-02', items: [{ name: 'Margherita Pizza', qty: 2 }, { name: 'Coke', qty: 2 }], status: 'PENDING',   priority: true,  startedAt: Date.now() - 16 * 60000 },
    { id: 'KT-002', orderNo: '#1043', type: 'Dine In',  table: 'T-07', items: [{ name: 'Pasta Carbonara', qty: 1 }, { name: 'Tiramisu', qty: 1 }], status: 'PREPARING', priority: false, startedAt: Date.now() - 12 * 60000 },
    { id: 'KT-003', orderNo: '#1044', type: 'Takeaway', table: null,   items: [{ name: 'Burger', qty: 2 }, { name: 'Fries', qty: 2 }, { name: 'Milkshake', qty: 1 }], status: 'PREPARING', priority: true, startedAt: Date.now() - 5 * 60000 },
    { id: 'KT-004', orderNo: '#1045', type: 'Delivery', table: null,   items: [{ name: 'BBQ Ribs', qty: 1 }, { name: 'Coleslaw', qty: 1 }, { name: 'Bread', qty: 2 }], status: 'READY', priority: false, startedAt: Date.now() - 22 * 60000 },
    { id: 'KT-005', orderNo: '#1048', type: 'Delivery', table: null,   items: [{ name: 'Chicken Wings', qty: 3 }, { name: 'Dipping Sauce', qty: 2 }], status: 'PENDING', priority: false, startedAt: Date.now() - 9 * 60000 },
    { id: 'KT-006', orderNo: '#1049', type: 'Dine In',  table: 'T-05', items: [{ name: 'Steak', qty: 1 }, { name: 'Mashed Potatoes', qty: 1 }, { name: 'Wine', qty: 1 }], status: 'READY', priority: true, startedAt: Date.now() - 18 * 60000 },
    { id: 'KT-007', orderNo: '#1050', type: 'Dine In',  table: 'T-03', items: [{ name: 'Caesar Salad', qty: 2 }, { name: 'Lemonade', qty: 2 }], status: 'SERVED', priority: false, startedAt: Date.now() - 35 * 60000 },
];

function ElapsedTimer({ startedAt }) {
    const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAt) / 60000));

    useEffect(() => {
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 60000)), 30000);
        return () => clearInterval(id);
    }, [startedAt]);

    const urgent = elapsed > 15;
    return (
        <span className={`text-xs font-semibold ${urgent ? 'text-red-400' : 'text-gray-400'}`}>
            {elapsed}m ago
        </span>
    );
}

export default function POSKitchen() {
    const [tickets, setTickets] = useState(INITIAL_TICKETS);

    const advance = useCallback((id) => {
        setTickets(prev => prev.map(t =>
            t.id === id && NEXT_STATUS[t.status]
                ? { ...t, status: NEXT_STATUS[t.status] }
                : t
        ));
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                <KitchenRoundedIcon sx={{ fontSize: 28 }} className="text-brand-primary" />
                <h1 className="text-xl font-bold">Kitchen Display</h1>
                <div className="flex gap-2 ml-auto">
                    {COLUMNS.map(c => (
                        <span key={c.key} className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full">
                            <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                            {c.label}: {tickets.filter(t => t.status === c.key).length}
                        </span>
                    ))}
                </div>
            </div>

            {/* Kanban columns */}
            <div className="flex gap-3 flex-1 overflow-x-auto p-4 pb-6">
                {COLUMNS.map(col => (
                    <div key={col.key} className="flex flex-col min-w-[260px] w-[260px] bg-[#111111] rounded-2xl overflow-hidden">
                        {/* Column header */}
                        <div className={`flex items-center gap-2 px-4 py-3 border-b border-white/5`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                            <h2 className={`font-semibold text-sm ${col.color}`}>{col.label}</h2>
                            <span className="ml-auto text-xs text-gray-600">{tickets.filter(t => t.status === col.key).length}</span>
                        </div>

                        {/* Tickets */}
                        <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
                            {tickets.filter(t => t.status === col.key).map(ticket => {
                                const urgentPending = ticket.status === 'PENDING' && (Date.now() - ticket.startedAt) > 15 * 60000;
                                return (
                                    <div
                                        key={ticket.id}
                                        className={`rounded-2xl p-4 border ${urgentPending ? 'bg-red-950/40 border-red-700/50' : 'bg-[#1a1a1a] border-white/5'}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-bold text-sm">{ticket.orderNo}</span>
                                            <div className="flex items-center gap-1">
                                                {ticket.priority && <LocalFireDepartmentRoundedIcon sx={{ fontSize: 16 }} className="text-red-400" />}
                                                {urgentPending && <LocalFireDepartmentRoundedIcon sx={{ fontSize: 16 }} className="text-red-500" />}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{ticket.type}</span>
                                            {ticket.table && <span className="text-[10px] text-gray-500">{ticket.table}</span>}
                                        </div>

                                        <ul className="space-y-1 mb-3">
                                            {ticket.items.map((item, i) => (
                                                <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                                    <span className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">{item.qty}</span>
                                                    {item.name}
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="flex items-center justify-between">
                                            <ElapsedTimer startedAt={ticket.startedAt} />
                                            {col.nextLabel && (
                                                <button
                                                    onClick={() => advance(ticket.id)}
                                                    className="flex items-center gap-1 text-[11px] font-semibold bg-brand-primary hover:bg-brand-hover text-white px-3 py-1.5 rounded-xl transition-colors"
                                                >
                                                    {col.nextLabel.split(' ').pop()}
                                                    <ArrowForwardRoundedIcon sx={{ fontSize: 12 }} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
