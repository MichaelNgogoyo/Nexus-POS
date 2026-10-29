import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import KitchenRoundedIcon from '@mui/icons-material/KitchenRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { advanceKitchenStatus, getKitchenOrders } from '../../services/api.js';

const COLUMNS = [
    { status: 'PENDING', label: 'New', next: 'PREPARING', action: 'Start preparing' },
    { status: 'PREPARING', label: 'Preparing', next: 'READY', action: 'Mark ready' },
    { status: 'READY', label: 'Ready', next: 'SERVED', action: 'Mark served' },
    { status: 'SERVED', label: 'Served' },
    { status: 'CANCELLED', label: 'Cancelled' },
];

function Elapsed({ since }) {
    const [minutes, setMinutes] = useState(() => since ? Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000)) : null);
    useEffect(() => {
        if (!since) {
            setMinutes(null);
            return undefined;
        }
        const update = () => setMinutes(Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000)));
        update();
        const timer = setInterval(update, 30_000);
        return () => clearInterval(timer);
    }, [since]);
    return <span>{minutes === null ? 'Time unavailable' : `${minutes} min`}</span>;
}

export default function POSKitchen() {
    const client = useQueryClient();
    const [showHistory, setShowHistory] = useState(false);
    const kitchenQuery = useQuery({
        queryKey: ['kitchen-orders', { includeHistory: showHistory }],
        queryFn: () => getKitchenOrders({ includeHistory: showHistory }).then(({ data }) => data),
        refetchInterval: 15_000,
    });
    const statusMutation = useMutation({
        mutationFn: ({ id, status }) => advanceKitchenStatus(id, status),
        onSuccess: () => { client.invalidateQueries({ queryKey: ['kitchen-orders'] }); client.invalidateQueries({ queryKey: ['orders'] }); },
        onError: () => { client.invalidateQueries({ queryKey: ['kitchen-orders'] }); client.invalidateQueries({ queryKey: ['orders'] }); },
    });
    const tickets = kitchenQuery.data ?? [];
    const columns = showHistory ? COLUMNS : COLUMNS.filter((column) => !['SERVED', 'CANCELLED'].includes(column.status));
    return <section className="pos-data-page pos-board-page">
        <header className="pos-page-heading"><div><p className="hotel-eyebrow">KITCHEN DISPLAY</p><h1>Kitchen tickets</h1><p>Live tickets refresh every 15 seconds and remain saved in the backend.</p></div><div className="pos-heading-actions"><button className="pos-secondary-action" aria-pressed={showHistory} onClick={() => setShowHistory((shown) => !shown)}>{showHistory ? 'Hide served & cancelled' : 'Show served & cancelled'}</button><button className="pos-secondary-action" onClick={() => kitchenQuery.refetch()}><RefreshRoundedIcon /> Refresh</button></div></header>
        {kitchenQuery.isLoading ? <div className="pos-state">Loading kitchen tickets…</div> : kitchenQuery.isError ? <div className="pos-error" role="alert">Kitchen tickets could not be loaded. <button onClick={() => kitchenQuery.refetch()}><RefreshRoundedIcon /> Try again</button></div> : <div className={`pos-order-board kitchen-board ${showHistory ? 'has-history' : ''}`}>{columns.map((column) => {
            const columnTickets = tickets.filter((ticket) => ticket.status === column.status);
            return <section className="pos-order-column" key={column.status}><header><h2>{column.label}</h2><span>{columnTickets.length}</span></header>{columnTickets.length === 0 ? <div className="pos-column-empty">No tickets.</div> : columnTickets.map((ticket) => {
                const order = ticket.order || {};
                return <article className="pos-order-card kitchen-ticket" key={ticket.id}><div className="pos-order-card-head"><strong>{order.orderNumber || `Ticket #${ticket.id}`}</strong><span>{String(order.orderType || 'ORDER').replaceAll('_', ' ')}</span></div><p className="pos-order-card-sub">{order.table?.name ? `Table ${order.table.name}` : order.roomNumber ? `Room ${order.roomNumber}` : order.customerName || 'Takeaway'}</p><ul>{(order.items || []).map((item) => <li key={item.id || `${item.productId}-${item.productName}`}><strong>{item.quantity}×</strong> {item.productName}{item.modifiers?.length > 0 && <small>Options: {item.modifiers.map((modifier) => modifier.name).join(', ')}</small>}{item.notes && <small>Note: {item.notes}</small>}</li>)}</ul>{ticket.notes && <p className="pos-order-note">Kitchen note: {ticket.notes}</p>}<div className="pos-order-card-foot"><span><Elapsed since={ticket.startedAt || ticket.receivedAt} /></span>{column.next && <button disabled={statusMutation.isPending} className="pos-order-next" onClick={() => statusMutation.mutate({ id: ticket.id, status: column.next })}>{column.action}<ArrowForwardRoundedIcon /></button>}</div></article>;
            })}</section>;
        })}</div>}
        {statusMutation.isError && <p className="pos-error" role="alert">Kitchen status could not be updated. {statusMutation.error?.response?.data?.message || 'Refresh and retry.'}</p>}
        {!kitchenQuery.isLoading && !kitchenQuery.isError && tickets.length === 0 && <div className="pos-state"><KitchenRoundedIcon /><strong>No kitchen tickets</strong><span>Tickets appear here when the backend creates them.</span></div>}
    </section>;
}
