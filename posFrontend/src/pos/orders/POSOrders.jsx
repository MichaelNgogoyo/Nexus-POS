import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '../../auth/permissions.js';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { cancelRestaurantOrder, getActiveOrders, getAllTables, updateOrderStatus, updateRestaurantOrder } from '../../services/api.js';
import OrderPaymentModal from './OrderPaymentModal.jsx';

const COLUMNS = [
    { status: 'OPEN', title: 'Open', next: 'KITCHEN', action: 'Send to kitchen' },
    { status: 'KITCHEN', title: 'In kitchen' },
    { status: 'READY', title: 'Ready' },
    { status: 'COMPLETED', title: 'Completed' },
];
const money = (amount) => `KSh ${Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export default function POSOrders() {
    const client = useQueryClient();
    const { roles } = usePermissions();
    const canManageOrders = roles.includes('ADMIN') || roles.includes('MANAGER');
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [transferOrder, setTransferOrder] = useState(null);
    const [transferTableId, setTransferTableId] = useState('');
    const [cancelOrder, setCancelOrder] = useState(null);
    const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: () => getActiveOrders().then(({ data }) => data), refetchInterval: 20_000 });
    const tablesQuery = useQuery({ queryKey: ['tables'], queryFn: () => getAllTables().then(({ data }) => data), staleTime: 20_000 });
    const statusMutation = useMutation({
        mutationFn: ({ id, status }) => updateOrderStatus(id, status),
        onSuccess: () => client.invalidateQueries({ queryKey: ['orders'] }),
    });
    const transferMutation = useMutation({
        mutationFn: ({ order, tableId }) => updateRestaurantOrder(order.id, {
            orderType: 'DINE_IN',
            table: { id: Number(tableId) },
            roomNumber: null,
            customerName: order.customerName || null,
            notes: order.notes || null,
            items: (order.items || []).map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                notes: item.notes || null,
                modifiers: (item.modifiers || []).map((modifier) => ({ id: modifier.id })),
            })),
        }).then(({ data }) => data),
        onSuccess: () => {
            setTransferOrder(null);
            setTransferTableId('');
            client.invalidateQueries({ queryKey: ['orders'] });
            client.invalidateQueries({ queryKey: ['tables'] });
        },
    });
    const cancelMutation = useMutation({
        mutationFn: (id) => cancelRestaurantOrder(id).then(({ data }) => data),
        onSuccess: () => {
            setCancelOrder(null);
            client.invalidateQueries({ queryKey: ['orders'] });
            client.invalidateQueries({ queryKey: ['tables'] });
            client.invalidateQueries({ queryKey: ['kitchen-orders'] });
            client.invalidateQueries({ queryKey: ['products'] });
        },
    });
    const grouped = useMemo(() => {
        const map = Object.fromEntries(COLUMNS.map(({ status }) => [status, []]));
        (ordersQuery.data ?? []).forEach((order) => {
            const status = order.status === 'PAID' ? 'COMPLETED' : order.status;
            if (map[status]) map[status].push(order);
        });
        return map;
    }, [ordersQuery.data]);
    const activeCount = (ordersQuery.data ?? []).filter((order) => !['PAID', 'CANCELLED', 'REFUNDED'].includes(order.status)).length;

    return <section className="pos-data-page pos-board-page">
        <header className="pos-page-heading"><div><p className="hotel-eyebrow">SERVICE FLOW</p><h1>Orders</h1><p>Orders refresh automatically while service is running.</p></div><div className="pos-heading-actions"><span className="pos-live-count">{activeCount} active</span><button className="pos-secondary-action" onClick={() => ordersQuery.refetch()}><RefreshRoundedIcon /> Refresh</button></div></header>
        {ordersQuery.isLoading ? <div className="pos-state">Loading orders…</div> : ordersQuery.isError ? <div className="pos-error" role="alert">Orders could not be loaded. <button onClick={() => ordersQuery.refetch()}><RefreshRoundedIcon /> Try again</button></div> : <div className="pos-order-board">{COLUMNS.map((column) => <section className="pos-order-column" key={column.status}><header><h2>{column.title}</h2><span>{grouped[column.status].length}</span></header>{grouped[column.status].length === 0 ? <div className="pos-column-empty">No {column.title.toLowerCase()} orders.</div> : grouped[column.status].map((order) => {
            const paid = order.status === 'PAID' || Boolean(order.saleId);
            const paymentEligible = !paid && ['KITCHEN', 'READY', 'COMPLETED'].includes(order.status);
            return <article className="pos-order-card" key={order.id}>
                <div className="pos-order-card-head"><strong>{order.orderNumber || `#${order.id}`}</strong><span>{String(order.orderType || 'ORDER').replaceAll('_', ' ')}</span></div>
                <p className="pos-order-card-sub">{order.table?.name ? `Table ${order.table.name}` : order.roomNumber ? `Room ${order.roomNumber}` : order.customerName || 'Takeaway'}</p>
                <ul>{(order.items || []).map((item) => <li key={item.id || `${item.productId}-${item.productName}`}>{item.quantity} × {item.productName}</li>)}</ul>
                {order.notes && <p className="pos-order-note">Note: {order.notes}</p>}
                <div className="pos-order-card-foot"><span>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time unavailable'}</span><strong>{money(order.total)}</strong></div>
                <div className={`pos-order-payment-state ${paid ? 'is-paid' : ''}`}>{paid ? `Paid${order.saleId ? ` · Sale #${order.saleId}` : ''}` : order.status === 'OPEN' ? 'Not sent to kitchen' : 'Payment due'}</div>
                <div className="pos-order-card-actions">
                    {column.next && <button disabled={statusMutation.isPending} className="pos-order-next" onClick={() => statusMutation.mutate({ id: order.id, status: column.next })}>{column.action}<ArrowForwardRoundedIcon /></button>}
                    {canManageOrders && order.status === 'OPEN' && <button className="pos-order-transfer" onClick={() => { setTransferOrder(order); setTransferTableId(''); }}>Assign / transfer table</button>}
                    {canManageOrders && ['OPEN', 'KITCHEN', 'READY'].includes(order.status) && <button className="pos-order-cancel" onClick={() => setCancelOrder(order)}>Cancel order</button>}
                    {paymentEligible && <button className="pos-order-pay" onClick={() => setPaymentOrder(order)}>Record cash payment</button>}
                </div>
            </article>;
        })}</section>)}</div>}
        {statusMutation.isError && <p className="pos-error" role="alert">Order status could not be updated. {statusMutation.error?.response?.data?.message || 'Refresh and retry.'}</p>}
        {transferMutation.isError && <p className="pos-error" role="alert">Table assignment failed. {transferMutation.error?.response?.data?.message || 'Refresh and retry.'}</p>}
        {cancelMutation.isError && <p className="pos-error" role="alert">Order could not be cancelled. {cancelMutation.error?.response?.data?.message || 'Refresh and retry.'}</p>}
        {!ordersQuery.isLoading && !ordersQuery.isError && ordersQuery.data?.length === 0 && <div className="pos-state"><ReceiptLongRoundedIcon /><strong>No orders yet</strong><span>New restaurant orders will appear here.</span></div>}
        {paymentOrder && <OrderPaymentModal order={paymentOrder} onClose={() => { setPaymentOrder(null); client.invalidateQueries({ queryKey: ['orders'] }); }} />}
        {transferOrder && <div className="pos-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !transferMutation.isPending) setTransferOrder(null); }}><section className="pos-dialog" role="dialog" aria-modal="true" aria-labelledby="transfer-order-title"><header><div><p className="hotel-eyebrow">OPEN ORDER</p><h2 id="transfer-order-title">Assign a table</h2></div><button aria-label="Close" disabled={transferMutation.isPending} onClick={() => setTransferOrder(null)}>×</button></header><p className="table-dialog-detail">{transferOrder.orderNumber || `Order #${transferOrder.id}`} · {transferOrder.table?.name ? `currently at ${transferOrder.table.name}` : 'not assigned to a table'}</p>{tablesQuery.isLoading ? <div className="pos-state">Loading available tables…</div> : tablesQuery.isError ? <div className="pos-error" role="alert">Tables could not be loaded. <button onClick={() => tablesQuery.refetch()}>Try again</button></div> : <div className="transfer-table-list">{(tablesQuery.data || []).filter((table) => table.status === 'AVAILABLE' && String(table.id) !== String(transferOrder.table?.id)).map((table) => <button type="button" key={table.id} className={transferTableId === String(table.id) ? 'selected' : ''} aria-pressed={transferTableId === String(table.id)} onClick={() => setTransferTableId(String(table.id))}><strong>{table.name}</strong><span>{table.floor || 'Area not set'} · {table.capacity ? `${table.capacity} seats` : 'No capacity set'}</span></button>)}</div>}{!tablesQuery.isLoading && !tablesQuery.isError && !(tablesQuery.data || []).some((table) => table.status === 'AVAILABLE' && String(table.id) !== String(transferOrder.table?.id)) && <div className="pos-column-empty">No free tables are available right now.</div>}<footer className="transfer-actions"><button className="pos-secondary-action" disabled={transferMutation.isPending} onClick={() => setTransferOrder(null)}>Keep current table</button><button className="pos-primary-action" disabled={!transferTableId || transferMutation.isPending} onClick={() => transferMutation.mutate({ order: transferOrder, tableId: transferTableId })}>{transferMutation.isPending ? 'Moving order…' : 'Confirm table'}</button></footer></section></div>}
        {cancelOrder && <div className="pos-dialog-backdrop" role="presentation"><section className="pos-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-order-title"><p className="hotel-eyebrow">CANCEL ORDER</p><h2 id="cancel-order-title">Cancel {cancelOrder.orderNumber || `order #${cancelOrder.id}`}?</h2><p className="table-dialog-detail">The order will be marked cancelled, its kitchen ticket will be updated, and its table will move to cleaning. Stock already deducted on kitchen submission is not automatically returned.</p><footer className="transfer-actions"><button className="pos-secondary-action" disabled={cancelMutation.isPending} onClick={() => setCancelOrder(null)}>Keep order</button><button className="pos-danger-action" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(cancelOrder.id)}>{cancelMutation.isPending ? 'Cancelling…' : 'Confirm cancellation'}</button></footer></section></div>}
    </section>;
}
