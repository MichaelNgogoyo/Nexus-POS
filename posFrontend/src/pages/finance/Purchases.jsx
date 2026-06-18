import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPurchaseOrders, getSuppliers, createPurchaseOrder, updatePurchaseOrderStatus, receivePurchaseOrder } from '../../services/api.js';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';

const STATUS_STYLES = {
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    RECEIVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const fmt = (v) => `KSh ${Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

export default function Purchases() {
    const qc = useQueryClient();
    const [filter, setFilter] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ supplierId: '', notes: '', items: [{ productName: '', orderedQuantity: 1, unitCost: '' }] });

    const { data: orders = [], isLoading } = useQuery({ queryKey: ['purchase-orders'], queryFn: () => getPurchaseOrders().then(r => r.data) });
    const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => getSuppliers().then(r => r.data) });

    const createMut = useMutation({
        mutationFn: createPurchaseOrder,
        onSuccess: () => { qc.invalidateQueries(['purchase-orders']); setShowModal(false); },
    });

    const statusMut = useMutation({
        mutationFn: ({ id, status }) => updatePurchaseOrderStatus(id, status),
        onSuccess: () => qc.invalidateQueries(['purchase-orders']),
    });

    const receiveMut = useMutation({
        mutationFn: receivePurchaseOrder,
        onSuccess: () => qc.invalidateQueries(['purchase-orders']),
    });

    const TABS = ['ALL', 'DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'];
    const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

    const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productName: '', orderedQuantity: 1, unitCost: '' }] }));
    const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
    const updateItem = (i, key, val) => setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [key]: val } : item) }));

    const totalAmount = form.items.reduce((s, i) => s + (Number(i.orderedQuantity || 0) * Number(i.unitCost || 0)), 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        createMut.mutate({ supplierId: form.supplierId ? Number(form.supplierId) : null, notes: form.notes, items: form.items.map(i => ({ ...i, orderedQuantity: Number(i.orderedQuantity), unitCost: Number(i.unitCost), lineTotal: Number(i.orderedQuantity) * Number(i.unitCost) })), totalAmount });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-text-primary">Purchase Orders</h1>
                    <p className="text-text-muted text-sm mt-0.5">Manage procurement from suppliers</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-all">
                    <AddRoundedIcon sx={{ fontSize: 18 }} /> New Purchase Order
                </button>
            </div>

            {/* Status tabs */}
            <div className="flex gap-1 bg-bg-tertiary rounded-xl p-1 w-fit">
                {TABS.map(t => (
                    <button key={t} onClick={() => setFilter(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === t ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}>
                        {t}
                    </button>
                ))}
            </div>

            <div className="bg-bg-secondary rounded-2xl border border-border-primary overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-text-muted">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <ShoppingCartRoundedIcon sx={{ fontSize: 48 }} className="text-text-muted opacity-30 mx-auto mb-3" />
                        <p className="text-text-muted">No purchase orders found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border-primary bg-bg-tertiary">
                                <tr>
                                    {['PO #','Supplier','Items','Total','Status','Date','Actions'].map(h => (
                                        <th key={h} className="text-left px-5 py-3 text-text-muted text-xs font-bold uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-primary">
                                {filtered.map(o => (
                                    <tr key={o.id} className="hover:bg-bg-tertiary transition-colors">
                                        <td className="px-5 py-3 font-mono text-text-primary text-xs">{o.orderNumber}</td>
                                        <td className="px-5 py-3 text-text-primary">{o.supplier?.name || '—'}</td>
                                        <td className="px-5 py-3 text-text-secondary">{o.items?.length ?? 0} items</td>
                                        <td className="px-5 py-3 font-bold text-text-primary">{fmt(o.totalAmount)}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[o.status] || ''}`}>{o.status}</span>
                                        </td>
                                        <td className="px-5 py-3 text-text-muted text-xs">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex gap-1">
                                                {o.status === 'DRAFT' && (
                                                    <button onClick={() => statusMut.mutate({ id: o.id, status: 'SENT' })} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all" title="Mark Sent">
                                                        <SendRoundedIcon sx={{ fontSize: 14 }} />
                                                    </button>
                                                )}
                                                {o.status === 'SENT' && (
                                                    <button onClick={() => receiveMut.mutate(o.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all" title="Mark Received">
                                                        <CheckCircleRoundedIcon sx={{ fontSize: 14 }} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-secondary rounded-2xl border border-border-primary w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary sticky top-0 bg-bg-secondary">
                            <h3 className="font-bold text-text-primary">New Purchase Order</h3>
                            <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary"><CloseRoundedIcon sx={{ fontSize: 20 }} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Supplier</label>
                                <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
                                    className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand-primary">
                                    <option value="">Select supplier...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Items</label>
                                    <button type="button" onClick={addItem} className="text-xs text-brand-primary font-semibold hover:underline">+ Add Item</button>
                                </div>
                                <div className="space-y-2">
                                    {form.items.map((item, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input type="text" placeholder="Product name" value={item.productName} onChange={e => updateItem(i, 'productName', e.target.value)}
                                                className="flex-1 bg-bg-tertiary border border-border-primary rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                            <input type="number" min="1" placeholder="Qty" value={item.orderedQuantity} onChange={e => updateItem(i, 'orderedQuantity', e.target.value)}
                                                className="w-20 bg-bg-tertiary border border-border-primary rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                            <input type="number" min="0" step="0.01" placeholder="Unit cost" value={item.unitCost} onChange={e => updateItem(i, 'unitCost', e.target.value)}
                                                className="w-28 bg-bg-tertiary border border-border-primary rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                            {form.items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg"><CloseRoundedIcon sx={{ fontSize: 16 }} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-right text-sm font-bold text-text-primary mt-2">Total: {fmt(totalAmount)}</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Notes</label>
                                <textarea rows={2} placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand-primary resize-none" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-semibold">Cancel</button>
                                <button type="submit" disabled={createMut.isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-hover disabled:opacity-50">
                                    {createMut.isPending ? 'Creating...' : 'Create PO'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
