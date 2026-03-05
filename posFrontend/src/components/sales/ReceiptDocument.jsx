import React, { forwardRef } from 'react';

/**
 * Thermal-style receipt component designed for clean printing.
 * Pass a ref from react-to-print's useReactToPrint.
 *
 * Props: { receipt, taxRate, storeName?, storeAddress?, storePhone? }
 */
const ReceiptDocument = forwardRef(({
    receipt,
    taxRate,
    storeName = 'POINT OF SALE',
    storeAddress = '',
    storePhone = '',
}, ref) => {
    if (!receipt) return null;

    const fmt = (v) =>
        new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(v || 0);

    const dateStr = receipt.createdAt
        ? new Date(receipt.createdAt).toLocaleString('en-KE', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
          })
        : '';

    return (
        <>
            {/* ── Print-only styles injected inline so they always travel with the component ── */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #receipt-printable,
                    #receipt-printable * { visibility: visible !important; }
                    #receipt-printable {
                        position: fixed !important;
                        top: 0; left: 0;
                        width: 80mm;
                        margin: 0 auto;
                        padding: 0;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    @page {
                        size: 80mm auto;
                        margin: 4mm 2mm;
                    }
                }
            `}</style>

            <div
                id="receipt-printable"
                ref={ref}
                style={{
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: '12px',
                    width: '80mm',
                    maxWidth: '80mm',
                    padding: '8px 10px',
                    color: '#111',
                    backgroundColor: '#fff',
                    lineHeight: '1.5',
                }}
            >
                {/* ── Header ── */}
                <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '2px' }}>
                        {storeName}
                    </div>
                    {storeAddress && (
                        <div style={{ fontSize: '11px', marginTop: '2px' }}>{storeAddress}</div>
                    )}
                    {storePhone && (
                        <div style={{ fontSize: '11px' }}>Tel: {storePhone}</div>
                    )}
                </div>

                <Divider />

                {/* ── Meta ── */}
                <Row label="Receipt #" value={String(receipt.saleId).padStart(6, '0')} />
                <Row label="Date" value={dateStr} />
                <Row label="Cashier" value={receipt.cashierId} />
                <Row label="Payment" value={receipt.paymentMethod} />

                <Divider dashed />

                {/* ── Column headers ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px' }}>
                    <span style={{ flex: '1 1 50%' }}>ITEM</span>
                    <span style={{ textAlign: 'center', flex: '0 0 20%' }}>QTY</span>
                    <span style={{ textAlign: 'right', flex: '0 0 30%' }}>AMOUNT</span>
                </div>

                <Divider thin />

                {/* ── Line items ── */}
                {receipt.items.map((item, i) => (
                    <div key={`${item.productId}-${i}`} style={{ marginBottom: '2px' }}>
                        <div style={{ fontSize: '12px', wordBreak: 'break-word' }}>
                            {item.productName}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#444' }}>
                            <span style={{ flex: '1 1 50%' }}>
                                {fmt(item.unitPrice)} × {item.quantity}
                            </span>
                            <span style={{ textAlign: 'center', flex: '0 0 20%' }}>{item.quantity}</span>
                            <span style={{ textAlign: 'right', flex: '0 0 30%', fontWeight: 'bold', color: '#111' }}>
                                {fmt(item.lineTotal)}
                            </span>
                        </div>
                    </div>
                ))}

                <Divider thin />

                {/* ── Totals ── */}
                <Row label="Subtotal" value={fmt(receipt.subtotal)} />
                {receipt.discountAmount > 0 && (
                    <Row label={`Discount`} value={`-${fmt(receipt.discountAmount)}`} />
                )}
                <Row
                    label={`Tax (${(taxRate * 100).toFixed(0)}%)`}
                    value={fmt(receipt.tax)}
                />

                <Divider />

                <Row
                    label="TOTAL"
                    value={fmt(receipt.total)}
                    bold
                    large
                />

                {receipt.paymentMethod === 'Cash' && (
                    <>
                        <Divider thin />
                        <Row label="Tendered" value={fmt(receipt.amountTendered)} />
                        <Row label="Change" value={fmt(receipt.changeGiven)} bold />
                    </>
                )}

                <Divider />

                {/* ── Barcode-style receipt number ── */}
                <div style={{ textAlign: 'center', margin: '6px 0 4px' }}>
                    <div style={{ letterSpacing: '4px', fontSize: '22px', lineHeight: '1' }}>
                        {'|'.repeat(20)}
                    </div>
                    <div style={{ fontSize: '10px', marginTop: '2px', letterSpacing: '1px' }}>
                        #{String(receipt.saleId).padStart(8, '0')}
                    </div>
                </div>

                <Divider thin />

                {/* ── Footer ── */}
                <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '6px', lineHeight: '1.6' }}>
                    <div>Thank you for your purchase!</div>
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                        Goods once sold are not returnable
                    </div>
                    <div style={{ fontSize: '10px', color: '#555' }}>
                        unless defective. Keep receipt for warranty.
                    </div>
                </div>

                {/* Bottom spacing for tear line */}
                <div style={{ marginTop: '12px', borderTop: '1px dashed #aaa', paddingTop: '4px', textAlign: 'center', fontSize: '10px', color: '#aaa' }}>
                    ✂ &nbsp; cut here
                </div>
            </div>
        </>
    );
});

ReceiptDocument.displayName = 'ReceiptDocument';
export default ReceiptDocument;

/* ── Small layout helpers ── */

function Row({ label, value, bold, large }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: bold ? 'bold' : 'normal',
            fontSize: large ? '14px' : '12px',
            margin: '1px 0',
        }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}

function Divider({ dashed, thin }) {
    return (
        <div style={{
            borderTop: dashed ? '1px dashed #999' : thin ? '1px dotted #ccc' : '1px solid #333',
            margin: '4px 0',
        }} />
    );
}
