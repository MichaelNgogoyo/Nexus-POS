import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useKeycloak } from '@react-keycloak/web';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import { usePermissions } from '../../auth/permissions.js';
import { closeShift, getCurrentShift, getShiftMovements, openShift, recordShiftMovement } from '../../services/api.js';

const money = (amount) => `KSh ${Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export default function POSShift() {
    const client = useQueryClient();
    const { keycloak } = useKeycloak();
    const { roles } = usePermissions();
    const canManageCash = roles.includes('ADMIN') || roles.includes('MANAGER');
    const cashierId = keycloak?.tokenParsed?.sub || keycloak?.subject;
    const cashierName = keycloak?.tokenParsed?.preferred_username || keycloak?.tokenParsed?.name || 'Cashier';
    const [openingAmount, setOpeningAmount] = useState('');
    const [closingAmount, setClosingAmount] = useState('');
    const [showClose, setShowClose] = useState(false);
    const [movementType, setMovementType] = useState(null);
    const [movementAmount, setMovementAmount] = useState('');
    const [movementReason, setMovementReason] = useState('');
    const [closedSummary, setClosedSummary] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const shiftQuery = useQuery({
        queryKey: ['current-shift', cashierId],
        enabled: Boolean(cashierId),
        queryFn: async () => {
            try { return (await getCurrentShift(cashierId)).data; }
            catch (error) { if (error?.response?.status === 404) return null; throw error; }
        },
    });
    const movementQuery = useQuery({
        queryKey: ['shift-movements', shiftQuery.data?.id],
        enabled: Boolean(shiftQuery.data?.id),
        queryFn: async () => (await getShiftMovements(shiftQuery.data.id)).data,
    });
    const movementNet = (movementQuery.data || []).reduce((total, movement) => {
        const amount = Number(movement.amount || 0);
        return total + (movement.type === 'CASH_IN' ? amount : -amount);
    }, 0);
    const openMutation = useMutation({
        mutationFn: () => openShift({ cashierId, cashierName, openingBalance: Number(openingAmount) }),
        onSuccess: () => { setOpeningAmount(''); setClosedSummary(null); client.invalidateQueries({ queryKey: ['current-shift', cashierId] }); },
    });
    const closeMutation = useMutation({
        mutationFn: () => closeShift(shiftQuery.data.id, { closingBalance: Number(closingAmount) }),
        onSuccess: ({ data }) => { setClosedSummary(data); setClosingAmount(''); setShowClose(false); client.invalidateQueries({ queryKey: ['current-shift', cashierId] }); },
    });
    const movementMutation = useMutation({
        mutationFn: () => recordShiftMovement(shiftQuery.data.id, {
            type: movementType,
            amount: Number(movementAmount),
            reason: movementReason.trim(),
            idempotencyKey: `cash-movement:${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`,
        }),
        onSuccess: () => {
            setMovementType(null);
            setMovementAmount('');
            setMovementReason('');
            client.invalidateQueries({ queryKey: ['current-shift', cashierId] });
            client.invalidateQueries({ queryKey: ['shift-movements', shiftQuery.data.id] });
        },
    });
    useEffect(() => {
        if (!shiftQuery.data?.openedAt) return undefined;
        const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(shiftQuery.data.openedAt).getTime()) / 60000)));
        update();
        const timer = setInterval(update, 60_000);
        return () => clearInterval(timer);
    }, [shiftQuery.data?.openedAt]);

    return (
        <section className="pos-data-page pos-shift-page">
            <header className="pos-page-heading">
                <div><p className="hotel-eyebrow">CASH CONTROL</p><h1>Cashier shift</h1><p>Open and close your register shift.</p></div>
                <button className="pos-secondary-action" onClick={() => shiftQuery.refetch()}><RefreshRoundedIcon /> Refresh</button>
            </header>
            {shiftQuery.isLoading ? <div className="pos-state">Checking shift status…</div> : shiftQuery.isError ? <div className="pos-error" role="alert">Shift status could not be loaded. <button onClick={() => shiftQuery.refetch()}>Try again</button></div> : closedSummary && !shiftQuery.data ? (
                <div className="pos-shift-card">
                    <span className="pos-shift-icon"><LockRoundedIcon /></span><h2>Shift closed</h2>
                    <p>Cash reconciliation for this shift.</p>
                    <div className="pos-shift-metrics">
                        <div><span>Expected cash</span><strong>{money(closedSummary.expectedBalance)}</strong></div>
                        <div><span>Counted cash</span><strong>{money(closedSummary.closingBalance)}</strong></div>
                        <div><span>Variance</span><strong>{money(closedSummary.variance)}</strong></div>
                    </div>
                    <button className="pos-primary-action" onClick={() => setClosedSummary(null)}>Open next shift</button>
                </div>
            ) : !shiftQuery.data ? (
                <div className="pos-shift-card">
                    <span className="pos-shift-icon"><LockOpenRoundedIcon /></span><h2>Open your shift</h2>
                    <p>Enter the cash float counted in the drawer before service.</p>
                    <label>Opening cash balance<input inputMode="decimal" type="number" min="0" step="0.01" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="0.00" /></label>
                    {openMutation.isError && <p className="pos-error" role="alert">Shift could not be opened. {openMutation.error?.response?.data?.message || 'Try again.'}</p>}
                    <button className="pos-primary-action" disabled={!cashierId || openingAmount === '' || Number(openingAmount) < 0 || openMutation.isPending} onClick={() => openMutation.mutate()}>{openMutation.isPending ? 'Opening…' : 'Open shift'}</button>
                </div>
            ) : (
                <div className="pos-shift-card is-open">
                    <div className="pos-shift-status"><span><i /> Shift open</span><button className="pos-danger-action" onClick={() => setShowClose(true)}><LockRoundedIcon /> Close shift</button></div>
                    <h2>{cashierName}</h2><p>Shift opened {shiftQuery.data.openedAt ? new Date(shiftQuery.data.openedAt).toLocaleString() : 'time not recorded'}</p>
                    <div className="pos-shift-metrics">
                        <div><span>Opening float</span><strong>{money(shiftQuery.data.openingBalance)}</strong></div>
                        <div><span>Cash sales</span><strong>{movementQuery.isLoading ? 'Loading…' : money(Number(shiftQuery.data.expectedBalance || 0) - Number(shiftQuery.data.openingBalance || 0) - movementNet)}</strong></div>
                        <div><span>Cash movements</span><strong>{movementQuery.isLoading ? 'Loading…' : money(movementNet)}</strong></div>
                        <div><span>Expected cash</span><strong>{money(shiftQuery.data.expectedBalance)}</strong></div>
                        <div><span>Time on shift</span><strong>{elapsed} min</strong></div>
                    </div>
                    <div className="pos-honest-state"><ReceiptLongRoundedIcon /><span>Expected cash includes the opening float, completed cash sales, manager-recorded cash in/out, and cash refunds.</span></div>
                    <section className="pos-shift-movements" aria-labelledby="shift-movements-title">
                        <div className="pos-shift-movements-heading"><div><p className="hotel-eyebrow">REGISTER ACTIVITY</p><h3 id="shift-movements-title">Cash movements</h3></div><div className="pos-shift-movement-actions">{canManageCash && <><button className="pos-secondary-action" onClick={() => setMovementType('CASH_IN')}><AddCircleOutlineRoundedIcon /> Cash in</button><button className="pos-secondary-action" onClick={() => setMovementType('CASH_OUT')}><RemoveCircleOutlineRoundedIcon /> Cash out</button></>}<button className="pos-secondary-action" onClick={() => movementQuery.refetch()} disabled={movementQuery.isFetching}><RefreshRoundedIcon /> Refresh</button></div></div>
                        {movementQuery.isLoading ? <p className="pos-state">Loading cash movements…</p> : movementQuery.isError ? <div className="pos-error" role="alert">Cash movements could not be loaded. <button onClick={() => movementQuery.refetch()}>Try again</button></div> : movementQuery.data.length === 0 ? <p className="pos-state">No cash movements recorded for this shift.</p> : <ul className="pos-shift-movement-list">{movementQuery.data.map((movement) => <li key={movement.id}>
                            <div><strong>{movement.type.replaceAll('_', ' ')}</strong><span>{movement.reason}</span><small>{new Date(movement.createdAt).toLocaleString()} · {movement.createdBy}</small></div>
                            <b className={movement.type === 'CASH_IN' ? 'is-inflow' : 'is-outflow'}>{movement.type === 'CASH_IN' ? '+' : '−'}{money(movement.amount)}</b>
                        </li>)}</ul>}
                    </section>
                </div>
            )}
            {showClose && shiftQuery.data && <div className="pos-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowClose(false); }}>
                <section className="pos-dialog" role="dialog" aria-modal="true" aria-labelledby="close-shift-title">
                    <header><div><p className="hotel-eyebrow">SHIFT CONTROL</p><h2 id="close-shift-title">Close shift</h2></div><button aria-label="Close dialog" onClick={() => setShowClose(false)}><span aria-hidden="true">×</span></button></header>
                    <p className="table-dialog-detail">Expected cash: <strong>{money(shiftQuery.data.expectedBalance)}</strong>. Count the drawer and enter the total.</p>
                    <label className="payment-amount-label">Closing cash balance<input inputMode="decimal" type="number" min="0" step="0.01" value={closingAmount} onChange={(event) => setClosingAmount(event.target.value)} placeholder="0.00" /></label>
                    {closingAmount !== '' && <p className="table-dialog-detail">Variance: <strong>{money(Number(closingAmount) - Number(shiftQuery.data.expectedBalance || 0))}</strong></p>}
                    {closeMutation.isError && <p className="pos-error" role="alert">Shift could not be closed. {closeMutation.error?.response?.data?.message || 'Try again.'}</p>}
                    <footer><button className="pos-secondary-action" onClick={() => setShowClose(false)}>Cancel</button><button className="pos-primary-action" disabled={closingAmount === '' || Number(closingAmount) < 0 || closeMutation.isPending} onClick={() => closeMutation.mutate()}>{closeMutation.isPending ? 'Closing…' : 'Confirm close'}</button></footer>
                </section>
            </div>}
            {movementType && shiftQuery.data && <div className="pos-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMovementType(null); }}>
                <section className="pos-dialog" role="dialog" aria-modal="true" aria-labelledby="cash-movement-title">
                    <header><div><p className="hotel-eyebrow">MANAGER REGISTER CONTROL</p><h2 id="cash-movement-title">Record {movementType === 'CASH_IN' ? 'cash in' : 'cash out'}</h2></div><button aria-label="Close dialog" onClick={() => setMovementType(null)}><span aria-hidden="true">×</span></button></header>
                    <p className="table-dialog-detail">This adjustment is recorded in the shift ledger and changes expected drawer cash.</p>
                    <label className="payment-amount-label">Amount<input autoFocus inputMode="decimal" type="number" min="0.01" step="0.01" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="0.00" /></label>
                    <label className="payment-amount-label">Reason<input maxLength={300} value={movementReason} onChange={(event) => setMovementReason(event.target.value)} placeholder={movementType === 'CASH_IN' ? 'e.g. Float top-up' : 'e.g. Petty cash purchase'} /></label>
                    {movementMutation.isError && <p className="pos-error" role="alert">Cash movement could not be recorded. {movementMutation.error?.response?.data?.message || 'Try again.'}</p>}
                    <footer><button className="pos-secondary-action" onClick={() => setMovementType(null)}>Cancel</button><button className="pos-primary-action" disabled={!Number.isFinite(Number(movementAmount)) || Number(movementAmount) <= 0 || !movementReason.trim() || movementMutation.isPending} onClick={() => movementMutation.mutate()}>{movementMutation.isPending ? 'Recording…' : 'Record movement'}</button></footer>
                </section>
            </div>}
        </section>
    );
}
