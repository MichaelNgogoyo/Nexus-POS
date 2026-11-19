const money = (amount) => `KSh ${Number(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatReceiptDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function POSReceipt({ receipt }) {
  const businessName = import.meta.env.VITE_RESTAURANT_NAME || 'Nexus POS';
  const phone = import.meta.env.VITE_RESTAURANT_PHONE;
  const email = import.meta.env.VITE_RESTAURANT_EMAIL;
  const amountDue = Math.max(0, Number(receipt.totalAmount || 0) - Number(receipt.amountTendered || 0));

  return <article className="pos-receipt-paper" aria-label={`Receipt for sale ${receipt.saleId}`}>
    <header className="pos-receipt-header">
      <span className="pos-receipt-brand-mark" aria-hidden="true">N</span>
      <h3>{businessName}</h3>
      {phone && <p>{phone}</p>}
      {email && <p>{email}</p>}
      <strong>SALES RECEIPT</strong>
    </header>
    <div className="pos-receipt-meta">
      <span>Receipt <strong>#{String(receipt.saleId).padStart(6, '0')}</strong></span>
      {receipt.orderNumber && <span>Order <strong>{receipt.orderNumber}</strong></span>}
      <span>Date <strong>{formatReceiptDate(receipt.createdAt)}</strong></span>
      {receipt.guestName && <span>Guest <strong>{receipt.guestName}</strong></span>}
      <span>Service <strong>{receipt.orderType === 'DINE_IN' ? `Dine in${receipt.tableId ? ` · table ${receipt.tableId}` : ''}` : receipt.orderType || 'Restaurant'}</strong></span>
      <span>Cashier <strong>{receipt.cashierId || 'Staff'}</strong></span>
      <span>Payment <strong>{receipt.paymentMethod || 'Payment recorded'}</strong></span>
    </div>
    <div className="pos-receipt-items">
      <div className="pos-receipt-columns"><span>Item</span><span>Price</span><span>Qty</span><span>Total</span></div>
      {(receipt.items || []).map((item, index) => <div className="pos-receipt-item" key={`${item.productName}-${index}`}>
        <span className="pos-receipt-item-name">{item.productName}{item.modifiers?.length > 0 && <small>{item.modifiers.join(', ')}</small>}{item.notes && <small>Note: {item.notes}</small>}</span>
        <span>{money(item.unitPrice)}</span><span>{item.quantity}</span><strong>{money(item.lineTotal)}</strong>
      </div>)}
      {(!receipt.items || receipt.items.length === 0) && <p className="pos-receipt-empty">No sale items were returned.</p>}
    </div>
    <div className="pos-receipt-totals">
      <div><span>Subtotal</span><strong>{money(receipt.subtotal)}</strong></div>
      {Number(receipt.discountAmount) > 0 && <div><span>Discount</span><strong>−{money(receipt.discountAmount)}</strong></div>}
      {Number(receipt.taxAmount) > 0 && <div><span>Tax</span><strong>{money(receipt.taxAmount)}</strong></div>}
      {Number(receipt.serviceChargeAmount) > 0 && <div><span>Service charge</span><strong>{money(receipt.serviceChargeAmount)}</strong></div>}
      <div className="pos-receipt-grand-total"><span>Total payable</span><strong>{money(receipt.totalAmount)}</strong></div>
      <div><span>Tendered</span><strong>{money(receipt.amountTendered)}</strong></div>
      {Number(receipt.changeGiven) > 0 && <div><span>Change</span><strong>{money(receipt.changeGiven)}</strong></div>}
      {amountDue > 0 && <div><span>Balance due</span><strong>{money(amountDue)}</strong></div>}
    </div>
    <footer className="pos-receipt-footer"><p>Thank you for dining with us.</p><small>Keep this receipt for your records.</small></footer>
  </article>;
}
