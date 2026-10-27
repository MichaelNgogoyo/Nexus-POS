import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { getActiveOrders, updateOrderStatus } from '../../services/api.js';

const COLUMNS = [
    { status: 'OPEN', title: 'Open', next: 'KITCHEN', action: 'Send to kitchen' },
    { status: 'KITCHEN', title: 'In kitchen', next: 'READY', action: 'Mark ready' },
    { status: 'READY', title: 'Ready', next: 'COMPLETED', action: 'Complete order' },
    { status: 'COMPLETED', title: 'Completed' },
];
const money = (amount) => `KSh ${Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export default function POSOrders() {
    const client = useQueryClient();
    const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: () => getActiveOrders().then(({ data }) => data), refetchInterval: 20_000 });
    const statusMutation = useMutation({
        mutationFn: ({ id, status }) => updateOrderStatus(id, status),
        onSuccess: () => client.invalidateQueries({ queryKey: ['orders'] }),
    });
    const grouped = useMemo(() => {
        const map = Object.fromEntries(COLUMNS.map(({ status }) => [status, []]));
        (ordersQuery.data ?? []).forEach((order) => {
            const status = order.status === 'PAID' ? 'COMPLETED' : order.status;
            if (map[status]) map[status].push(order);
        });
        return map;
    }, [ordersQuery.data]);
    const activeCount = (ordersQuery.data ?? []).filter((order) => !['COMPLETED', 'PAID', 'CANCELLED', 'REFUNDED'].includes(order.status)).length;

    return <section className="pos-data-page pos-board-page">
        <header className="pos-page-heading"><div><p className="hotel-eyebrow">SERVICE FLOW</p><h1>Orders</h1><p>Orders refresh automatically while service is running.</p></div><div className="pos-heading-actions"><span className="pos-live-count">{activeCount} active</span><button className="pos-secondary-action" onClick={() => ordersQuery.refetch()}><RefreshRoundedIcon /> Refresh</button></div></header>
        {ordersQuery.isLoading ? <div className="pos-state">Loading orders…</div> : ordersQuery.isError ? <div className="pos-error" role="alert">Orders could not be loaded. <button onClick={() => ordersQuery.refetch()}><RefreshRoundedIcon /> Try again</button></div> : <div className="pos-order-board">{COLUMNS.map((column) => <section className="pos-order-column" key={column.status}><header><h2>{column.title}</h2><span>{grouped[column.status].length}</span></header>{grouped[column.status].length === 0 ? <div className="pos-column-empty">No {column.title.toLowerCase()} orders.</div> : grouped[column.status].map((order) => <article className="pos-order-card" key={order.id}><div className="pos-order-card-head"><strong>{order.orderNumber || `#${order.id}`}</strong><span>{String(order.orderType || 'ORDER').replaceAll('_', ' ')}</span></div><p className="pos-order-card-sub">{order.table?.name ? `Table ${order.table.name}` : order.roomNumber ? `Room ${order.roomNumber}` : order.customerName || 'Takeaway'}</p><ul>{(order.items || []).map((item) => <li key={item.id || `${item.productId}-${item.productName}`}>{item.quantity} × {item.productName}</li>)}</ul>{order.notes && <p className="pos-order-note">Note: {order.notes}</p>}<div className="pos-order-card-foot"><span>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time unavailable'}</span><strong>{money(order.total)}</strong></div>{column.next && <button disabled={statusMutation.isPending} className="pos-order-next" onClick={() => statusMutation.mutate({ id: order.id, status: column.next })}>{column.action}<ArrowForwardRoundedIcon /></button>}</article>)}</section>)}</div>}
        {statusMutation.isError && <p className="pos-error" role="alert">Order status could not be updated. {statusMutation.error?.response?.data?.message || 'Refresh and retry.'}</p>}
        {!ordersQuery.isLoading && !ordersQuery.isError && ordersQuery.data?.length === 0 && <div className="pos-state"><ReceiptLongRoundedIcon /><strong>No orders yet</strong><span>New restaurant orders will appear here.</span></div>}
    </section>;
}
