import { useMemo } from 'react';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import PhoneAndroidRounded from '@mui/icons-material/PhoneAndroidRounded';
import LightbulbRounded from '@mui/icons-material/LightbulbRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import InfoRounded from '@mui/icons-material/InfoRounded';
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded';
import InventoryRounded from '@mui/icons-material/InventoryRounded';

const fmt = (v) =>
  `KSh ${Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ICON_MAP = {
  TrendingUp: <TrendingUpRounded sx={{ fontSize: 28 }} />,
  TrendingDown: <TrendingDownRounded sx={{ fontSize: 28 }} />,
  Star: <StarRounded sx={{ fontSize: 28 }} />,
  Warning: <WarningAmberRounded sx={{ fontSize: 28 }} />,
  ErrorOutline: <ErrorOutlineRounded sx={{ fontSize: 28 }} />,
  PhoneAndroid: <PhoneAndroidRounded sx={{ fontSize: 28 }} />,
  Lightbulb: <LightbulbRounded sx={{ fontSize: 28 }} />,
  CheckCircle: <CheckCircleRounded sx={{ fontSize: 28 }} />,
  Info: <InfoRounded sx={{ fontSize: 28 }} />,
  ShoppingCart: <ShoppingCartRounded sx={{ fontSize: 28 }} />,
  Inventory: <InventoryRounded sx={{ fontSize: 28 }} />,
};

const CARD_STYLES = {
  positive: {
    border: 'border-l-4 border-l-emerald-500',
    icon: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    metric: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  negative: {
    border: 'border-l-4 border-l-red-500',
    icon: 'text-red-500',
    badge: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    metric: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  warning: {
    border: 'border-l-4 border-l-amber-500',
    icon: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    metric: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  info: {
    border: 'border-l-4 border-l-blue-500',
    icon: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    metric: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  tip: {
    border: 'border-l-4 border-l-violet-500',
    icon: 'text-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    metric: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
};

function generateInsights(summary, lowStock) {
  const insights = [];

  if (summary?.dailyStats?.length >= 2) {
    const last = summary.dailyStats[summary.dailyStats.length - 1];
    const prev = summary.dailyStats[summary.dailyStats.length - 2];
    const change = prev.revenue > 0 ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : 0;
    if (Math.abs(change) > 5) {
      insights.push({
        type: change > 0 ? 'positive' : 'negative',
        icon: change > 0 ? 'TrendingUp' : 'TrendingDown',
        title: `Daily Revenue ${change > 0 ? 'Up' : 'Down'}`,
        body: `Revenue ${change > 0 ? 'increased' : 'decreased'} ${Math.abs(change).toFixed(1)}% compared to yesterday. ${change > 0 ? 'Great momentum!' : 'Consider a promotion today.'}`,
        metric: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
        category: 'Revenue',
      });
    }
  }

  if (summary?.topProducts?.length > 0) {
    const top = summary.topProducts[0];
    insights.push({
      type: 'info',
      icon: 'Star',
      title: 'Best Seller',
      body: `${top.productName} is your top-selling item with ${top.totalQty} units sold and ${fmt(top.totalRevenue)} in revenue.`,
      metric: `${top.totalQty} units`,
      category: 'Products',
    });
  }

  if (summary?.topProducts?.length >= 3) {
    const bottom = summary.topProducts[summary.topProducts.length - 1];
    if (bottom.totalQty < 5) {
      insights.push({
        type: 'tip',
        icon: 'Lightbulb',
        title: 'Slow-Moving Product',
        body: `${bottom.productName} has only sold ${bottom.totalQty} units. Consider bundling it with popular items or running a promotion.`,
        metric: `${bottom.totalQty} units`,
        category: 'Products',
      });
    }
  }

  if (lowStock?.length > 0) {
    insights.push({
      type: 'warning',
      icon: 'Warning',
      title: 'Stock Alert',
      body: `${lowStock.length} product${lowStock.length > 1 ? 's are' : ' is'} running low on stock and need reordering soon to avoid lost sales.`,
      metric: `${lowStock.length} items`,
      category: 'Inventory',
    });

    const outOfStock = lowStock.filter((p) => (p.quantity ?? 0) === 0);
    if (outOfStock.length > 0) {
      insights.push({
        type: 'negative',
        icon: 'ErrorOutline',
        title: 'Out of Stock',
        body: `${outOfStock.length} product${outOfStock.length > 1 ? 's are' : ' is'} completely out of stock and not visible to cashiers — causing potential revenue loss.`,
        metric: `${outOfStock.length} products`,
        category: 'Inventory',
      });
    }
  }

  if (summary?.recentSales?.length > 0) {
    const mpesa = summary.recentSales.filter((s) => s.paymentMethod === 'MPESA').length;
    const total = summary.recentSales.length;
    const pct = Math.round((mpesa / total) * 100);
    if (pct > 40) {
      insights.push({
        type: 'info',
        icon: 'PhoneAndroid',
        title: 'M-Pesa Dominant',
        body: `${pct}% of your recent transactions are via M-Pesa. Consider promoting card payments for faster checkout at busy periods.`,
        metric: `${pct}% M-Pesa`,
        category: 'Payments',
      });
    }

    const cash = summary.recentSales.filter((s) => s.paymentMethod === 'CASH').length;
    const cashPct = Math.round((cash / total) * 100);
    if (cashPct > 60) {
      insights.push({
        type: 'tip',
        icon: 'Info',
        title: 'High Cash Usage',
        body: `${cashPct}% of transactions are cash-based. Encouraging digital payments can reduce reconciliation time and errors.`,
        metric: `${cashPct}% cash`,
        category: 'Payments',
      });
    }
  }

  insights.push({
    type: 'tip',
    icon: 'Lightbulb',
    title: 'Peak Hours Opportunity',
    body: 'Lunch hours (12pm–2pm) and dinner hours (7pm–9pm) are typically peak periods. Ensure adequate staffing and stock during these times.',
    metric: 'Operational',
    category: 'Operations',
  });

  if (summary?.todayRevenue > 0) {
    insights.push({
      type: 'positive',
      icon: 'CheckCircle',
      title: 'Active Business Day',
      body: `Today's revenue is ${fmt(summary.todayRevenue)} from ${summary.todaySalesCount} sales. ${
        summary.todaySalesCount > 10 ? 'Excellent activity!' : 'Good start — keep it going!'
      }`,
      metric: fmt(summary.todayRevenue),
      category: 'Revenue',
    });
  }

  if (summary?.totalSalesCount > 0) {
    const avg = (summary.totalRevenue || 0) / summary.totalSalesCount;
    if (avg > 0) {
      insights.push({
        type: 'info',
        icon: 'ShoppingCart',
        title: 'Average Order Value',
        body: `Your average transaction is ${fmt(avg)}. Upselling premium items or bundles could push this higher and improve margins.`,
        metric: fmt(avg),
        category: 'Revenue',
      });
    }
  }

  return insights;
}

function InsightCard({ insight }) {
  const styles = CARD_STYLES[insight.type] || CARD_STYLES.info;
  const icon = ICON_MAP[insight.icon] || ICON_MAP.Info;

  return (
    <div
      className={`bg-bg-secondary rounded-2xl border border-border-primary p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${styles.border}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`${styles.icon}`}>{icon}</div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
          {insight.category}
        </span>
      </div>
      <h4 className="font-bold text-text-primary mb-1.5">{insight.title}</h4>
      <p className="text-sm text-text-secondary leading-relaxed mb-3">{insight.body}</p>
      <div className="flex items-center justify-start">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles.metric}`}>
          {insight.metric}
        </span>
      </div>
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-bg-tertiary rounded-xl ${className}`} />;
}

