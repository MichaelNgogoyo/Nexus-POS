import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpenses, createExpense, deleteExpense } from '../../services/api.js';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const CATEGORIES = ['RENT','SALARIES','ELECTRICITY','WATER','INTERNET','FUEL','MAINTENANCE','FOOD_SUPPLIES','MISCELLANEOUS'];

const CAT_COLORS = {
    RENT: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    SALARIES: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ELECTRICITY: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    WATER: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    INTERNET: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    FUEL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    MAINTENANCE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    FOOD_SUPPLIES: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    MISCELLANEOUS: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

const fmt = (v) => `KSh ${Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

export default function Expenses() {
    const qc = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ category: 'RENT', amount: '', description: '', expenseDate: new Date().toISOString().split('T')[0] });

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['expenses'],
        queryFn: () => getExpenses().then(r => r.data),
    });

    const createMut = useMutation({
        mutationFn: createExpense,
        onSuccess: () => { qc.invalidateQueries(['expenses']); setShowModal(false); setForm({ category: 'RENT', amount: '', description: '', expenseDate: new Date().toISOString().split('T')[0] }); },
    });

    const deleteMut = useMutation({
        mutationFn: deleteExpense,
        onSuccess: () => qc.invalidateQueries(['expenses']),
    });

    const totalThisMonth = expenses
        .filter(e => e.expenseDate?.startsWith(new Date().toISOString().slice(0, 7)))
        .reduce((s, e) => s + Number(e.amount || 0), 0);

    const totalAll = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    const byCategory = CATEGORIES.reduce((acc, cat) => {
        acc[cat] = expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0);
        return acc;
    }, {});

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.amount || !form.expenseDate) return;
        createMut.mutate({ ...form, amount: parseFloat(form.amount) });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-text-primary">Expense Management</h1>
                    <p className="text-text-muted text-sm mt-0.5">Track and categorize business expenses</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-all">
                    <AddRoundedIcon sx={{ fontSize: 18 }} /> Add Expense
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                    { label: 'This Month', value: fmt(totalThisMonth), color: 'border-l-red-500' },
                    { label: 'Top Category', value: topCategory ? `${topCategory[0].replace('_', ' ')}` : '—', color: 'border-l-amber-500' },
                    { label: 'Total Expenses', value: fmt(totalAll), color: 'border-l-violet-500' },
                    { label: 'Records', value: String(expenses.length), color: 'border-l-blue-500' },
                ].map(c => (
                    <div key={c.label} className={`bg-bg-secondary rounded-2xl border border-border-primary border-l-4 ${c.color} p-5`}>
                        <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">{c.label}</p>
                        <p className="text-2xl font-black text-text-primary mt-1">{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-bg-secondary rounded-2xl border border-border-primary overflow-hidden">
                <div className="px-5 py-4 border-b border-border-primary">
                    <h3 className="font-bold text-text-primary">All Expenses</h3>
                </div>
                {isLoading ? (
                    <div className="p-8 text-center text-text-muted">Loading expenses...</div>
                ) : expenses.length === 0 ? (
                    <div className="p-12 text-center">
                        <AttachMoneyRoundedIcon sx={{ fontSize: 48 }} className="text-text-muted opacity-30 mx-auto mb-3" />
                        <p className="text-text-muted">No expenses recorded yet</p>
                        <button onClick={() => setShowModal(true)} className="mt-3 text-brand-primary text-sm font-semibold hover:underline">Add your first expense</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border-primary bg-bg-tertiary">
                                <tr>
                                    {['Date','Category','Description','Amount',''].map(h => (
                                        <th key={h} className="text-left px-5 py-3 text-text-muted text-xs font-bold uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-primary">
                                {expenses.map(e => (
                                    <tr key={e.id} className="hover:bg-bg-tertiary transition-colors">
                                        <td className="px-5 py-3 text-text-secondary">{e.expenseDate}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${CAT_COLORS[e.category] || 'bg-gray-100 text-gray-600'}`}>
                                                {(e.category || '').replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-text-primary">{e.description || '—'}</td>
                                        <td className="px-5 py-3 font-bold text-text-primary">{fmt(e.amount)}</td>
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => deleteMut.mutate(e.id)} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                                <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-secondary rounded-2xl border border-border-primary w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
                            <h3 className="font-bold text-text-primary">Add Expense</h3>
                            <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary"><CloseRoundedIcon sx={{ fontSize: 20 }} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Category</label>
                                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                    className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand-primary">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Amount (KSh)</label>
                                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                    className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand-primary" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Date</label>
                                <input type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
                                    className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand-primary" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Description (optional)</label>
                                <textarea rows={3} placeholder="Add details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-brand-primary resize-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-semibold hover:bg-bg-primary transition-all">Cancel</button>
                                <button type="submit" disabled={createMut.isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-hover transition-all disabled:opacity-50">
                                    {createMut.isPending ? 'Saving...' : 'Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
