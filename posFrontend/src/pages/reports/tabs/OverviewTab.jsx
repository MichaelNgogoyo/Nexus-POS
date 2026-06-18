import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded';
import AttachMoneyRounded from '@mui/icons-material/AttachMoneyRounded';
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded';
import InventoryRounded from '@mui/icons-material/InventoryRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import PeopleRounded from '@mui/icons-material/PeopleRounded';
import SavingsRounded from '@mui/icons-material/SavingsRounded';

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
const PIE_FALLBACK_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-bg-tertiary rounded-xl ${className}`} />;
}

function Sparkline({ data, positive = true }) {
  const sparkData = (data || []).map((v) => ({ v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={sparkData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={positive ? '#10b981' : '#ef4444'}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function TrendBadge({ value, inverse = false }) {
  const positive = inverse ? value < 0 : value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full
        ${positive
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}
    >
      {positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function PrimaryKpiCard({ label, value, trend, accentClass, icon, sparklineData, positive }) {
  return (
    <div className={`bg-bg-secondary rounded-2xl border border-border-primary p-5 hover:shadow-lg transition-all duration-200 ${accentClass}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
        </div>
        <div className="p-2 rounded-xl bg-bg-tertiary">{icon}</div>
      </div>
      {trend !== undefined && <TrendBadge value={trend} />}
      {sparklineData && (
        <div className="mt-2 opacity-70">
          <Sparkline data={sparklineData} positive={positive ?? (trend ?? 0) >= 0} />
        </div>
      )}
    </div>
  );
}

