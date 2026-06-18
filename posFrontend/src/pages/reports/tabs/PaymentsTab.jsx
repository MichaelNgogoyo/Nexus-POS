import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const fmt = (v) =>
  `KSh ${Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const tooltipStyle = {
  backgroundColor: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border-primary)',
  borderRadius: '12px',
  padding: '10px 14px',
};

const PAYMENT_COLORS = {
  CASH: '#10b981',
  CARD: '#3b82f6',
  MPESA: '#8b5cf6',
  MIXED: '#f59e0b',
};
const FALLBACK_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

const PAYMENT_TREND_MOCK = [
  { day: 'Mon', CASH: 12, CARD: 8, MPESA: 18 },
  { day: 'Tue', CASH: 15, CARD: 11, MPESA: 22 },
  { day: 'Wed', CASH: 10, CARD: 9, MPESA: 20 },
  { day: 'Thu', CASH: 14, CARD: 13, MPESA: 28 },
  { day: 'Fri', CASH: 18, CARD: 16, MPESA: 35 },
  { day: 'Sat', CASH: 22, CARD: 19, MPESA: 42 },
  { day: 'Sun', CASH: 17, CARD: 14, MPESA: 30 },
];

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-bg-tertiary rounded-xl ${className}`} />;
}

export default function PaymentsTab({ summary, isLoading }) {
  const recentSales = summary?.recentSales ?? [];

  const breakdown = useMemo(() => {
    const acc = {};
    recentSales.forEach((s) => {
      const m = s.paymentMethod || 'OTHER';
      if (!acc[m]) acc[m] = { count: 0, total: 0 };
      acc[m].count += 1;
      acc[m].total += s.totalAmount || 0;
    });
    return acc;
  }, [recentSales]);

  const methods = Object.keys(breakdown);
  const grandTotal = methods.reduce((s, m) => s + breakdown[m].total, 0);

  const pieData = methods.map((m) => ({ name: m, value: breakdown[m].total }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-secondary rounded-2xl border border-border-primary p-4 border-l-4 border-l-blue-500">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Total Collected</p>
          <p className="text-xl font-bold text-text-primary mt-1">{fmt(grandTotal)}</p>
          <p className="text-xs text-text-muted mt-1">{recentSales.length} transactions</p>
        </div>
        {['CASH', 'CARD', 'MPESA'].map((method) => {
          const d = breakdown[method];
          return (
            <div
              key={method}
              className="bg-bg-secondary rounded-2xl border border-border-primary p-4 border-l-4"
              style={{ borderLeftColor: PAYMENT_COLORS[method] || '#6b7280' }}
            >
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">{method}</p>
              <p className="text-xl font-bold text-text-primary mt-1">{fmt(d?.total || 0)}</p>
              <p className="text-xs text-text-muted mt-1">{d?.count || 0} transactions</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut */}
        <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <h3 className="font-bold text-text-primary mb-2">Payment Distribution</h3>
          {pieData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-text-muted">No payment data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PAYMENT_COLORS[entry.name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [
                    fmt(v),
                    `${grandTotal > 0 ? ((v / grandTotal) * 100).toFixed(1) : 0}%`,
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{value}</span>
                  )}
                />
                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                >
                  Total
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fill: 'var(--color-text-primary)', fontSize: 13, fontWeight: 600 }}
                >
                  {fmt(grandTotal)}
                </text>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 7-Day Trend */}
        <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-text-primary">Payment Method Trend</h3>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              Sample Data
            </span>
          </div>
          <p className="text-xs text-text-muted mb-3">Transaction count by method (last 7 days)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={PAYMENT_TREND_MOCK} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>{value}</span>
                )}
              />
              <Bar dataKey="CASH" fill={PAYMENT_COLORS.CASH} radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="CARD" fill={PAYMENT_COLORS.CARD} radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="MPESA" fill={PAYMENT_COLORS.MPESA} radius={[3, 3, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      {recentSales.length > 0 && (
        <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <h3 className="font-bold text-text-primary mb-4">Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted border-b border-border-primary text-left text-xs uppercase tracking-wide">
                  <th className="pb-3 pr-4">Order #</th>
                  <th className="pb-3 pr-4">Cashier</th>
                  <th className="pb-3 pr-4">Method</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.slice(0, 15).map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-border-primary last:border-0 hover:bg-bg-tertiary transition-colors"
                  >
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      #{String(sale.id).padStart(6, '0')}
                    </td>
                    <td className="py-2.5 pr-4">{sale.cashierId}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: PAYMENT_COLORS[sale.paymentMethod] || '#6b7280' }}
                      >
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        sale.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold">{fmt(sale.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
