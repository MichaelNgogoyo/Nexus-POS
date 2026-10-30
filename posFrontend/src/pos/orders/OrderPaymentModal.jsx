import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKeycloak } from '@react-keycloak/web';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LocalAtmRoundedIcon from '@mui/icons-material/LocalAtmRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { getSaleReceipt, recordOrderCashPayment } from '../../services/api.js';

const requestKey = () => globalThis.crypto?.randomUUID?.() ?? `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const money = (amount) => `KSh ${Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export default function OrderPaymentModal({ order, onClose }) {
    const { keycloak } = useKeycloak();
    const queryClient = useQueryClient();
    const total = Number(order.total || 0);
    const [amountTendered, setAmountTendered] = useState('');
    const [sale, setSale] = useState(null);
    const [idempotencyKey] = useState(requestKey);
    const tendered = Number(amountTendered || 0);
    const cashierId = keycloak?.tokenParsed?.sub || keycloak?.subject;

    const paymentMutation = useMutation({
        mutationFn: async () => (await recordOrderCashPayment(order.id, {
            amountTendered: tendered,
            idempotencyKey,
        })).data,
        onSuccess: (result) => {
            setSale(result);
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
            queryClient.invalidateQueries({ queryKey: ['current-shift', cashierId] });
        },
    });
    const receiptMutation = useMutation({ mutationFn: async () => (await getSaleReceipt(sale.id)).data });

    if (sale) return <div className="pos-dialog-backdrop">
        <section className="pos-dialog payment-dialog" role="dialog" aria-modal="true" aria-labelledby="order-payment-success-title">
            <div className="payment-success-icon"><CheckCircleRoundedIcon /></div>
            <h2 id="order-payment-success-title">Payment recorded</h2>
            <p>Sale #{sale.id} · Order {order.orderNumber || `#${order.id}`} · {money(sale.totalAmount)} received</p>
            {receiptMutation.data && <pre className="receipt-print-area">{receiptMutation.data}</pre>}
            {receiptMutation.isError && <p className="hotel-error" role="alert">Receipt could not be loaded. {receiptMutation.error?.response?.data?.message || 'Try again.'}</p>}
            <footer className="payment-success-actions">
                <button className="pos-secondary-action" disabled={receiptMutation.isPending} onClick={() => receiptMutation.mutate()}>{receiptMutation.isPending ? 'Loading receipt…' : receiptMutation.data ? 'Reload receipt' : 'Load receipt'}</button>
                {receiptMutation.data && <button className="pos-secondary-action" onClick={() => window.print()}>Print receipt</button>}
                <button className="pos-primary-action" onClick={onClose}>Done</button>
            </footer>
        </section>
    </div>;

    return <div className="pos-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !paymentMutation.isPending) onClose(); }}>
        <section className="pos-dialog payment-dialog" role="dialog" aria-modal="true" aria-labelledby="order-payment-title">
            <header><div><p className="hotel-eyebrow">{order.orderNumber || `ORDER #${order.id}`}</p><h2 id="order-payment-title">Record cash payment</h2></div><button aria-label="Close" disabled={paymentMutation.isPending} onClick={onClose}><CloseRoundedIcon /></button></header>
            <div className="payment-summary"><span>Amount due</span><strong>{money(total)}</strong><small>Cash payment for the saved order. The server uses its stored items and totals.</small></div>
            <label className="payment-amount-label">Amount tendered<input autoFocus inputMode="decimal" type="number" min={total} step="0.01" value={amountTendered} onChange={(event) => setAmountTendered(event.target.value)} placeholder="Enter cash received" /></label>
            <div className="payment-quick-amounts">
                <button type="button" onClick={() => setAmountTendered(total.toFixed(2))}>Exact · {money(total)}</button>
                {[500, 1000, 2000].map((value) => <button type="button" key={value} onClick={() => setAmountTendered(String(Math.ceil(total / value) * value))}>{money(Math.ceil(total / value) * value)}</button>)}
            </div>
            {tendered > 0 && <div className={`payment-change ${tendered >= total ? '' : 'short'}`}><span>{tendered >= total ? 'Change due' : 'Still due'}</span><strong>{money(Math.abs(tendered - total))}</strong></div>}
            {paymentMutation.isError && <p className="hotel-error payment-error" role="alert"><ErrorOutlineRoundedIcon /> {paymentMutation.error?.response?.data?.message || 'Payment could not be recorded. Check the connection and retry.'}</p>}
            <footer><button className="pos-secondary-action" disabled={paymentMutation.isPending} onClick={onClose}>Cancel</button><button className="pos-primary-action" disabled={paymentMutation.isPending || !amountTendered || tendered < total} onClick={() => paymentMutation.mutate()}>{paymentMutation.isPending ? 'Recording…' : <><LocalAtmRoundedIcon /> Record cash · {money(total)}</>}</button></footer>
        </section>
    </div>;
}