function SecondaryKpiCard({ label, value, sub, accentClass, icon }) {
  return (
    <div className={`bg-bg-secondary rounded-2xl border border-border-primary p-4 hover:shadow-lg transition-all duration-200 ${accentClass}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-bg-tertiary">{icon}</div>
        <div>
          <p className="text-xs text-text-muted font-medium">{label}</p>
          <p className="text-lg font-bold text-text-primary">{value}</p>
          {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

const CustomPieLabel = ({ cx, cy, total }) => (
  <>
    <text x={cx} y={cy - 8} textAnchor="middle" className="fill-text-primary" fontSize={13} fontWeight={600}>
      Total
    </text>
    <text x={cx} y={cy + 12} textAnchor="middle" className="fill-text-primary" fontSize={12}>
      {fmt(total)}
    </text>
  </>
);

export default function OverviewTab({ summary, lowStock, isLoading }) {
  const dailyStats = summary?.dailyStats ?? [];
  const recentSales = summary?.recentSales ?? [];
  const topProducts = summary?.topProducts ?? [];

  const weeklyRevenue = useMemo(
    () => dailyStats.slice(-7).reduce((s, d) => s + (d.revenue || 0), 0),
    [dailyStats]
  );
  const monthlyRevenue = useMemo(
    () => dailyStats.slice(-30).reduce((s, d) => s + (d.revenue || 0), 0),
    [dailyStats]
  );

  const prevWeekRevenue = useMemo(
    () => dailyStats.slice(-14, -7).reduce((s, d) => s + (d.revenue || 0), 0),
    [dailyStats]
  );
  const weekTrend = prevWeekRevenue > 0 ? ((weeklyRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : 0;

  const prevMonthRevenue = useMemo(
    () => dailyStats.slice(-60, -30).reduce((s, d) => s + (d.revenue || 0), 0),
    [dailyStats]
  );
  const monthTrend = prevMonthRevenue > 0 ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

  const sparkline7d = dailyStats.slice(-7).map((d) => d.revenue || 0);
  const sparkline30d = dailyStats.slice(-30).map((d) => d.revenue || 0);

  const prevTodayRevenue = dailyStats[dailyStats.length - 2]?.revenue || 0;
  const todayTrend = prevTodayRevenue > 0
    ? (((summary?.todayRevenue || 0) - prevTodayRevenue) / prevTodayRevenue) * 100
    : 0;

  const avgOrderValue = summary?.totalSalesCount > 0
    ? (summary.totalRevenue || 0) / summary.totalSalesCount
    : 0;

  const grossProfit = (summary?.totalRevenue || 0) * 0.3;

  const uniqueCashiers = useMemo(
    () => new Set(recentSales.map((s) => s.cashierId)).size,
    [recentSales]
  );

  const paymentBreakdown = useMemo(() => {
    const acc = {};
    recentSales.forEach((s) => {
      const method = s.paymentMethod || 'OTHER';
      acc[method] = (acc[method] || 0) + (s.totalAmount || 0);
    });
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [recentSales]);

  const paymentTotal = paymentBreakdown.reduce((s, d) => s + d.value, 0);

  const chartData = useMemo(
    () =>
      dailyStats.slice(-30).map((d) => ({
        day: d.day ? d.day.substring(5) : '',
        revenue: d.revenue || 0,
        orders: d.salesCount || 0,
      })),
    [dailyStats]
  );

  const topProductsChart = useMemo(
    () =>
      topProducts.slice(0, 5).map((p) => ({
        name: p.productName?.length > 18 ? p.productName.substring(0, 18) + '…' : p.productName,
        revenue: p.totalRevenue || 0,
        units: p.totalQty || 0,
      })),
    [topProducts]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton className="lg:col-span-3 h-72" />
          <Skeleton className="lg:col-span-2 h-72" />
        </div>
        <Skeleton className="h-52" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1 — Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PrimaryKpiCard
          label="Today's Revenue"
          value={fmt(summary?.todayRevenue)}
          trend={todayTrend}
          accentClass="border-l-4 border-l-emerald-500"
          icon={<AttachMoneyRounded sx={{ fontSize: 22, color: '#10b981' }} />}
          sparklineData={sparkline7d}
          positive={todayTrend >= 0}
        />
        <PrimaryKpiCard
          label="Weekly Revenue"
          value={fmt(weeklyRevenue)}
          trend={weekTrend}
          accentClass="border-l-4 border-l-blue-500"
          icon={<TrendingUpRounded sx={{ fontSize: 22, color: '#3b82f6' }} />}
          sparklineData={sparkline7d}
          positive={weekTrend >= 0}
        />
        <PrimaryKpiCard
          label="Monthly Revenue"
          value={fmt(monthlyRevenue)}
          trend={monthTrend}
          accentClass="border-l-4 border-l-violet-500"
          icon={<SavingsRounded sx={{ fontSize: 22, color: '#8b5cf6' }} />}
          sparklineData={sparkline30d}
          positive={monthTrend >= 0}
        />
        <PrimaryKpiCard
          label="Total Orders"
          value={(summary?.totalSalesCount || 0).toLocaleString()}
          accentClass="border-l-4 border-l-orange-500"
          icon={<ShoppingCartRounded sx={{ fontSize: 22, color: '#f97316' }} />}
          sparklineData={dailyStats.slice(-7).map((d) => d.salesCount || 0)}
        />
      </div>

      {/* Row 2 — Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SecondaryKpiCard
          label="Avg Order Value"
          value={fmt(avgOrderValue)}
          sub="Per transaction"
          accentClass="border-l-4 border-l-cyan-500"
          icon={<AttachMoneyRounded sx={{ fontSize: 20, color: '#06b6d4' }} />}
        />
        <SecondaryKpiCard
          label="Gross Profit Est."
          value={fmt(grossProfit)}
          sub="~30% margin"
          accentClass="border-l-4 border-l-teal-500"
          icon={<TrendingUpRounded sx={{ fontSize: 20, color: '#14b8a6' }} />}
        />
        <SecondaryKpiCard
          label="Active Cashiers"
          value={uniqueCashiers}
          sub="From recent sales"
          accentClass="border-l-4 border-l-indigo-500"
          icon={<PeopleRounded sx={{ fontSize: 20, color: '#6366f1' }} />}
        />
        <SecondaryKpiCard
          label="Low Stock Alerts"
          value={(lowStock?.length || 0)}
          sub={lowStock?.length > 0 ? 'Needs attention' : 'All stocked'}
          accentClass={lowStock?.length > 0 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}
          icon={
            lowStock?.length > 0
              ? <WarningAmberRounded sx={{ fontSize: 20, color: '#ef4444' }} />
              : <InventoryRounded sx={{ fontSize: 20, color: '#10b981' }} />
          }
        />
      </div>

      {/* Row 3 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-3 bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text-primary">30-Day Revenue Trend</h3>
            <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-1 rounded-lg">Last 30 days</span>
          </div>
          {chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-text-muted">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  width={45}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [
                    name === 'revenue' ? fmt(v) : v,
                    name === 'revenue' ? 'Revenue' : 'Orders',
                  ]}
                  labelStyle={{ fontWeight: 600, color: 'var(--color-text-primary)' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#gradRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment Methods Donut */}
        <div className="lg:col-span-2 bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <h3 className="font-bold text-text-primary mb-4">Payment Methods</h3>
          {paymentBreakdown.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-text-muted">No payment data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {paymentBreakdown.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PAYMENT_COLORS[entry.name] || PIE_FALLBACK_COLORS[index % PIE_FALLBACK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [fmt(v), name]}
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
                  y="44%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                >
                  Total
                </text>
                <text
                  x="50%"
                  y="56%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fill: 'var(--color-text-primary)', fontSize: 13, fontWeight: 600 }}
                >
                  {fmt(paymentTotal)}
                </text>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 4 — Top 5 Products */}
      <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
        <h3 className="font-bold text-text-primary mb-4">Top 5 Products by Revenue</h3>
        {topProductsChart.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-text-muted">No product data</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topProductsChart} layout="vertical" margin={{ left: 8, right: 24 }}>
              <defs>
                <linearGradient id="gradBar" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity={1} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={130}
                tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name) => [name === 'revenue' ? fmt(v) : `${v} units`, name === 'revenue' ? 'Revenue' : 'Units']}
              />
              <Bar dataKey="revenue" fill="url(#gradBar)" radius={[0, 6, 6, 0]} name="revenue">
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
