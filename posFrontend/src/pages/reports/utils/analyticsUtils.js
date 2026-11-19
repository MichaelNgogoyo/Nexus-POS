export function buildAnalyticsExportRows(data) {
  if (!data) return [];
  const rows = [];
  const add = (section, name, value, count = '') => rows.push({ Section: section, Name: name, Value: value ?? '', Count: count });
  add('Sales', 'Revenue', data.sales?.revenue, data.sales?.orderCount);
  add('Sales', 'Average order value', data.sales?.averageOrderValue);
  add('Sales', 'Previous period revenue', data.sales?.previousRevenue, data.sales?.previousOrderCount);
  add('Sales', 'Revenue change percent', data.sales?.revenueChangePercent);
  add('Sales', 'Tax collected', data.sales?.taxCollected);
  add('Sales', 'Service charge', data.sales?.serviceCharge);
  add('Sales', 'Returned sales', data.sales?.returnedSalesAmount, data.sales?.refundsCount);
  add('Sales', 'Voided sales', data.sales?.voidedSalesAmount, data.sales?.voidedCount);
  add('Profit', 'Estimated cost of goods', data.profit?.estimatedCostOfGoods);
  add('Profit', 'Sales before tax and service charge', data.profit?.netSalesRevenue);
  add('Profit', 'Estimated gross profit', data.profit?.estimatedGrossProfit);
  add('Profit', 'Recorded expenses', data.profit?.recordedExpenses);
  add('Profit', 'Estimated net profit', data.profit?.estimatedNetProfit);
  add('Inventory', 'Stock valuation at current cost', data.inventory?.stockValuationAtCost);
  add('Inventory', 'Low stock products', data.inventory?.lowStockCount);
  add('Inventory', 'Units received', data.inventory?.unitsReceived);
  add('Inventory', 'Units issued', data.inventory?.unitsIssued);
  add('Inventory', 'Estimated stock turnover', data.inventory?.estimatedStockTurnover ?? 'Unavailable');
  add('Customers', 'New customer records', data.customers?.registeredCustomersAdded);
  add('Customers', 'Customer records total', data.customers?.registeredCustomerCount);
  add('Operations', 'Tables occupied now', data.operations?.occupiedTableCount, data.operations?.tableCount);
  add('Operations', 'Average kitchen preparation minutes', data.operations?.averageKitchenPreparationMinutes);
  for (const point of data.daily ?? []) add('Daily sales', point.day, point.revenue, point.orders);
  for (const point of data.hourly ?? []) add('Sales by hour', `${String(point.hour).padStart(2, '0')}:00`, point.revenue, point.orders);
  for (const point of data.payments ?? []) add('Payment method', point.method, point.revenue, point.transactions);
  for (const point of data.categories ?? []) add('Category', point.category, point.revenue, point.unitsSold);
  for (const point of data.products ?? []) {
    add('Product revenue', point.product, point.revenue, point.unitsSold);
    add('Product estimated cost', point.product, point.estimatedCost, point.category);
    add('Product estimated gross profit', point.product, point.estimatedGrossProfit, point.estimatedMarginPercent);
  }
  for (const point of data.cashiers ?? []) add('Cashier', point.cashier, point.revenue, point.transactions);
  for (const point of data.lowStockProducts ?? []) add('Low stock', point.product, point.quantity, point.threshold);
  for (const point of data.insights ?? []) add(`Insight: ${point.severity}`, point.title, point.detail);
  return rows;
}

export function formatCurrency(value) {
  return value == null ? '—' : `KSh ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPercent(value) {
  return value == null ? '—' : `${Number(value).toFixed(1)}%`;
}
