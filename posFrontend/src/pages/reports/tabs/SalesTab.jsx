import { useMemo, useState } from 'react';
import {
  ComposedChart, Area, Bar, Line,
  BarChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded';
import { exportToCSV, exportToExcel } from '../utils/exportUtils.js';

const fmt = (v) =>
  `KSh ${Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const tooltipStyle = {
  backgroundColor: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border-primary)',
  borderRadius: '12px',
  padding: '10px 14px',
};

const HOUR_MOCK = [
  { hour: '6am', orders: 3 }, { hour: '7am', orders: 8 }, { hour: '8am', orders: 14 },
  { hour: '9am', orders: 18 }, { hour: '10am', orders: 22 }, { hour: '11am', orders: 27 },
  { hour: '12pm', orders: 41 }, { hour: '1pm', orders: 38 }, { hour: '2pm', orders: 29 },
  { hour: '3pm', orders: 21 }, { hour: '4pm', orders: 19 }, { hour: '5pm', orders: 24 },
  { hour: '6pm', orders: 33 }, { hour: '7pm', orders: 42 }, { hour: '8pm', orders: 35 },
  { hour: '9pm', orders: 20 }, { hour: '10pm', orders: 10 },
];

const DOW_MOCK = [
  { day: 'Mon', orders: 45, revenue: 18200 },
  { day: 'Tue', orders: 52, revenue: 21400 },
  { day: 'Wed', orders: 48, revenue: 19800 },
  { day: 'Thu', orders: 61, revenue: 25600 },
  { day: 'Fri', orders: 74, revenue: 31500 },
  { day: 'Sat', orders: 88, revenue: 38400 },
  { day: 'Sun', orders: 67, revenue: 28900 },
];

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-bg-tertiary rounded-xl ${className}`} />;
}

const STATUS_STYLES = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  RETURNED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  VOIDED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const PERIOD_OPTIONS = [
  { label: 'Today', value: '1D' },
  { label: '7 Days', value: '7D' },
  { label: '30 Days', value: '30D' },
  { label: '90 Days', value: '90D' },
];

