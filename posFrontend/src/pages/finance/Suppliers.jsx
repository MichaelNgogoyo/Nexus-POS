import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSuppliers, createSupplier } from '../../services/api.js';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';

const EMPTY = { name: '', contactName: '', phone: '', email: '', address: '' };

export default function Suppliers() {
    const qc = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => getSuppliers().then(r => r.data),
    });

    const createMut = useMutation({
        mutationFn: createSupplier,
        onSuccess: () => { qc.invalidateQueries(['suppliers']); setShowModal(false); setForm(EMPTY); },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name) return;
        createMut.mutate(form);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-text-primary">Suppliers</h1>
                    <p className="text-text-muted text-sm mt-0.5">Manage your suppliers and vendors</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-all">
                    <AddRoundedIcon sx={{ fontSize: 18 }} /> Add Supplier
                </button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-bg-secondary rounded-2xl animate-pulse" />)}
                </div>
            ) : suppliers.length === 0 ? (
                <div className="bg-bg-secondary rounded-2xl border border-border-primary p-12 text-center">
                    <LocalShippingRoundedIcon sx={{ fontSize: 48 }} className="text-text-muted opacity-30 mx-auto mb-3" />
                    <p className="text-text-muted">No suppliers yet</p>
                    <button onClick={() => setShowModal(true)} className="mt-3 text-brand-primary text-sm font-semibold hover:underline">Add your first supplier</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suppliers.map(s => (
                        <div key={s.id} className="bg-bg-secondary rounded-2xl border border-border-primary p-5 hover:shadow-lg transition-all">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 rounded-xl bg-brand-primary/10">
                                    <LocalShippingRoundedIcon sx={{ fontSize: 20 }} className="text-brand-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-text-primary truncate">{s.name}</p>
                                    {s.contactName && <p className="text-xs text-text-muted">{s.contactName}</p>}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.active !== false ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500'}`}>
                                    {s.active !== false ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                {s.phone && (
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        <PhoneRoundedIcon sx={{ fontSize: 14 }} /> {s.phone}
                                    </div>
                                )}
                                {s.email && (
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        <EmailRoundedIcon sx={{ fontSize: 14 }} /> {s.email}
                                    </div>
                                )}
                                {s.address && <p className="text-xs text-text-muted truncate">{s.address}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-secondary rounded-2xl border border-border-primary w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
                            <h3 className="font-bold text-text-primary">Add Supplier</h3>
                            <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary"><CloseRoundedIcon sx={{ fontSize: 20 }} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {[
                                { key: 'name', label: 'Supplier Name', required: true, placeholder: 'e.g. Fresh Foods Ltd' },
                                { key: 'contactName', label: 'Contact Person', placeholder: 'e.g. John Doe' },
                                { key: 'phone', label: 'Phone', placeholder: '+254 700 000000' },
                                { key: 'email', label: 'Email', placeholder: 'info@supplier.com' },
                                { key: 'address', label: 'Address', placeholder: 'Nairobi, Kenya' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">{f.label}</label>
                                    <input type="text" placeholder={f.placeholder} required={f.required} value={form[f.key]}
                                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand-primary" />
                                </div>
                            ))}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-semibold">Cancel</button>
                                <button type="submit" disabled={createMut.isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-hover disabled:opacity-50">
                                    {createMut.isPending ? 'Saving...' : 'Add Supplier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
