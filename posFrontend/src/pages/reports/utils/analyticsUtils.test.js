import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyticsExportRows, formatCurrency, formatPercent } from './analyticsUtils.js';

test('analytics CSV rows are derived from the selected period response', () => {
  const rows = buildAnalyticsExportRows({
    sales: { revenue: 1200, orderCount: 4 },
    daily: [{ day: '2026-11-01', revenue: 1200, orders: 4 }],
    products: [{ product: 'Pilau', category: 'Main', revenue: 1200, unitsSold: 4, estimatedMarginPercent: 35 }],
  });
  assert.equal(rows.find((row) => row.Name === 'Revenue').Value, 1200);
  assert.equal(rows.find((row) => row.Name === '2026-11-01').Count, 4);
  assert.equal(rows.find((row) => row.Section === 'Product estimated gross profit').Count, 35);
  assert.deepEqual(buildAnalyticsExportRows(null), []);
});

test('missing values are rendered as unavailable, not as fabricated zero values', () => {
  assert.equal(formatCurrency(null), '—');
  assert.equal(formatPercent(null), '—');
  assert.match(formatCurrency(1250), /^KSh/);
  assert.equal(formatPercent(12.34), '12.3%');
});
