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
const TABS = ['ALL', 'PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED'];

const EMPTY_FORM = { customerName: '', customerPhone: '', guestCount: 2, reservationTime: '', notes: '' };

export default function POSReservations() {
    const qc = useQueryClient();
    const [filter, setFilter] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const reservationsQuery = useQuery({
        queryKey: ['reservations'],
        queryFn: () => getReservations().then(r => r.data),
        staleTime: 30_000,
    });
    const reservations = useMemo(() => reservationsQuery.data ?? [], [reservationsQuery.data]);

    const createMut = useMutation({
        mutationFn: createReservation,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['reservations'] }); setShowModal(false); setForm(EMPTY_FORM); },
    });

    const statusMut = useMutation({
        mutationFn: ({ id, status }) => updateReservationStatus(id, status),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
    });

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
        <section className="pos-data-page">
            {/* Header */}
            <header className="pos-page-heading">
                <div>
                    <p className="hotel-eyebrow">GUEST SERVICE</p><h1>Reservations</h1>
                    <p>Manage bookings from the restaurant API.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="pos-primary-action">
                    <AddRoundedIcon /> New reservation
                </button>
            </header>

            {/* Tabs */}
            <div className="pos-filter-tabs">
                {TABS.map(t => (
                    <button key={t} onClick={() => setFilter(t)}
                        className={filter === t ? 'active' : ''}>
                        {t}
                        {t !== 'ALL' && counts[t] > 0 && (
                            <span className="bg-white/10 rounded-full px-1.5 py-0.5 text-[9px] font-black">{counts[t]}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Reservations grid */}
            <div>
                {reservationsQuery.isLoading ? <div className="pos-state">Loading reservations…</div> : reservationsQuery.isError ? <div className="pos-error" role="alert">Reservations could not be loaded. <button onClick={() => reservationsQuery.refetch()}>Try again</button></div> : filtered.length === 0 ? (
                    <div className="pos-state"><BookOnlineRoundedIcon /><strong>No reservations to show</strong><span>Bookings will appear here when they are added.</span></div>
                ) : (
                    <div className="pos-record-grid">
                        {filtered.map(r => {
                            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
                            const next = NEXT_STATUS[r.status];
                            return (
                                <div key={r.id} className="pos-reservation-card">
                                    {/* Status dot + status */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                            <span className="reservation-status">{cfg.label}</span>
                                        </div>
                                        <span className="reservation-id">#{r.id}</span>
                                    </div>

                                    {/* Guest name */}
                                    <h2>{r.customerName}</h2>

                                    {/* Info */}
                                    <div className="reservation-details">
                                        <div>
                                            <AccessTimeRoundedIcon sx={{ fontSize: 14 }} />
                                            <span>{fmtTime(r.reservationTime)}</span>
                                        </div>
                                        <div>
                                            <PeopleAltRoundedIcon sx={{ fontSize: 14 }} />
                                            <span>{r.guestCount} guests</span>
                                        </div>
                                        {r.customerPhone && (
                                            <div>
                                                <PhoneRoundedIcon sx={{ fontSize: 14 }} />
                                                <span>{r.customerPhone}</span>
                                            </div>
                                        )}
                                        {r.notes && <p>{r.notes}</p>}
                                    </div>

                                    {/* Actions */}
                                    <div className="reservation-actions">
                                        {next && (
                                            <button disabled={statusMut.isPending} onClick={() => statusMut.mutate({ id: r.id, status: next })} className="pos-secondary-action">
                                                {NEXT_LABEL[r.status]}
                                            </button>
                                        )}
                                        {['PENDING', 'CONFIRMED'].includes(r.status) && (
                                            <button disabled={statusMut.isPending} onClick={() => statusMut.mutate({ id: r.id, status: 'CANCELLED' })} className="pos-danger-action">
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
            {statusMut.isError && <p className="pos-error" role="alert">Reservation status could not be updated. {statusMut.error?.response?.data?.message || 'Try again.'}</p>}

            {/* New Reservation Modal */}
            {showModal && (
                <div className="pos-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
                    <section className="pos-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-dialog-title">
                        <header><h2 id="reservation-dialog-title">New reservation</h2><button aria-label="Close" onClick={() => setShowModal(false)}><CloseRoundedIcon /></button></header>
                        <form onSubmit={handleSubmit} className="reservation-form">
                            {[
                                { key: 'customerName', label: 'Guest Name', type: 'text', placeholder: 'Guest name', required: true },
                                { key: 'customerPhone', label: 'Phone', type: 'tel', placeholder: '+254 700 000000' },
                                { key: 'guestCount', label: 'Party Size', type: 'number', placeholder: '2', min: 1 },
                                { key: 'reservationTime', label: 'Date & Time', type: 'datetime-local', required: true },
                            ].map(f => (
                                <div key={f.key}>
                                    <label>{f.label}</label>
                                    <input type={f.type} placeholder={f.key === 'customerName' ? 'Guest name' : f.placeholder} required={f.required} min={f.min}
                                        value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                    />
                                </div>
                            ))}
                            <div>
                                <label>Notes</label>
                                <textarea rows={2} placeholder="Special requests..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                />
                            </div>
                            {createMut.isError && <p className="pos-error" role="alert">Reservation could not be saved. {createMut.error?.response?.data?.message || 'Try again.'}</p>}
                            <div className="reservation-form-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="pos-secondary-action">Cancel</button>
                                <button type="submit" disabled={createMut.isPending} className="pos-primary-action">
                                    {createMut.isPending ? 'Booking...' : 'Book Reservation'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </section>
    );
}