export default function InsightsTab({ summary, products, lowStock, isLoading }) {
  const insights = useMemo(
    () => generateInsights(summary, lowStock),
    [summary, lowStock]
  );

  const allProducts = Array.isArray(products) ? products : [];

  const perfMetrics = useMemo(() => {
    const totalValue = allProducts.reduce((s, p) => s + (p.price || 0) * (p.quantity || 0), 0);
    const avgOrder = summary?.totalSalesCount > 0
      ? (summary?.totalRevenue || 0) / summary.totalSalesCount
      : 0;
    const topProduct = summary?.topProducts?.[0];
    const completionRate = summary?.recentSales?.length > 0
      ? (summary.recentSales.filter((s) => s.status === 'COMPLETED').length / summary.recentSales.length) * 100
      : 100;
    return { totalValue, avgOrder, topProduct, completionRate };
  }, [summary, allProducts]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
        <h2 className="text-xl font-bold text-text-primary mb-1">Business Intelligence Insights</h2>
        <p className="text-sm text-text-secondary">
          Smart insights derived from your real sales, inventory, and payment data. Updated live.
        </p>
      </div>

      {/* Insight Cards */}
      {insights.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <LightbulbRounded sx={{ fontSize: 48, opacity: 0.4 }} />
          <p className="mt-3">No insights available yet. Make some sales first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )}

      {/* Performance Summary */}
      <div>
        <h3 className="font-bold text-text-primary mb-4">Performance Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-bg-secondary rounded-2xl border border-border-primary p-4 border-l-4 border-l-emerald-500">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Avg Order Value</p>
            <p className="text-xl font-bold text-text-primary mt-1">{fmt(perfMetrics.avgOrder)}</p>
            <p className="text-xs text-text-muted mt-0.5">Per transaction</p>
          </div>
          <div className="bg-bg-secondary rounded-2xl border border-border-primary p-4 border-l-4 border-l-blue-500">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Inventory Value</p>
            <p className="text-base font-bold text-text-primary mt-1">{fmt(perfMetrics.totalValue)}</p>
            <p className="text-xs text-text-muted mt-0.5">Total stock value</p>
          </div>
          <div className="bg-bg-secondary rounded-2xl border border-border-primary p-4 border-l-4 border-l-violet-500">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Completion Rate</p>
            <p className="text-xl font-bold text-text-primary mt-1">{perfMetrics.completionRate.toFixed(0)}%</p>
            <p className="text-xs text-text-muted mt-0.5">Successful orders</p>
          </div>
          <div className="bg-bg-secondary rounded-2xl border border-border-primary p-4 border-l-4 border-l-amber-500">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Top Product</p>
            <p className="text-sm font-bold text-text-primary mt-1 truncate">
              {perfMetrics.topProduct?.productName || '—'}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {perfMetrics.topProduct ? `${perfMetrics.topProduct.totalQty} units sold` : 'No data'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