export default function SalesTab({ summary, isLoading }) {
  const [period, setPeriod] = useState('30D');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const dailyStats = summary?.dailyStats ?? [];
  const recentSales = summary?.recentSales ?? [];

  const days = period === '1D' ? 1 : period === '7D' ? 7 : period === '30D' ? 30 : 90;
  const filtered = dailyStats.slice(-days);
  const prevPeriod = dailyStats.slice(-days * 2, -days);

  const revenue = filtered.reduce((s, d) => s + (d.revenue || 0), 0);
  const orders = filtered.reduce((s, d) => s + (d.salesCount || 0), 0);
  const prevRevenue = prevPeriod.reduce((s, d) => s + (d.revenue || 0), 0);
  const prevOrders = prevPeriod.reduce((s, d) => s + (d.salesCount || 0), 0);
  const revTrend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
  const ordTrend = prevOrders > 0 ? ((orders - prevOrders) / prevOrders) * 100 : 0;
  const avg = orders > 0 ? revenue / orders : 0;

  const chartData = useMemo(
    () =>
      filtered.map((d) => ({
        day: d.day ? d.day.substring(5) : '',
        revenue: d.revenue || 0,
        orders: d.salesCount || 0,
      })),
    [filtered]
  );

  const totalPages = Math.ceil(recentSales.length / PAGE_SIZE);
  const pagedSales = recentSales.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportData = recentSales.map((s) => ({
    ID: s.id,
    Cashier: s.cashierId,
    Payment: s.paymentMethod,
    Amount: s.totalAmount,
    Status: s.status,
    Items: (s.items || []).map((i) => `${i.productName}×${i.quantity}`).join('; '),
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setPeriod(opt.value); setPage(0); }}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                period === opt.value
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-border-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(exportData, 'sales-report')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-all"
          >
            <FileDownloadRounded sx={{ fontSize: 16 }} /> CSV
          </button>
          <button
            onClick={() => exportToExcel(exportData, 'sales-report', 'Sales')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-all"
          >
            <FileDownloadRounded sx={{ fontSize: 16 }} /> Excel
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Revenue', value: fmt(revenue),
            trend: revTrend, accent: 'border-l-4 border-l-emerald-500',
          },
          {
            label: 'Orders', value: orders.toLocaleString(),
            trend: ordTrend, accent: 'border-l-4 border-l-blue-500',
          },
          {
            label: 'Avg Order', value: fmt(avg),
            accent: 'border-l-4 border-l-violet-500',
          },
          {
            label: 'Tax Collected', value: fmt(revenue * 0.16),
            sub: '16% VAT est.', accent: 'border-l-4 border-l-amber-500',
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-bg-secondary rounded-2xl border border-border-primary p-4 ${kpi.accent}`}>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wide">{kpi.label}</p>
            <p className="text-xl font-bold text-text-primary mt-1">{kpi.value}</p>
            {kpi.sub && <p className="text-xs text-text-muted mt-0.5">{kpi.sub}</p>}
            {kpi.trend !== undefined && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full mt-1
                ${kpi.trend >= 0
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {kpi.trend >= 0 ? '↑' : '↓'} {Math.abs(kpi.trend).toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Main ComposedChart */}
      <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
        <h3 className="font-bold text-text-primary mb-4">Revenue &amp; Orders — {period} Overview</h3>
        {chartData.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-text-muted">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSalesRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                width={45}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                width={30}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name) => [name === 'revenue' ? fmt(v) : v, name === 'revenue' ? 'Revenue' : 'Orders']}
              />
              <Legend
                formatter={(val) => (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                    {val === 'revenue' ? 'Revenue' : 'Orders'}
                  </span>
                )}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradSalesRevenue)"
              />
              <Bar yAxisId="left" dataKey="revenue" fill="#10b981" opacity={0.15} radius={[3, 3, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Hourly + Weekly charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-text-primary">Sales by Hour</h3>
            <span className="text-xs text-text-muted bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              Sample Data
            </span>
          </div>
          <p className="text-xs text-text-muted mb-3">Typical peak hour distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={HOUR_MOCK} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="orders" fill="var(--color-brand-primary)" radius={[3, 3, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-text-primary">Sales by Day of Week</h3>
            <span className="text-xs text-text-muted bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              Sample Data
            </span>
          </div>
          <p className="text-xs text-text-muted mb-3">Typical weekly pattern</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DOW_MOCK} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [fmt(v), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sales Table */}
      {recentSales.length > 0 && (
        <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <h3 className="font-bold text-text-primary mb-4">Recent Sales</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted border-b border-border-primary text-left text-xs uppercase tracking-wide">
                  <th className="pb-3 pr-4">Order #</th>
                  <th className="pb-3 pr-4">Cashier</th>
                  <th className="pb-3 pr-4 hidden md:table-cell">Items</th>
                  <th className="pb-3 pr-4">Payment</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pagedSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-border-primary last:border-0 hover:bg-bg-tertiary transition-colors"
                  >
                    <td className="py-3 pr-4 font-mono text-xs">
                      #{String(sale.id).padStart(6, '0')}
                    </td>
                    <td className="py-3 pr-4 font-medium text-text-primary">
                      {sale.cashierId}
                    </td>
                    <td className="py-3 pr-4 text-text-muted hidden md:table-cell max-w-[200px] truncate">
                      {(sale.items || []).slice(0, 2).map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                      {(sale.items || []).length > 2 && ` +${sale.items.length - 2}`}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary text-xs font-medium">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[sale.status] || STATUS_STYLES.COMPLETED}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-text-primary">
                      {fmt(sale.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-primary">
              <p className="text-xs text-text-muted">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, recentSales.length)} of {recentSales.length}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 text-xs rounded-lg bg-bg-tertiary text-text-secondary disabled:opacity-40 hover:bg-border-primary transition-all"
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-xs rounded-lg bg-bg-tertiary text-text-secondary disabled:opacity-40 hover:bg-border-primary transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
