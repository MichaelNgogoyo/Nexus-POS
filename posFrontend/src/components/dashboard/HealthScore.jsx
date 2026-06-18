import { useMemo } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

export default function HealthScore({ summary, lowStock, products }) {
  const score = useMemo(() => {
    let s = 50;

    const daily = summary?.dailyStats ?? [];
    if (daily.length >= 7) {
      const lastWeek = daily.slice(-7).reduce((a, d) => a + (d.revenue ?? 0), 0);
      const prevWeek = daily.slice(-14, -7).reduce((a, d) => a + (d.revenue ?? 0), 0);
      if (prevWeek > 0) {
        const growth = (lastWeek - prevWeek) / prevWeek;
        s += Math.min(20, Math.max(-20, growth * 50));
      } else if (lastWeek > 0) s += 10;
    }

    const totalProds = products?.length ?? 0;
    const lowCount = lowStock?.length ?? 0;
    if (totalProds > 0) {
      s += (1 - lowCount / totalProds) * 20;
    } else s += 10;

    if ((summary?.todaySalesCount ?? 0) > 0) s += Math.min(10, summary.todaySalesCount);

    return Math.round(Math.min(100, Math.max(0, s)));
  }, [summary, lowStock, products]);

  const getColor = (s) => s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';
  const getLabel = (s) => s >= 75 ? 'Excellent' : s >= 50 ? 'Good' : 'Needs Attention';

  const color = getColor(score);
  const data = [{ name: 'score', value: score, fill: color }];

  return (
    <div className="bg-bg-secondary rounded-2xl border border-border-primary p-6 flex items-center gap-6">
      <div className="relative w-28 h-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
            data={data} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'var(--color-bg-tertiary, #1a1a2e)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{score}</span>
          <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">/ 100</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="text-lg font-black text-text-primary">Business Health Score</h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: color + '20', color }}>
            {getLabel(score)}
          </span>
        </div>
        <p className="text-sm text-text-muted mb-3">Calculated from revenue growth, inventory health, and order velocity</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Revenue',
              value: score >= 60 ? '↑ Good' : '↓ Low',
              ok: score >= 60,
            },
            {
              label: 'Inventory',
              value: (lowStock?.length ?? 0) === 0 ? '✓ Healthy' : `⚠ ${lowStock?.length} low`,
              ok: (lowStock?.length ?? 0) === 0,
            },
            {
              label: 'Sales',
              value: (summary?.todaySalesCount ?? 0) > 0 ? '✓ Active' : '— Quiet',
              ok: (summary?.todaySalesCount ?? 0) > 0,
            },
          ].map(m => (
            <div key={m.label} className="bg-bg-tertiary rounded-xl px-3 py-2">
              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">{m.label}</p>
              <p className={`text-xs font-bold mt-0.5 ${m.ok ? 'text-emerald-500' : 'text-amber-500'}`}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
