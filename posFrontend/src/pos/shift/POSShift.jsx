import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useKeycloak } from '@react-keycloak/web';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { closeShift, getCurrentShift, openShift } from '../../services/api.js';

const money = (amount) => `KSh ${Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export default function POSShift() {
    const client = useQueryClient();
    const { keycloak } = useKeycloak();
    const cashierId = keycloak?.tokenParsed?.sub || keycloak?.subject;
    const cashierName = keycloak?.tokenParsed?.preferred_username || keycloak?.tokenParsed?.name || 'Cashier';
    const [openingAmount, setOpeningAmount] = useState('');
    const [closingAmount, setClosingAmount] = useState('');
    const [showClose, setShowClose] = useState(false);
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
    const openMutation = useMutation({
        mutationFn: () => openShift({ cashierId, cashierName, openingBalance: Number(openingAmount) }),
        onSuccess: () => { setOpeningAmount(''); setClosedSummary(null); client.invalidateQueries({ queryKey: ['current-shift', cashierId] }); },
    });
    const closeMutation = useMutation({
        mutationFn: () => closeShift(shiftQuery.data.id, { closingBalance: Number(closingAmount) }),
        onSuccess: ({ data }) => { setClosedSummary(data); setClosingAmount(''); setShowClose(false); client.invalidateQueries({ queryKey: ['current-shift', cashierId] }); },
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
                        <div><span>Cash sales</span><strong>{money(Number(shiftQuery.data.expectedBalance || 0) - Number(shiftQuery.data.openingBalance || 0))}</strong></div>
                        <div><span>Expected cash</span><strong>{money(shiftQuery.data.expectedBalance)}</strong></div>
                        <div><span>Time on shift</span><strong>{elapsed} min</strong></div>
                    </div>
                    <div className="pos-honest-state"><ReceiptLongRoundedIcon /><span>Expected cash includes completed cash sales. Other cash movements must be reconciled separately.</span></div>
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
        </section>
    );
}
