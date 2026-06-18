import { useMemo, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
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

const CAT_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-bg-tertiary rounded-xl ${className}`} />;
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <span className="ml-1 text-text-muted opacity-40">↕</span>;
  return sortDir === 'asc'
    ? <ArrowUpwardRounded sx={{ fontSize: 14, marginLeft: '4px' }} />
    : <ArrowDownwardRounded sx={{ fontSize: 14, marginLeft: '4px' }} />;
}

export default function ProductsTab({ summary, products, lowStock, isLoading }) {
  const [sortField, setSortField] = useState('revenue');
  const [sortDir, setSortDir] = useState('desc');

  const topProducts = summary?.topProducts ?? [];
  const allProducts = Array.isArray(products) ? products : [];
  const lowStockCount = lowStock?.length || 0;

  // Merge topProducts (has revenue/qty) with allProducts (has stock/category)
  const merged = useMemo(() => {
    const revenueMap = {};
    topProducts.forEach((p) => {
      revenueMap[p.productName] = { revenue: p.totalRevenue || 0, unitsSold: p.totalQty || 0 };
    });
    return allProducts.map((p) => ({
      id: p.id,
      name: p.name || '',
      category: p.category?.name || p.category || '—',
      price: p.price || 0,
      stock: p.quantity ?? 0,
      active: p.active !== false,
      revenue: revenueMap[p.name]?.revenue || 0,
      unitsSold: revenueMap[p.name]?.unitsSold || 0,
      profit: (revenueMap[p.name]?.revenue || 0) * 0.3,
      margin: 30,
    }));
  }, [allProducts, topProducts]);

  const sorted = useMemo(() => {
    return [...merged].sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [merged, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  // Top 10 for bar chart
  const top10Chart = useMemo(
    () =>
      [...merged]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((p) => ({
          name: p.name.length > 16 ? p.name.substring(0, 16) + '…' : p.name,
          revenue: p.revenue,
          units: p.unitsSold,
        })),
    [merged]
  );

  // Category breakdown
  const categoryChart = useMemo(() => {
    const acc = {};
    merged.forEach((p) => {
      const cat = p.category;
      acc[cat] = (acc[cat] || 0) + p.revenue;
    });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [merged]);

  const catTotal = categoryChart.reduce((s, d) => s + d.value, 0);

  const exportData = sorted.map((p) => ({
    Product: p.name,
    Category: p.category,
    'Units Sold': p.unitsSold,
    Revenue: p.revenue,
    'Current Stock': p.stock,
    'Unit Price': p.price,
    'Profit Est.': p.profit.toFixed(0),
    'Margin %': p.margin,
    Status: p.stock === 0 ? 'Out of Stock' : p.stock < 5 ? 'Low Stock' : 'In Stock',
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton className="lg:col-span-3 h-72" />
          <Skeleton className="lg:col-span-2 h-72" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Products', value: allProducts.length, accent: 'border-l-4 border-l-blue-500' },
          { label: 'Active Products', value: allProducts.filter((p) => p.active !== false).length, accent: 'border-l-4 border-l-emerald-500' },
          { label: 'Low Stock', value: lowStockCount, accent: lowStockCount > 0 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500' },
        ].map((c) => (
          <div key={c.label} className={`bg-bg-secondary rounded-2xl border border-border-primary p-5 ${c.accent}`}>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">{c.label}</p>
            <p className="text-3xl font-bold text-text-primary mt-2">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Top 10 Horizontal Bar */}
        <div className="lg:col-span-3 bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <h3 className="font-bold text-text-primary mb-4">Top 10 Products by Revenue</h3>
          {top10Chart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-text-muted">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10Chart} layout="vertical" margin={{ left: 8, right: 24 }}>
                <defs>
                  <linearGradient id="gradProduct" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-brand-primary)" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [name === 'revenue' ? fmt(v) : `${v} units`, name === 'revenue' ? 'Revenue' : 'Units']}
                />
                <Bar dataKey="revenue" fill="url(#gradProduct)" radius={[0, 6, 6, 0]} name="revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Pie */}
        <div className="lg:col-span-2 bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <h3 className="font-bold text-text-primary mb-4">Revenue by Category</h3>
          {categoryChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-text-muted">No category data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryChart}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryChart.map((entry, index) => (
                    <Cell key={entry.name} fill={CAT_COLORS[index % CAT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [fmt(v), `${catTotal > 0 ? ((v / catTotal) * 100).toFixed(1) : 0}%`]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-text-primary">Product Performance</h3>
          <div className="flex gap-2">
            <button
              onClick={() => exportToCSV(exportData, 'product-performance')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-all"
            >
              <FileDownloadRounded sx={{ fontSize: 14 }} /> CSV
            </button>
            <button
              onClick={() => exportToExcel(exportData, 'product-performance', 'Products')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-all"
            >
              <FileDownloadRounded sx={{ fontSize: 14 }} /> Excel
            </button>
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className="text-text-muted text-center py-8">No products found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted border-b border-border-primary text-left text-xs uppercase tracking-wide">
                  {[
                    { label: '#' },
                    { label: 'Product', field: 'name' },
                    { label: 'Category', field: 'category' },
                    { label: 'Units Sold', field: 'unitsSold' },
                    { label: 'Revenue', field: 'revenue' },
                    { label: 'Stock', field: 'stock' },
                    { label: 'Profit Est.', field: 'profit' },
                    { label: 'Margin' },
                    { label: 'Status' },
                  ].map((col, i) => (
                    <th
                      key={i}
                      className={`pb-3 pr-4 ${col.field ? 'cursor-pointer hover:text-text-primary select-none' : ''}`}
                      onClick={() => col.field && handleSort(col.field)}
                    >
                      {col.label}
                      {col.field && <SortIcon field={col.field} sortField={sortField} sortDir={sortDir} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, idx) => {
                  const stockStatus = p.stock === 0
                    ? { label: 'Out of Stock', cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' }
                    : p.stock < 5
                    ? { label: 'Low Stock', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
                    : { label: 'In Stock', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border-primary last:border-0 hover:bg-bg-tertiary transition-colors"
                    >
                      <td className="py-3 pr-4 text-text-muted">{idx + 1}</td>
                      <td className="py-3 pr-4 font-medium text-text-primary max-w-[160px] truncate">{p.name}</td>
                      <td className="py-3 pr-4 text-text-secondary">{p.category}</td>
                      <td className="py-3 pr-4 font-mono">{p.unitsSold.toLocaleString()}</td>
                      <td className="py-3 pr-4 font-semibold">{fmt(p.revenue)}</td>
                      <td className="py-3 pr-4 font-mono">{p.stock}</td>
                      <td className="py-3 pr-4 text-text-secondary">{fmt(p.profit)}</td>
                      <td className="py-3 pr-4 text-text-muted">30%</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${stockStatus.cls}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
