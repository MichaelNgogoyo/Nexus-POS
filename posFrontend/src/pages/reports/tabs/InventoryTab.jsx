import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import ErrorRounded from '@mui/icons-material/ErrorRounded';
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

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-bg-tertiary rounded-xl ${className}`} />;
}

export default function InventoryTab({ products, lowStock, isLoading }) {
  const allProducts = Array.isArray(products) ? products : [];
  const lowStockList = Array.isArray(lowStock) ? lowStock : [];

  const outOfStock = lowStockList.filter((p) => (p.quantity ?? 0) === 0);
  const reorderNeeded = lowStockList.filter((p) => (p.quantity ?? 0) > 0 && (p.quantity ?? 0) < 5);

  const totalValue = useMemo(
    () => allProducts.reduce((s, p) => s + (p.price || 0) * (p.quantity || 0), 0),
    [allProducts]
  );

  const stockChart = useMemo(
    () =>
      [...allProducts]
        .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
        .slice(0, 15)
        .map((p) => ({
          name: (p.name || '').length > 14 ? p.name.substring(0, 14) + '…' : p.name || '',
          stock: p.quantity || 0,
        })),
    [allProducts]
  );

  const exportLowStock = lowStockList.map((p) => ({
    Product: p.name,
    Category: p.category?.name || p.category || '—',
    'Current Stock': p.quantity,
    'Unit Price': p.price,
    Status: (p.quantity ?? 0) === 0 ? 'Out of Stock' : 'Low Stock',
  }));

  const exportAll = allProducts.map((p) => ({
    Product: p.name,
    Category: p.category?.name || p.category || '—',
    Stock: p.quantity,
    'Unit Price': p.price,
    'Total Value': (p.price || 0) * (p.quantity || 0),
    Active: p.active !== false ? 'Yes' : 'No',
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {outOfStock.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-5 py-3">
          <ErrorRounded sx={{ color: '#ef4444', fontSize: 22 }} />
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            {outOfStock.length} product{outOfStock.length > 1 ? 's are' : ' is'} completely out of stock and hidden from cashiers.
          </p>
        </div>
      )}
      {lowStockList.length > 0 && outOfStock.length === 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-3">
          <WarningAmberRounded sx={{ color: '#f59e0b', fontSize: 22 }} />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            {lowStockList.length} product{lowStockList.length > 1 ? 's are' : ' is'} running low on stock.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total SKUs', value: allProducts.length, accent: 'border-l-4 border-l-blue-500' },
          { label: 'Low Stock', value: lowStockList.length, accent: lowStockList.length > 0 ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-green-500' },
          { label: 'Out of Stock', value: outOfStock.length, accent: outOfStock.length > 0 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500' },
          { label: 'Inventory Value', value: fmt(totalValue), accent: 'border-l-4 border-l-emerald-500', small: true },
          { label: 'Reorder Needed', value: reorderNeeded.length, accent: 'border-l-4 border-l-violet-500' },
        ].map((c) => (
          <div key={c.label} className={`bg-bg-secondary rounded-2xl border border-border-primary p-4 ${c.accent}`}>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">{c.label}</p>
            <p className={`font-bold text-text-primary mt-1 ${c.small ? 'text-base' : 'text-2xl'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Stock Distribution Chart */}
      {stockChart.length > 0 && (
        <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <h3 className="font-bold text-text-primary mb-4">Stock Levels — Top 15 Products</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stockChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                angle={-35}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} units`, 'Stock']} />
              <Bar dataKey="stock" fill="var(--color-brand-primary)" radius={[3, 3, 0, 0]} name="Stock" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Low Stock Table */}
      {lowStockList.length > 0 && (
        <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <WarningAmberRounded sx={{ color: '#f59e0b', fontSize: 18 }} />
              Low Stock Products
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => exportToCSV(exportLowStock, 'low-stock')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-all"
              >
                <FileDownloadRounded sx={{ fontSize: 14 }} /> CSV
              </button>
              <button
                onClick={() => exportToExcel(exportLowStock, 'low-stock', 'LowStock')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-all"
              >
                <FileDownloadRounded sx={{ fontSize: 14 }} /> Excel
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted border-b border-border-primary text-left text-xs uppercase tracking-wide">
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Current Stock</th>
                  <th className="pb-3 pr-4">Reorder Qty</th>
                  <th className="pb-3 pr-4">Unit Price</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockList.map((p) => {
                  const outOf = (p.quantity ?? 0) === 0;
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border-primary last:border-0 transition-colors ${
                        outOf
                          ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      }`}
                    >
                      <td className="py-3 pr-4 font-medium text-text-primary">{p.name}</td>
                      <td className="py-3 pr-4 text-text-secondary">
                        {p.category?.name || p.category || '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`font-bold ${outOf ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {p.quantity ?? 0}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-text-muted">
                        {outOf ? 50 : Math.max(20, (p.quantity ?? 0) * 5)}
                      </td>
                      <td className="py-3 pr-4">{fmt(p.price)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          outOf
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {outOf ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Inventory Table */}
      {allProducts.length > 0 && (
        <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text-primary">Full Inventory</h3>
            <div className="flex gap-2">
              <button
                onClick={() => exportToCSV(exportAll, 'full-inventory')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-all"
              >
                <FileDownloadRounded sx={{ fontSize: 14 }} /> CSV
              </button>
              <button
                onClick={() => exportToExcel(exportAll, 'full-inventory', 'Inventory')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-all"
              >
                <FileDownloadRounded sx={{ fontSize: 14 }} /> Excel
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted border-b border-border-primary text-left text-xs uppercase tracking-wide">
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Stock</th>
                  <th className="pb-3 pr-4">Unit Price</th>
                  <th className="pb-3 pr-4">Total Value</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {allProducts.map((p) => {
                  const qty = p.quantity ?? 0;
                  const stockStatus = qty === 0
                    ? { label: 'Out of Stock', cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' }
                    : qty < 5
                    ? { label: 'Low Stock', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
                    : { label: 'In Stock', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border-primary last:border-0 hover:bg-bg-tertiary transition-colors"
                    >
                      <td className="py-2.5 pr-4 font-medium text-text-primary max-w-[180px] truncate">{p.name}</td>
                      <td className="py-2.5 pr-4 text-text-secondary">{p.category?.name || p.category || '—'}</td>
                      <td className="py-2.5 pr-4 font-mono">{qty}</td>
                      <td className="py-2.5 pr-4">{fmt(p.price)}</td>
                      <td className="py-2.5 pr-4 font-semibold">{fmt((p.price || 0) * qty)}</td>
                      <td className="py-2.5">
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
        </div>
      )}
    </div>
  );
}
