import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLowStockProducts } from '../services/api.js';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: lowStock = [] } = useQuery({
    queryKey: ['low-stock-notif'],
    queryFn: () => getLowStockProducts().then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const lowStockNotifs = lowStock.slice(0, 3).map(p => ({
    id: `stock-${p.id}`,
    type: 'warning',
    icon: 'inventory',
    title: 'Low Stock Alert',
    body: `${p.name} has only ${p.quantity} units left`,
    time: 'Just now',
  }));

  const notifications = [
    ...lowStockNotifs,
    {
      id: 'shift-reminder',
      type: 'info',
      icon: 'time',
      title: 'Shift Reminder',
      body: 'Remember to close your shift at end of day',
      time: '1h ago',
    },
  ];

  const totalCount = lowStock.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
        aria-label="Notifications"
      >
        <NotificationsRoundedIcon sx={{ fontSize: 20 }} />
        {totalCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] text-white font-black flex items-center justify-center px-0.5">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-border-primary rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-primary flex items-center justify-between">
              <p className="font-bold text-text-primary text-sm">Notifications</p>
              {totalCount > 0 && (
                <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">
                  {totalCount} new
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border-primary">
              {notifications.map(n => (
                <div key={n.id} className="px-4 py-3 hover:bg-bg-tertiary transition-colors">
                  <div className="flex gap-3 items-start">
                    <div className={`p-1.5 rounded-lg mt-0.5 ${n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {n.icon === 'inventory'
                        ? <InventoryRoundedIcon sx={{ fontSize: 14 }} />
                        : <AccessTimeRoundedIcon sx={{ fontSize: 14 }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary">{n.title}</p>
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                    <span className="text-[10px] text-text-muted shrink-0 mt-0.5">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
            {notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-text-muted text-sm">
                <NotificationsRoundedIcon sx={{ fontSize: 32 }} className="mx-auto mb-2 opacity-30" />
                <p>No new notifications</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
