import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import TableRestaurantRoundedIcon from '@mui/icons-material/TableRestaurantRounded';
import ChairRoundedIcon from '@mui/icons-material/ChairRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { createTable, getAllTables, updateTableStatus } from '../../services/api.js';
import { usePermissions } from '../../auth/permissions.js';

const STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'];
const STATUS_LABEL = { AVAILABLE: 'Available', OCCUPIED: 'Occupied', RESERVED: 'Reserved', CLEANING: 'Cleaning' };
const MANAGER_TRANSITIONS = {
    AVAILABLE: ['RESERVED', 'CLEANING'],
    RESERVED: ['AVAILABLE', 'CLEANING'],
    OCCUPIED: ['CLEANING'],
    CLEANING: ['AVAILABLE'],
};

export default function POSTables() {
    const navigate = useNavigate();
    const client = useQueryClient();
    const { roles } = usePermissions();
    const canManageTables = roles.includes('ADMIN') || roles.includes('MANAGER');
    const [floor, setFloor] = useState('ALL');
    const [selected, setSelected] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [newTable, setNewTable] = useState({ name: '', floor: '', capacity: '' });
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    const tablesQuery = useQuery({
        queryKey: ['tables'],
        queryFn: () => getAllTables({ suppressToast: true }).then(({ data }) => data),
        staleTime: 0,
        refetchInterval: isOnline ? 10_000 : false,
        refetchIntervalInBackground: false,
        refetchOnReconnect: true,
    });
    const tables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data]);
    const floors = useMemo(() => ['ALL', ...new Set(tables.map((table) => table.floor || 'Unassigned'))], [tables]);
    const visible = tables.filter((table) => floor === 'ALL' || (table.floor || 'Unassigned') === floor);
    const statusMutation = useMutation({
        mutationFn: ({ id, status }) => updateTableStatus(id, status),
        onSuccess: () => { client.invalidateQueries({ queryKey: ['tables'] }); setSelected(null); },
        onError: () => client.invalidateQueries({ queryKey: ['tables'] }),
    });
    const createMutation = useMutation({
        mutationFn: (payload) => createTable(payload),
        onSuccess: () => {
            client.invalidateQueries({ queryKey: ['tables'] });
            setNewTable({ name: '', floor: '', capacity: '' });
            setCreateOpen(false);
        },
    });
    useEffect(() => {
        const onOnline = () => { setIsOnline(true); client.invalidateQueries({ queryKey: ['tables'] }); };
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, [client]);
    useEffect(() => {
        if (!selected) return;
        const freshSelection = tables.find((table) => table.id === selected.id);
        if (freshSelection && freshSelection !== selected) setSelected(freshSelection);
    }, [selected, tables]);
    const counts = STATUSES.reduce((result, status) => ({ ...result, [status]: tables.filter((table) => table.status === status).length }), {});

    return <section className="pos-data-page">
        <header className="pos-page-heading"><div><p className="hotel-eyebrow">FLOOR</p><h1>Table service</h1><p>Table state syncs every 10 seconds and when this device reconnects.</p><p role="status" aria-live="polite" className={isOnline ? 'pos-sync-status is-connected' : 'pos-sync-status is-offline'}>{!isOnline ? 'Offline · showing last synced table state' : tablesQuery.isError ? 'Connection interrupted · retrying table sync' : `Connected${tablesQuery.dataUpdatedAt ? ` · synced ${new Date(tablesQuery.dataUpdatedAt).toLocaleTimeString()}` : ''}`}</p></div><div className="pos-table-page-actions">{canManageTables && <button className="pos-primary-action" onClick={() => setCreateOpen(true)}><AddRoundedIcon /> Add table</button>}<button className="pos-secondary-action" onClick={() => tablesQuery.refetch()}><RefreshRoundedIcon /> Refresh</button></div></header>
        <div className="pos-stat-strip">{STATUSES.map((status) => <div key={status}><strong>{counts[status]}</strong><span>{STATUS_LABEL[status]}</span></div>)}</div>
        <nav className="pos-filter-tabs" aria-label="Floor filter">{floors.map((value) => <button key={value} className={floor === value ? 'active' : ''} aria-pressed={floor === value} onClick={() => setFloor(value)}>{value === 'ALL' ? 'All areas' : value}</button>)}</nav>
        {tablesQuery.isError && !tablesQuery.data && <div className="pos-error" role="alert">Tables could not be loaded. <button onClick={() => tablesQuery.refetch()}><RefreshRoundedIcon /> Try again</button></div>}
        {tablesQuery.isError && tablesQuery.data && <div className="pos-error" role="status">Table updates are temporarily unavailable. Showing the last synced state. <button onClick={() => tablesQuery.refetch()}><RefreshRoundedIcon /> Retry</button></div>}
        {tablesQuery.isLoading ? <div className="pos-state">Loading tables…</div> : visible.length === 0 && tablesQuery.data ? <div className="pos-state"><TableRestaurantRoundedIcon /><strong>{tables.length ? 'No tables in this area' : 'No tables configured'}</strong><span>{tables.length ? 'Choose another area to see its tables.' : canManageTables ? 'Add your restaurant tables here. They will appear in the dine-in order screen.' : 'Ask a manager to add restaurant tables before taking dine-in orders.'}</span>{canManageTables && !tables.length && <button type="button" className="pos-primary-action" onClick={() => setCreateOpen(true)}><AddRoundedIcon /> Set up first table</button>}</div> : tablesQuery.data && <div className="pos-record-grid pos-table-grid">{visible.map((table) => <button key={table.id} onClick={() => setSelected(table)} className={`pos-table-card status-${String(table.status).toLowerCase()}`}><span className="pos-table-card-top"><strong>{table.name}</strong><span>{STATUS_LABEL[table.status] || table.status}</span></span><span className="pos-table-card-capacity"><ChairRoundedIcon /> {table.capacity ? `${table.capacity} seats` : 'Capacity not set'}</span>{table.floor && <small>{table.floor}</small>}</button>)}</div>}
        {selected && <div className="pos-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="pos-dialog" role="dialog" aria-modal="true" aria-labelledby="table-dialog-title"><header><div><p className="hotel-eyebrow">TABLE</p><h2 id="table-dialog-title">{selected.name}</h2></div><button aria-label="Close" onClick={() => setSelected(null)}><CloseRoundedIcon /></button></header><p className="table-dialog-detail">{selected.floor || 'Area not set'} · {selected.capacity ? `${selected.capacity} seats` : 'Capacity not set'} · Current status: <strong>{STATUS_LABEL[selected.status] || selected.status}</strong></p>
            {selected.status === 'AVAILABLE' && <button className="pos-primary-action table-start-order" onClick={() => navigate(`/pos/checkout?tableId=${encodeURIComponent(selected.id)}`)}>Start dine-in order <ArrowForwardRoundedIcon /></button>}
            {canManageTables ? <><p className="table-dialog-help">Table occupancy follows dine-in orders. After payment or cancellation, mark the table cleaning, then release it when it is ready.</p><div className="table-status-actions">{(MANAGER_TRANSITIONS[selected.status] || []).map((status) => <button key={status} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, status })}>{statusMutation.isPending ? 'Updating…' : STATUS_LABEL[status]}</button>)}</div></> : selected.status !== 'AVAILABLE' && <p className="table-dialog-help">This table is {STATUS_LABEL[selected.status]?.toLowerCase()}. Ask a manager to update its service state.</p>}
            {statusMutation.isError && <p className="pos-error" role="alert">Could not update table status. {statusMutation.error?.response?.data?.message || 'Refresh and retry.'}</p>}</section></div>}
        {createOpen && <div className="pos-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !createMutation.isPending) setCreateOpen(false); }}><section className="pos-dialog" role="dialog" aria-modal="true" aria-labelledby="table-create-title"><header><div><p className="hotel-eyebrow">RESTAURANT SETUP</p><h2 id="table-create-title">Add a table</h2></div><button type="button" aria-label="Close" disabled={createMutation.isPending} onClick={() => setCreateOpen(false)}><CloseRoundedIcon /></button></header><form className="table-create-form" onSubmit={(event) => { event.preventDefault(); createMutation.mutate({ name: newTable.name.trim(), floor: newTable.floor.trim() || null, capacity: newTable.capacity ? Number(newTable.capacity) : null }); }}><label>Table name or number<input autoFocus required maxLength={64} value={newTable.name} onChange={(event) => setNewTable((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Table 1" /></label><label>Dining area<input maxLength={64} value={newTable.floor} onChange={(event) => setNewTable((current) => ({ ...current, floor: event.target.value }))} placeholder="e.g. Main dining room" /></label><label>Seating capacity<input type="number" min="1" max="1000" value={newTable.capacity} onChange={(event) => setNewTable((current) => ({ ...current, capacity: event.target.value }))} placeholder="Optional" /></label>{createMutation.isError && <p className="pos-error" role="alert">Table could not be created. {createMutation.error?.response?.data?.message || 'Check the details and try again.'}</p>}<footer><button type="button" className="pos-secondary-action" disabled={createMutation.isPending} onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="pos-primary-action" disabled={createMutation.isPending || !newTable.name.trim()}>{createMutation.isPending ? 'Creating…' : 'Create table'}</button></footer></form></section></div>}
    </section>;
}
