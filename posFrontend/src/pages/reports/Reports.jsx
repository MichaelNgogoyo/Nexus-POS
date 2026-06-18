import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getDashboardSummary,
  getLowStockProducts,
  getAllProducts,
  getAllSales,
} from '../../services/api.js';

import OverviewTab from './tabs/OverviewTab.jsx';
import SalesTab from './tabs/SalesTab.jsx';
import ProductsTab from './tabs/ProductsTab.jsx';
import PaymentsTab from './tabs/PaymentsTab.jsx';
import InventoryTab from './tabs/InventoryTab.jsx';
import InsightsTab from './tabs/InsightsTab.jsx';

import { exportToCSV, exportToExcel } from './utils/exportUtils.js';

import InsightsRounded from '@mui/icons-material/InsightsRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import PointOfSaleRounded from '@mui/icons-material/PointOfSaleRounded';
import CategoryRounded from '@mui/icons-material/CategoryRounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import InventoryRounded from '@mui/icons-material/InventoryRounded';
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import SyncRounded from '@mui/icons-material/SyncRounded';

const TABS = [
  { id: 'overview', label: 'Overview', icon: <DashboardRounded sx={{ fontSize: 18 }} /> },
  { id: 'sales', label: 'Sales', icon: <PointOfSaleRounded sx={{ fontSize: 18 }} /> },
  { id: 'products', label: 'Products', icon: <CategoryRounded sx={{ fontSize: 18 }} /> },
  { id: 'payments', label: 'Payments', icon: <PaymentsRounded sx={{ fontSize: 18 }} /> },
  { id: 'inventory', label: 'Inventory', icon: <InventoryRounded sx={{ fontSize: 18 }} /> },
  { id: 'insights', label: 'Insights', icon: <InsightsRounded sx={{ fontSize: 18 }} /> },
];

const DATE_RANGES = [
  { label: 'Today', value: '1D' },
  { label: '7D', value: '7D' },
  { label: '30D', value: '30D' },
  { label: '90D', value: '90D' },
  { label: 'Year', value: '1Y' },
];

function Reports() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30D');
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: lowStock, isLoading: loadingLowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: getLowStockProducts,
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: productsRaw, isLoading: loadingProducts } = useQuery({
    queryKey: ['all-products'],
    queryFn: getAllProducts,
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: salesRaw, isLoading: loadingSales } = useQuery({
    queryKey: ['all-sales-report'],
    queryFn: () => getAllSales(0, 100),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  });

  // salesRaw may be a Spring Page (with .content) or a plain array
  const products = Array.isArray(productsRaw) ? productsRaw : [];
  const sales = Array.isArray(salesRaw) ? salesRaw : (salesRaw?.content ?? []);

  const isLoading = loadingSummary || loadingLowStock || loadingProducts || loadingSales;

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleExport = (type) => {
    setExportOpen(false);
    const summaryExport = summary?.dailyStats?.map((d) => ({
      Date: d.day,
      Revenue: d.revenue,
      Orders: d.salesCount,
    })) ?? [];

    if (type === 'csv') exportToCSV(summaryExport, 'bi-report-summary');
    else if (type === 'excel') exportToExcel(summaryExport, 'bi-report-summary', 'Summary');
  };

  const sharedProps = {
    summary,
    products,
    sales,
    lowStock: lowStock ?? [],
    dateRange,
    isLoading,
  };

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-bg-primary border-b border-border-primary px-6 pt-5 pb-0">
        {/* Title Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <InsightsRounded sx={{ fontSize: 28, color: 'var(--color-brand-primary)' }} />
            <div>
              <h1 className="text-xl font-bold text-text-primary leading-tight">Business Intelligence</h1>
              <p className="text-xs text-text-muted">Real-time analytics & insights</p>
            </div>
            {isLoading && (
              <SyncRounded
                sx={{ fontSize: 18, color: 'var(--color-text-muted)' }}
                className="animate-spin"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Date Range */}
            <div className="flex items-center gap-1 bg-bg-secondary rounded-xl border border-border-primary p-1">
              {DATE_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setDateRange(r.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    dateRange === r.value
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-secondary hover:bg-bg-tertiary'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Export Dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary border border-border-primary text-text-secondary text-sm rounded-xl hover:bg-bg-tertiary transition-all"
              >
                <FileDownloadRounded sx={{ fontSize: 16 }} />
                Export
                <KeyboardArrowDownRounded sx={{ fontSize: 16 }} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-bg-secondary border border-border-primary rounded-xl shadow-lg overflow-hidden z-30">
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                  >
                    📊 Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                  >
                    📄 CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? 'border-b-brand-primary text-brand-primary bg-bg-secondary'
                  : 'border-b-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {activeTab === 'overview' && (
          <OverviewTab {...sharedProps} />
        )}
        {activeTab === 'sales' && (
          <SalesTab {...sharedProps} />
        )}
        {activeTab === 'products' && (
          <ProductsTab {...sharedProps} />
        )}
        {activeTab === 'payments' && (
          <PaymentsTab {...sharedProps} />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab {...sharedProps} />
        )}
        {activeTab === 'insights' && (
          <InsightsTab {...sharedProps} />
        )}
      </div>
    </div>
  );
}

export default Reports;
