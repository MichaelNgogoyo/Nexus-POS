import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLog } from '../../services/api.js';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

const ACTION_COLORS = {
    CREATED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    UPDATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DELETED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    REFUND: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    DEFAULT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

function getActionColor(action = '') {
    if (action.includes('CREAT')) return ACTION_COLORS.CREATED;
    if (action.includes('UPDAT') || action.includes('CHANG')) return ACTION_COLORS.UPDATED;
    if (action.includes('DELET') || action.includes('REMOV')) return ACTION_COLORS.DELETED;
    if (action.includes('REFUND')) return ACTION_COLORS.REFUND;
    return ACTION_COLORS.DEFAULT;
}

export default function AuditLog() {
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['audit-log', page],
        queryFn: () => getAuditLog(page, 20).then(r => r.data),
        keepPreviousData: true,
    });

    const logs = data?.content ?? [];
    const totalPages = data?.totalPages ?? 0;

    const filtered = search
        ? logs.filter(l => l.actor?.toLowerCase().includes(search.toLowerCase()) || l.action?.toLowerCase().includes(search.toLowerCase()) || l.entityType?.toLowerCase().includes(search.toLowerCase()))
        : logs;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-text-primary">Audit Log</h1>
                    <p className="text-text-muted text-sm mt-0.5">Track all system actions and changes</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <SearchRoundedIcon sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" placeholder="Search by actor or action..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-bg-secondary border border-border-primary rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary" />
            </div>

            <div className="bg-bg-secondary rounded-2xl border border-border-primary overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-text-muted">Loading audit log...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <HistoryRoundedIcon sx={{ fontSize: 48 }} className="text-text-muted opacity-30 mx-auto mb-3" />
                        <p className="text-text-muted">No audit records found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border-primary bg-bg-tertiary">
                                <tr>
                                    {['Timestamp','Actor','Action','Entity','Before','After'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-bold uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-primary">
                                {filtered.map(log => (
                                    <tr key={log.id} className="hover:bg-bg-tertiary transition-colors">
                                        <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap font-mono">
                                            {log.timestamp ? new Date(log.timestamp).toLocaleString('en-KE') : '—'}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-text-primary text-xs">{log.actor || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getActionColor(log.action)}`}>{log.action || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-text-muted text-xs">
                                            {log.entityType && <span className="font-medium text-text-primary">{log.entityType}</span>}
                                            {log.entityId && <span className="text-text-muted ml-1">#{log.entityId}</span>}
                                        </td>
                                        <td className="px-4 py-3 max-w-[160px]">
                                            {log.beforeValue && (
                                                <code className="text-[10px] bg-bg-tertiary px-1.5 py-0.5 rounded font-mono text-red-400 block truncate">{log.beforeValue}</code>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 max-w-[160px]">
                                            {log.afterValue && (
                                                <code className="text-[10px] bg-bg-tertiary px-1.5 py-0.5 rounded font-mono text-emerald-400 block truncate">{log.afterValue}</code>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-text-muted">Page {page + 1} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                            className="p-2 rounded-xl bg-bg-secondary border border-border-primary text-text-primary disabled:opacity-40 hover:bg-bg-tertiary transition-all">
                            <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                            className="p-2 rounded-xl bg-bg-secondary border border-border-primary text-text-primary disabled:opacity-40 hover:bg-bg-tertiary transition-all">
                            <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
