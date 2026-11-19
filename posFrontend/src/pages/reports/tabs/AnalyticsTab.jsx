import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded';
import PointOfSaleRounded from '@mui/icons-material/PointOfSaleRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import PeopleAltRounded from '@mui/icons-material/PeopleAltRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import { formatCurrency, formatPercent } from '../utils/analyticsUtils.js';

const palette = ['#1d8a68', '#2b72b7', '#b6782b', '#815bb7', '#c05858', '#368f9c', '#768d3c'];
const EMPTY_ARRAY = Object.freeze([]);
const tooltipStyle = {
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border-primary)',
  borderRadius: 12,
  color: 'var(--color-text-primary)',
};
const axisStyle = { fill: 'var(--color-text-muted)', fontSize: 11 };

function Card({ title, detail, action, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-border-primary bg-bg-secondary p-4 sm:p-5 ${className}`}>
      {(title || action) && <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="font-semibold text-text-primary">{title}</h2>{detail && <p className="mt-1 text-xs leading-relaxed text-text-muted">{detail}</p>}</div>
        {action}
      </div>}
      {children}
    </section>
  );
}

function Metric({ label, value, change, icon, tone = 'green', footnote }) {
  const tones = {
    green: 'border-l-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/20',
    blue: 'border-l-blue-600 bg-blue-50/70 dark:bg-blue-950/20',
    amber: 'border-l-amber-600 bg-amber-50/70 dark:bg-amber-950/20',
    violet: 'border-l-violet-600 bg-violet-50/70 dark:bg-violet-950/20',
  };
  const positive = change != null && Number(change) >= 0;
  return (
    <div className={`min-w-0 rounded-2xl border border-border-primary border-l-4 p-4 sm:p-5 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
          <p className="mt-2 truncate text-xl font-bold text-text-primary sm:text-2xl">{value}</p>
        </div>
        <span className="rounded-xl bg-bg-secondary p-2 text-text-secondary">{icon}</span>
      </div>
      <div className="mt-2 flex min-h-5 items-center gap-1 text-xs">
        {change != null && <span className={`inline-flex items-center font-semibold ${positive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {positive ? <TrendingUpRounded sx={{ fontSize: 15 }} /> : <TrendingDownRounded sx={{ fontSize: 15 }} />}
          {formatPercent(Math.abs(Number(change)))} vs prior period
        </span>}
        {footnote && <span className="text-text-muted">{footnote}</span>}
      </div>
    </div>
  );
}

function Empty({ children = 'No records for this period.' }) {
  return <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border-primary px-4 text-center text-sm text-text-muted">{children}</div>;
}

function LoadingGrid() {
  return <div className="space-y-5" aria-label="Loading analytics" aria-busy="true">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-bg-tertiary" />)}</div>
    <div className="grid gap-4 xl:grid-cols-2"><div className="h-80 animate-pulse rounded-2xl bg-bg-tertiary" /><div className="h-80 animate-pulse rounded-2xl bg-bg-tertiary" /></div>
  </div>;
}

function displayHour(hour) { return `${String(hour).padStart(2, '0')}:00`; }

export default function AnalyticsTab({ analytics, analyticsLoading, analyticsError, refetchAnalytics }) {
  const [compare, setCompare] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [productSort, setProductSort] = useState('unitsSold');
  const [productDirection, setProductDirection] = useState('desc');

  const chartData = useMemo(() => (analytics?.daily ?? []).map((point) => ({
    ...point,
    label: point.day.slice(5),
    revenue: Number(point.revenue ?? 0),
    previousRevenue: Number(point.previousRevenue ?? 0),
  })), [analytics]);
  const categories = analytics?.categories ?? EMPTY_ARRAY;
  const products = analytics?.products ?? EMPTY_ARRAY;
  const filteredProducts = useMemo(() => products
    .filter((item) => categoryFilter === 'All categories' || item.category === categoryFilter)
    .slice()
    .sort((a, b) => {
      const left = Number(a[productSort] ?? -Infinity);
      const right = Number(b[productSort] ?? -Infinity);
      return productDirection === 'asc' ? left - right : right - left;
    }), [products, categoryFilter, productSort, productDirection]);

  if (analyticsLoading && !analytics) return <LoadingGrid />;
  if (analyticsError) return (
    <Card title="Analytics could not be loaded" detail="The report API did not return this date range.">
      <button onClick={() => refetchAnalytics?.()} className="min-h-11 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white">Retry</button>
    </Card>
  );
  if (!analytics) return <Empty>Choose a valid date range to load analytics.</Empty>;

  const sales = analytics.sales;
  const profit = analytics.profit;
  const inventory = analytics.inventory;
  const operations = analytics.operations;
  const customer = analytics.customers;
  const totalPayments = (analytics.payments ?? []).reduce((sum, item) => sum + Number(item.revenue ?? 0), 0);
  const productCount = products.length;
  const slowProducts = products.filter((item) => item.unitsSold === 0).length;
  const peakHour = (analytics.hourly ?? []).reduce((peak, item) =>
    Number(item.revenue ?? 0) > Number(peak?.revenue ?? 0) ? item : peak, null);

  return (
    <div className="analytics-page space-y-5 sm:space-y-6">
      <style>{`@media print { .analytics-no-print { display:none!important } .analytics-page { color:#111!important } .analytics-page section { break-inside:avoid; box-shadow:none!important; } .reports-content { overflow:visible!important; } }`}</style>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Management intelligence</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Analytics &amp; Insights</h1>
          <p className="mt-1 text-sm text-text-muted">Actual sales, costs, expenses, inventory and operations for {analytics.from} — {analytics.to}.</p>
        </div>
        <div className="analytics-no-print flex items-center gap-2">
          <button onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-primary bg-bg-secondary px-4 text-sm font-semibold text-text-primary hover:bg-bg-tertiary" aria-label="Print or save analytics as PDF">
            <PrintRounded sx={{ fontSize: 18 }} /> Print / PDF
          </button>
        </div>
      </div>

      {analyticsLoading && <div role="status" className="rounded-xl border border-border-primary bg-bg-secondary px-4 py-2 text-xs text-text-muted">Updating selected date range…</div>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Completed revenue" value={formatCurrency(sales.revenue)} change={sales.revenueChangePercent} icon={<PaymentsRounded />} />
        <Metric label="Completed orders" value={Number(sales.orderCount).toLocaleString()} change={sales.averageOrderChangePercent} footnote={`${formatCurrency(sales.averageOrderValue)} average order`} tone="blue" icon={<ReceiptLongRounded />} />
        <Metric label="Est. gross profit" value={formatCurrency(profit.estimatedGrossProfit)} footnote={profit.estimatedGrossProfit == null ? 'Cost data incomplete' : `Current-cost coverage ${formatPercent(profit.costCoveragePercent)}`} tone="violet" icon={<TrendingUpRounded />} />
        <Metric label="Recorded expenses" value={formatCurrency(profit.recordedExpenses)} footnote="From expense records in range" tone="amber" icon={<PointOfSaleRounded />} />
        <Metric label="Est. net profit" value={formatCurrency(profit.estimatedNetProfit)} footnote={profit.estimatedNetProfit == null ? 'Requires complete cost prices' : 'Gross profit less recorded expenses'} tone="violet" icon={<TrendingUpRounded />} />
        <Metric label="Stock valuation" value={formatCurrency(inventory.stockValuationAtCost)} footnote={`${formatPercent(inventory.costCoveragePercent)} of active stock has cost data`} tone="blue" icon={<Inventory2Rounded />} />
        <Metric label="Low stock" value={Number(inventory.lowStockCount).toLocaleString()} footnote="At or below configured threshold" tone="amber" icon={<WarningAmberRounded />} />
        <Metric label="7-day run-rate" value={formatCurrency(sales.sevenDayRunRate)} footnote="Period daily average × 7; not a seasonal forecast" icon={<ScheduleRounded />} />
        <Metric label="Peak sales hour" value={peakHour && Number(peakHour.revenue) > 0 ? displayHour(peakHour.hour) : '—'} footnote={peakHour && Number(peakHour.revenue) > 0 ? `${formatCurrency(peakHour.revenue)} completed revenue` : 'No completed transactions'} tone="blue" icon={<ScheduleRounded />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card title="Revenue trend" detail="Completed sales by day. Comparison aligns each date with the equivalent date in the preceding period." className="xl:col-span-3" action={<button className="analytics-no-print rounded-lg border border-border-primary px-3 py-2 text-xs font-semibold text-text-secondary" aria-pressed={compare} onClick={() => setCompare((value) => !value)}>{compare ? 'Hide' : 'Show'} comparison</button>}>
          {chartData.some((point) => point.revenue > 0 || point.previousRevenue > 0) ? <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs><linearGradient id="analyticsRevenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1d8a68" stopOpacity={0.28} /><stop offset="95%" stopColor="#1d8a68" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} minTickGap={18} />
              <YAxis tick={axisStyle} tickFormatter={(value) => `${Math.round(value / 1000)}k`} width={48} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatCurrency(value), name === 'previousRevenue' ? 'Prior period' : 'Revenue']} labelFormatter={(label) => `Day ${label}`} />
              <Legend formatter={(name) => <span className="text-xs text-text-secondary">{name === 'previousRevenue' ? 'Prior period' : 'Revenue'}</span>} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="#1d8a68" strokeWidth={2.5} fill="url(#analyticsRevenueFill)" />
              {compare && <Area type="monotone" dataKey="previousRevenue" name="previousRevenue" stroke="#8a93a0" strokeDasharray="5 4" fill="none" strokeWidth={2} />}
            </AreaChart>
          </ResponsiveContainer> : <Empty>No completed sales for either period.</Empty>}
          <div className="mt-2 flex flex-wrap justify-between gap-2 border-t border-border-primary pt-3 text-xs text-text-muted"><span>Prior period: {analytics.previousFrom} — {analytics.previousTo}</span><span>Sales trend uses completed transactions only.</span></div>
        </Card>

        <Card title="Sales by hour" detail="All completed transactions in the selected period, grouped by local server time." className="xl:col-span-2">
          {analytics.hourly?.some((item) => item.orders > 0) ? <ResponsiveContainer width="100%" height={270}>
            <BarChart data={analytics.hourly} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" vertical={false} />
              <XAxis dataKey="hour" tick={axisStyle} tickFormatter={displayHour} interval={2} />
              <YAxis tick={axisStyle} width={42} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={displayHour} formatter={(value, name) => [name === 'revenue' ? formatCurrency(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']} />
              <Bar dataKey="orders" name="Orders" fill="#2b72b7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer> : <Empty>No completed transactions to group by hour.</Empty>}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Payment mix" detail="Share of completed revenue by recorded payment method.">
          {totalPayments > 0 ? <div className="grid items-center gap-3 sm:grid-cols-[minmax(130px,1fr)_1fr]">
            <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={analytics.payments} dataKey="revenue" nameKey="method" innerRadius={52} outerRadius={82} paddingAngle={3}>
              {analytics.payments.map((item, index) => <Cell key={item.method} fill={palette[index % palette.length]} />)}
            </Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(value)} /></PieChart></ResponsiveContainer>
            <div className="space-y-3">{analytics.payments.map((item, index) => <div key={item.method} className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 text-text-secondary"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: palette[index % palette.length] }} />{item.method}</span><span className="text-right font-semibold text-text-primary">{formatCurrency(item.revenue)} <small className="block text-xs font-normal text-text-muted">{item.transactions} sales</small></span></div>)}</div>
          </div> : <Empty>No payments in this period.</Empty>}
        </Card>
        <Card title="Category performance" detail="Select a category to filter product performance below.">
          {categories.length ? <div className="space-y-2">{categories.map((item, index) => {
            const share = sales.revenue > 0 ? (Number(item.revenue) / Number(sales.revenue)) * 100 : 0;
            return <button key={item.category} onClick={() => setCategoryFilter((current) => current === item.category ? 'All categories' : item.category)} aria-pressed={categoryFilter === item.category} className={`w-full rounded-xl p-3 text-left transition ${categoryFilter === item.category ? 'bg-bg-tertiary ring-1 ring-brand-primary' : 'hover:bg-bg-tertiary'}`}>
              <span className="flex justify-between gap-3 text-sm"><strong className="truncate text-text-primary">{item.category}</strong><span className="text-text-secondary">{formatCurrency(item.revenue)}</span></span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-bg-tertiary"><i className="block h-full rounded-full" style={{ width: `${Math.max(1, Math.min(100, share))}%`, background: palette[index % palette.length] }} /></span>
              <span className="mt-1 block text-xs text-text-muted">{Number(item.unitsSold).toLocaleString()} units · {share.toFixed(1)}% of revenue</span>
            </button>;
          })}</div> : <Empty>No categorized sales in this period.</Empty>}
        </Card>
        <Card title="Profit &amp; loss view" detail="Sales less estimated product cost and recorded expenses. Not an accounting statement.">
          <div className="space-y-4">
            <div className="flex justify-between gap-3 text-sm"><span className="text-text-secondary">Sales before tax &amp; service charge</span><strong className="text-text-primary">{formatCurrency(profit.netSalesRevenue)}</strong></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-text-secondary">Estimated cost of goods</span><strong className="text-text-primary">{formatCurrency(profit.estimatedCostOfGoods)}</strong></div>
            <div className="flex justify-between gap-3 border-t border-border-primary pt-3 text-sm"><span className="text-text-secondary">Estimated gross profit</span><strong className="text-text-primary">{formatCurrency(profit.estimatedGrossProfit)}</strong></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-text-secondary">Recorded expenses</span><strong className="text-text-primary">− {formatCurrency(profit.recordedExpenses)}</strong></div>
            <div className="flex justify-between gap-3 border-t border-border-primary pt-3 text-sm"><span className="font-semibold text-text-primary">Estimated net profit</span><strong className={Number(profit.estimatedNetProfit) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}>{formatCurrency(profit.estimatedNetProfit)}</strong></div>
            <p className="rounded-xl bg-bg-tertiary p-3 text-xs leading-relaxed text-text-muted">{profit.costBasis} {profit.estimatedGrossProfit == null ? `Only ${formatPercent(profit.costCoveragePercent)} of sold units have a known current cost; profit is withheld until cost data is complete.` : `Current cost coverage: ${formatPercent(profit.costCoveragePercent)}.`}</p>
            <div className="grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-bg-tertiary p-3"><span className="text-text-muted">Tax collected</span><strong className="mt-1 block text-text-primary">{formatCurrency(sales.taxCollected)}</strong></div><div className="rounded-xl bg-bg-tertiary p-3"><span className="text-text-muted">Service charge</span><strong className="mt-1 block text-text-primary">{formatCurrency(sales.serviceCharge)}</strong></div></div>
          </div>
        </Card>
      </div>

      <Card title="Product performance" detail={`${productCount} active catalog or previously sold products. No sales in period: ${slowProducts}. Product cost and margin use current catalog cost, not a historical cost snapshot.`} action={<div className="analytics-no-print flex flex-wrap gap-2">
        <select aria-label="Filter products by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="min-h-10 rounded-lg border border-border-primary bg-bg-secondary px-3 text-xs text-text-primary"><option>All categories</option>{categories.map((category) => <option key={category.category}>{category.category}</option>)}</select>
        <select aria-label="Sort products" value={productSort} onChange={(event) => setProductSort(event.target.value)} className="min-h-10 rounded-lg border border-border-primary bg-bg-secondary px-3 text-xs text-text-primary"><option value="unitsSold">Units sold</option><option value="revenue">Revenue</option><option value="estimatedGrossProfit">Estimated gross profit</option></select>
        <button aria-label="Toggle sort direction" onClick={() => setProductDirection((value) => value === 'desc' ? 'asc' : 'desc')} className="min-h-10 rounded-lg border border-border-primary px-3 text-xs text-text-primary">{productDirection === 'desc' ? 'Highest first' : 'Lowest first'}</button>
      </div>}>
        {filteredProducts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b border-border-primary text-left text-xs uppercase tracking-wide text-text-muted"><th className="pb-3 pr-4">Product</th><th className="pb-3 pr-4">Category</th><th className="pb-3 pr-4 text-right">Units</th><th className="pb-3 pr-4 text-right">Revenue</th><th className="pb-3 pr-4 text-right">Current cost est.</th><th className="pb-3 text-right">Margin est.</th></tr></thead><tbody>{filteredProducts.map((item) => <tr key={item.productId} className="border-b border-border-primary last:border-0"><td className="py-3 pr-4 font-medium text-text-primary">{item.product}</td><td className="py-3 pr-4 text-text-secondary">{item.category}</td><td className="py-3 pr-4 text-right text-text-secondary">{Number(item.unitsSold).toLocaleString()}</td><td className="py-3 pr-4 text-right font-semibold text-text-primary">{formatCurrency(item.revenue)}</td><td className="py-3 pr-4 text-right text-text-secondary">{formatCurrency(item.estimatedCost)}</td><td className="py-3 text-right text-text-secondary">{formatPercent(item.estimatedMarginPercent)}</td></tr>)}</tbody></table></div> : <Empty>No products match this category for the selected period.</Empty>}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Cashier performance" detail="Completed payment totals by cashier identity; this is not an individual productivity score.">
          {analytics.cashiers?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[450px] text-sm"><thead><tr className="border-b border-border-primary text-left text-xs uppercase text-text-muted"><th className="pb-3">Cashier</th><th className="pb-3 text-right">Sales</th><th className="pb-3 text-right">Orders</th><th className="pb-3 text-right">Avg order</th></tr></thead><tbody>{analytics.cashiers.map((item) => <tr key={item.cashier} className="border-b border-border-primary last:border-0"><td className="py-3 font-medium text-text-primary">{item.cashier}</td><td className="py-3 text-right text-text-primary">{formatCurrency(item.revenue)}</td><td className="py-3 text-right text-text-secondary">{item.transactions}</td><td className="py-3 text-right text-text-secondary">{formatCurrency(item.averageOrderValue)}</td></tr>)}</tbody></table></div> : <Empty>No completed sales attributed to a cashier.</Empty>}
        </Card>
        <Card title="Operations &amp; service" detail="Kitchen timings and current table status are from persisted operational records.">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-bg-tertiary p-4"><p className="text-xs text-text-muted">Avg. kitchen time</p><p className="mt-2 text-xl font-bold text-text-primary">{operations.averageKitchenPreparationMinutes == null ? '—' : `${Number(operations.averageKitchenPreparationMinutes).toFixed(1)} min`}</p><p className="mt-1 text-xs text-text-muted">Received to ready</p></div>
            <div className="rounded-xl bg-bg-tertiary p-4"><p className="text-xs text-text-muted">Tables occupied now</p><p className="mt-2 text-xl font-bold text-text-primary">{operations.occupiedTableCount} / {operations.tableCount}</p><p className="mt-1 text-xs text-text-muted">{formatPercent(operations.currentTableOccupancyPercent)} snapshot occupancy</p></div>
            <div className="col-span-2 rounded-xl border border-border-primary p-3 text-xs leading-relaxed text-text-muted">{operations.tableUtilizationNote}</div>
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-xl bg-bg-tertiary p-3"><span className="text-xs text-text-muted">Stock received</span><strong className="mt-1 block text-text-primary">{Number(inventory.unitsReceived).toLocaleString()} units</strong></div><div className="rounded-xl bg-bg-tertiary p-3"><span className="text-xs text-text-muted">Stock issued</span><strong className="mt-1 block text-text-primary">{Number(inventory.unitsIssued).toLocaleString()} units</strong></div><div className="rounded-xl bg-bg-tertiary p-3"><span className="text-xs text-text-muted">Stock turnover</span><strong className="mt-1 block text-text-primary">{inventory.estimatedStockTurnover == null ? 'Unavailable' : `${Number(inventory.estimatedStockTurnover).toFixed(2)}×`}</strong><span className="mt-1 block text-xs text-text-muted">{inventory.stockTurnoverLimitation}</span></div></div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Customer records" detail="Customer records added within the selected dates; sales are not linked to customer records in the current schema.">
          <div className="flex items-center gap-4 rounded-xl bg-bg-tertiary p-4"><PeopleAltRounded className="text-text-secondary" /><div><p className="text-xs text-text-muted">New customer records</p><p className="text-2xl font-bold text-text-primary">{customer.registeredCustomersAdded.toLocaleString()}</p></div><span className="ml-auto text-right text-xs text-text-muted">{customer.registeredCustomerCount.toLocaleString()} total records</span></div>
          <p className="mt-3 text-xs leading-relaxed text-text-muted">{customer.limitation}</p>
        </Card>
        <Card title="Returns, voids &amp; stock alerts" detail="Lifecycle totals from saved sales and configured product thresholds.">
          <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/20"><p className="text-xs text-text-muted">Returned sales</p><p className="mt-1 text-lg font-bold text-text-primary">{sales.refundsCount} · {formatCurrency(sales.returnedSalesAmount)}</p></div><div className="rounded-xl bg-red-50 p-4 dark:bg-red-950/20"><p className="text-xs text-text-muted">Voided sales</p><p className="mt-1 text-lg font-bold text-text-primary">{sales.voidedCount} · {formatCurrency(sales.voidedSalesAmount)}</p></div></div>
          {analytics.lowStockProducts?.length ? <div className="mt-4 space-y-2">{analytics.lowStockProducts.map((item) => <div key={item.productId} className="flex justify-between gap-3 rounded-lg border border-border-primary px-3 py-2 text-sm"><span className="truncate text-text-primary">{item.product}</span><span className="shrink-0 text-amber-700 dark:text-amber-400">{item.quantity} / {item.threshold}</span></div>)}</div> : <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircleRounded sx={{ fontSize: 18 }} />No products currently below threshold.</div>}
        </Card>
      </div>

      <Card title="Automated insights &amp; anomalies" detail="Rule-based observations from actual records. Thresholds are heuristic and should guide review, not replace management judgment.">
        {analytics.insights?.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{analytics.insights.map((item, index) => <article key={`${item.title}-${index}`} className={`rounded-xl border p-4 ${item.severity === 'warning' ? 'border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20' : item.severity === 'positive' ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-border-primary bg-bg-tertiary'}`}><div className="flex items-center gap-2"><WarningAmberRounded sx={{ fontSize: 18 }} className={item.severity === 'warning' ? 'text-amber-600' : 'text-text-muted'} /><h3 className="text-sm font-semibold text-text-primary">{item.title}</h3></div><p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.detail}</p></article>)}</div> : <Empty>No insight rules triggered for the selected data.</Empty>}
      </Card>

      <div className="flex flex-wrap justify-between gap-2 border-t border-border-primary pt-3 text-xs text-text-muted"><span>Data source: persisted POS sales, products, expenses, stock movements, kitchen tickets and customer records.</span><span>Empty or unavailable metrics are left blank instead of estimated.</span></div>
    </div>
  );
}
