import { useMemo } from 'react';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';

const iconMap = {
  check: CheckCircleRoundedIcon,
  warning: WarningRoundedIcon,
  person: PersonAddRoundedIcon,
  inventory: InventoryRoundedIcon,
  time: AccessTimeRoundedIcon,
};

export default function ActivityFeed({ recentSales }) {
  const activities = useMemo(() => {
    const feed = [];
    (recentSales ?? []).slice(0, 5).forEach(s => {
      feed.push({
        id: `sale-${s.id}`,
        icon: 'check',
        color: 'text-emerald-500 bg-emerald-500/10',
        title: `Order #${String(s.id).padStart(4, '0')} completed`,
        sub: `KSh ${Number(s.totalAmount ?? 0).toLocaleString()} · ${s.paymentMethod ?? ''}`,
        time: s.createdAt
          ? new Date(s.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
          : 'Recently',
      });
    });
    feed.push({
      id: 'shift',
      icon: 'time',
      color: 'text-blue-500 bg-blue-500/10',
      title: 'Shift activity tracked',
      sub: 'System monitoring active',
      time: 'Today',
    });
    return feed.slice(0, 8);
  }, [recentSales]);

  return (
    <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
      <h3 className="text-sm font-black text-text-primary uppercase tracking-wider mb-4">Activity Feed</h3>
      <div className="space-y-3">
        {activities.map(a => {
          const Icon = iconMap[a.icon] ?? CheckCircleRoundedIcon;
          return (
            <div key={a.id} className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg shrink-0 ${a.color}`}>
                <Icon sx={{ fontSize: 14 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">{a.title}</p>
                <p className="text-[10px] text-text-muted">{a.sub}</p>
              </div>
              <span className="text-[10px] text-text-muted shrink-0">{a.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
