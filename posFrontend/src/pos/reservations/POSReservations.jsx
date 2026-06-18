import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReservations, createReservation, updateReservationStatus } from '../../services/api.js';
import BookOnlineRoundedIcon from '@mui/icons-material/BookOnlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';

const STATUS_CONFIG = {
    PENDING:   { label: 'Pending',   color: 'bg-amber-900/30 border-amber-700/50 text-amber-400', dot: 'bg-amber-400' },
    CONFIRMED: { label: 'Confirmed', color: 'bg-blue-900/30 border-blue-700/50 text-blue-400',   dot: 'bg-blue-400' },
    SEATED:    { label: 'Seated',    color: 'bg-violet-900/30 border-violet-700/50 text-violet-400', dot: 'bg-violet-400' },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400', dot: 'bg-emerald-400' },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-900/30 border-red-700/50 text-red-400',     dot: 'bg-red-400' },
    NO_SHOW:   { label: 'No Show',   color: 'bg-gray-800/50 border-gray-700/50 text-gray-400',   dot: 'bg-gray-400' },
};

const NEXT_STATUS = { PENDING: 'CONFIRMED', CONFIRMED: 'SEATED', SEATED: 'COMPLETED' };
const NEXT_LABEL  = { PENDING: 'Confirm', CONFIRMED: 'Seat', SEATED: 'Complete' };

const EMPTY_FORM = { customerName: '', customerPhone: '', guestCount: 2, reservationTime: '', notes: '' };

// Mock data for when API is not ready
const MOCK = [
    { id: 1, customerName: 'Alice Wanjiku', customerPhone: '+254 712 345678', guestCount: 4, reservationTime: new Date(Date.now() + 3600000).toISOString(), status: 'CONFIRMED', notes: 'Birthday dinner, please prepare cake' },
    { id: 2, customerName: 'Bob Kamau', customerPhone: '+254 722 987654', guestCount: 2, reservationTime: new Date(Date.now() + 7200000).toISOString(), status: 'PENDING', notes: '' },
    { id: 3, customerName: 'Carol Achieng', customerPhone: '+254 733 111222', guestCount: 6, reservationTime: new Date(Date.now() + 10800000).toISOString(), status: 'SEATED', notes: 'VIP table requested' },
    { id: 4, customerName: 'David Omondi', customerPhone: '+254 700 555666', guestCount: 3, reservationTime: new Date(Date.now() - 3600000).toISOString(), status: 'COMPLETED', notes: '' },
];

export default function POSReservations() {
    const qc = useQueryClient();
    const [filter, setFilter] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const { data: reservations = MOCK } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => getReservations().then(r => r.data).catch(() => MOCK),
        staleTime: 30_000,
    });

    const createMut = useMutation({
        mutationFn: createReservation,
        onSuccess: () => { qc.invalidateQueries(['reservations']); setShowModal(false); setForm(EMPTY_FORM); },
        onError: () => { qc.invalidateQueries(['reservations']); setShowModal(false); },
    });

    const statusMut = useMutation({
        mutationFn: ({ id, status }) => updateReservationStatus(id, status),
        onSuccess: () => qc.invalidateQueries(['reservations']),
    });

    const TABS = ['ALL', 'PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED'];
    const filtered = useMemo(() =>
        filter === 'ALL' ? reservations : reservations.filter(r => r.status === filter),
        [reservations, filter]);

    const counts = useMemo(() =>
        TABS.slice(1).reduce((acc, s) => ({ ...acc, [s]: reservations.filter(r => r.status === s).length }), {}),
        [reservations]);

    const fmtTime = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleString('en-KE', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        createMut.mutate({ ...form, guestCount: Number(form.guestCount) });
    };

    return (
        <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-black text-white">Reservations</h1>
                    <p className="text-gray-500 text-xs mt-0.5">{new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-all">
                    <AddRoundedIcon sx={{ fontSize: 18 }} /> New Reservation
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 py-3 border-b border-white/5 flex gap-2 overflow-x-auto shrink-0">
                {TABS.map(t => (
                    <button key={t} onClick={() => setFilter(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5
                            ${filter === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                        {t}
                        {t !== 'ALL' && counts[t] > 0 && (
                            <span className="bg-white/10 rounded-full px-1.5 py-0.5 text-[9px] font-black">{counts[t]}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Reservations grid */}
            <div className="flex-1 overflow-y-auto p-6">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600">
                        <BookOnlineRoundedIcon sx={{ fontSize: 48 }} className="mb-3 opacity-30" />
                        <p>No reservations found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map(r => {
                            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
                            const next = NEXT_STATUS[r.status];
                            return (
                                <div key={r.id} className={`rounded-2xl border p-5 ${cfg.color} transition-all hover:scale-[1.01]`}>
                                    {/* Status dot + status */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
                                            <span className="text-xs font-bold uppercase tracking-wider opacity-80">{cfg.label}</span>
                                        </div>
                                        <span className="text-xs opacity-50">#{r.id}</span>
                                    </div>

                                    {/* Guest name */}
                                    <h3 className="text-lg font-black text-white mb-1">{r.customerName}</h3>

                                    {/* Info */}
                                    <div className="space-y-1.5 mb-4">
                                        <div className="flex items-center gap-2 text-xs opacity-70">
                                            <AccessTimeRoundedIcon sx={{ fontSize: 14 }} />
                                            <span>{fmtTime(r.reservationTime)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs opacity-70">
                                            <PeopleAltRoundedIcon sx={{ fontSize: 14 }} />
                                            <span>{r.guestCount} guests</span>
                                        </div>
                                        {r.customerPhone && (
                                            <div className="flex items-center gap-2 text-xs opacity-70">
                                                <PhoneRoundedIcon sx={{ fontSize: 14 }} />
                                                <span>{r.customerPhone}</span>
                                            </div>
                                        )}
                                        {r.notes && <p className="text-xs opacity-60 mt-1 italic">{r.notes}</p>}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {next && (
                                            <button onClick={() => statusMut.mutate({ id: r.id, status: next })}
                                                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all">
                                                {NEXT_LABEL[r.status]}
                                            </button>
                                        )}
                                        {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
                                            <button onClick={() => statusMut.mutate({ id: r.id, status: 'CANCELLED' })}
                                                className="py-2 px-3 rounded-xl bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-bold transition-all">
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* New Reservation Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h3 className="font-bold text-white">New Reservation</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><CloseRoundedIcon sx={{ fontSize: 20 }} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {[
                                { key: 'customerName', label: 'Guest Name', type: 'text', placeholder: 'John Doe', required: true },
                                { key: 'customerPhone', label: 'Phone', type: 'tel', placeholder: '+254 700 000000' },
                                { key: 'guestCount', label: 'Party Size', type: 'number', placeholder: '2', min: 1 },
                                { key: 'reservationTime', label: 'Date & Time', type: 'datetime-local', required: true },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">{f.label}</label>
                                    <input type={f.type} placeholder={f.placeholder} required={f.required} min={f.min}
                                        value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 placeholder-gray-600" />
                                </div>
                            ))}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Notes</label>
                                <textarea rows={2} placeholder="Special requests..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 placeholder-gray-600 resize-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm font-semibold hover:bg-white/10">Cancel</button>
                                <button type="submit" disabled={createMut.isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50">
                                    {createMut.isPending ? 'Booking...' : 'Book Reservation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
