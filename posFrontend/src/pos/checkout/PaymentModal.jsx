import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useKeycloak } from '@react-keycloak/web';
import { createSale, getCurrentShift, getSaleReceiptDetails, getTaxRate } from '../../services/api.js';
import { useCart } from '../../context/CartContext.jsx';
import PaymentMethodAvailability from './PaymentMethodAvailability.jsx';
import POSReceipt from './POSReceipt.jsx';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LocalAtmRoundedIcon from '@mui/icons-material/LocalAtmRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';

const requestKey = () => globalThis.crypto?.randomUUID?.() ?? `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const money = (amount) => `KSh ${Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
const roundMoney = (amount) => Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;

export default function PaymentModal({ orderType, tableId, guestName, orderNotes, onClose }) {
    const { keycloak } = useKeycloak();
    const navigate = useNavigate();
    const { cart, clearCart } = useCart();
    const queryClient = useQueryClient();
    const cashierId = keycloak?.tokenParsed?.sub || keycloak?.subject;
    const [amountTendered, setAmountTendered] = useState('');
    const [sale, setSale] = useState(null);
    const [idempotencyKey] = useState(requestKey);
    const taxQuery = useQuery({ queryKey: ['taxRate'], queryFn: () => getTaxRate().then(({ data }) => data), staleTime: 300_000 });
    const shiftQuery = useQuery({
        queryKey: ['current-shift', cashierId],
        queryFn: async () => {
            try { return (await getCurrentShift(cashierId)).data; }
            catch (error) { if (error?.response?.status === 404) return null; throw error; }
        },
    });
    const taxRate = Number(taxQuery.data?.taxRate ?? 0);
    const serviceRate = Number(taxQuery.data?.serviceChargeRate ?? 0);
    const subtotal = roundMoney(cart.reduce((sum, item) => sum + roundMoney(roundMoney(Number(item.price) + (item.modifiers || []).reduce((acc, modifier) => acc + Number(modifier.additionalPrice || 0), 0)) * item.quantity), 0));
    const tax = roundMoney(subtotal * taxRate / 100);
    const service = roundMoney(subtotal * serviceRate / 100);
    const total = roundMoney(subtotal + tax + service);
    const tendered = Number(amountTendered || 0);
    const paymentMutation = useMutation({
        mutationFn: async () => {
            const { data } = await createSale({
                cashierId,
                paymentMethod: 'CASH',
                orderType,
                tableId: orderType === 'DINE_IN' ? tableId : null,
                guestName: guestName || null,
                notes: orderNotes?.trim() || null,
                amountTendered: tendered,
                idempotencyKey,
                items: cart.map((item) => ({
                    productId: Number(item.id),
                    quantity: item.quantity,
                    modifierIds: (item.modifiers || []).map((modifier) => Number(modifier.id)),
                    notes: item.notes || null,
                })),
            });
            return data;
        },
        onSuccess: (result) => {
            setSale(result);
            clearCart();
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
            queryClient.invalidateQueries({ queryKey: ['current-shift', keycloak?.tokenParsed?.sub || keycloak?.subject] });
        },
    });
    const receiptQuery = useQuery({
        queryKey: ['sale-receipt', sale?.id],
        queryFn: async () => (await getSaleReceiptDetails(sale.id)).data,
        enabled: Boolean(sale?.id),
        retry: 1,
    });

    if (sale) return <div className="pos-dialog-backdrop"><section className="pos-dialog payment-dialog payment-success-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-success-title"><div className="payment-success-icon"><CheckCircleRoundedIcon /></div><h2 id="payment-success-title">Payment recorded</h2><p>Sale #{sale.id} · {sale.orderNumber ? `Order ${sale.orderNumber} · ` : ''}{money(sale.totalAmount)} received</p>{receiptQuery.isLoading && <p className="hotel-state">Preparing receipt…</p>}{receiptQuery.data && <POSReceipt receipt={receiptQuery.data} />}{receiptQuery.isError && <p className="hotel-error" role="alert">Receipt could not be loaded. {receiptQuery.error?.response?.data?.message || 'Try again.'} <button type="button" onClick={() => receiptQuery.refetch()}>Retry</button></p>}<footer className="payment-success-actions">{receiptQuery.data && <button className="pos-secondary-action" onClick={() => window.print()}>Print receipt</button>}<button className="pos-primary-action" onClick={onClose}>Done</button></footer></section></div>;

    return (
        <div className="pos-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !paymentMutation.isPending) onClose(); }}>
            <section className="pos-dialog payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title">
                <header><div><p className="hotel-eyebrow">PAYMENT</p><h2 id="payment-title">Cash received</h2></div><button aria-label="Close" disabled={paymentMutation.isPending} onClick={onClose}><CloseRoundedIcon /></button></header>
                <div className="payment-summary"><span>Amount due</span><strong>{money(total)}</strong><small>Cash is recorded by the Java backend. Card and M-Pesa require payment provider setup.</small></div>
                <PaymentMethodAvailability />
                {shiftQuery.isLoading ? <p className="hotel-state">Checking cashier shift…</p> : shiftQuery.isError ? <p className="hotel-error" role="alert">Shift status could not be checked. <button type="button" onClick={() => shiftQuery.refetch()}>Retry</button></p> : !shiftQuery.data ? <div className="payment-shift-notice"><span>Open a shift before recording cash.</span><button type="button" className="pos-secondary-action" onClick={() => navigate('/pos/shift')}>Open shift</button></div> : null}
                {taxQuery.isLoading ? <p className="hotel-state">Loading tax and service rates…</p> : taxQuery.isError ? <p className="hotel-error" role="alert">Tax and service rates could not be loaded. Payment is unavailable until the backend responds.</p> : <>
                    <label className="payment-amount-label">Amount tendered<input autoFocus inputMode="decimal" type="number" min={total} step="0.01" value={amountTendered} onChange={(event) => setAmountTendered(event.target.value)} placeholder="Enter cash received" /></label>
                    <div className="payment-quick-amounts"><button onClick={() => setAmountTendered(total.toFixed(2))}>Exact · {money(total)}</button>{[500, 1000, 2000].map((value) => <button key={value} onClick={() => setAmountTendered(String(Math.ceil(total / value) * value))}>{money(Math.ceil(total / value) * value)}</button>)}</div>
                    {tendered > 0 && <div className={`payment-change ${tendered >= total ? '' : 'short'}`}><span>{tendered >= total ? 'Change due' : 'Still due'}</span><strong>{money(Math.abs(tendered - total))}</strong></div>}
                </>}
                {paymentMutation.isError && <p className="hotel-error payment-error" role="alert"><ErrorOutlineRoundedIcon /> {paymentMutation.error?.response?.data?.message || 'Payment could not be recorded. Check the connection and try again.'}</p>}
                <footer><button className="pos-secondary-action" disabled={paymentMutation.isPending} onClick={onClose}>Cancel</button><button className="pos-primary-action" disabled={paymentMutation.isPending || shiftQuery.isLoading || shiftQuery.isError || !shiftQuery.data || taxQuery.isLoading || taxQuery.isError || cart.length === 0 || !amountTendered || tendered < total} onClick={() => paymentMutation.mutate()}>{paymentMutation.isPending ? 'Recording…' : <><LocalAtmRoundedIcon /> Record cash · {money(total)}</>}</button></footer>
            </section>
        </div>
    );
}
