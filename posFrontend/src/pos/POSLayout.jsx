import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '../routes.js';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import BookOnlineRoundedIcon from '@mui/icons-material/BookOnlineRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';

function SideLink({ to, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-brand-primary/10 text-brand-primary'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
        }`
      }
    >
      <Icon sx={{ fontSize: 20 }} />
      <span>{children}</span>
    </NavLink>
  );
}

export default function POSLayout() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 w-16 h-full bg-[#111] border-r border-white/5 flex flex-col items-center py-4 gap-2 z-50">
        <div className="mb-4">
          <StorefrontRoundedIcon sx={{ fontSize: 28 }} className="text-brand-primary" />
        </div>
        {[
          { to: ROUTES.DASHBOARD, Icon: DashboardRoundedIcon, label: 'Dashboard' },
          { to: ROUTES.CHECKOUT, Icon: PointOfSaleRoundedIcon, label: 'Checkout' },
          { to: ROUTES.TRANSACTIONS, Icon: ReceiptLongRoundedIcon, label: 'Transactions' },
          { to: ROUTES.REPORTS, Icon: AssessmentRoundedIcon, label: 'Reports' },
          { to: ROUTES.POS_RESERVATIONS, Icon: BookOnlineRoundedIcon, label: 'Reservations' },
        ].map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `p-2.5 rounded-xl transition-all ${isActive ? 'bg-brand-primary/20 text-brand-primary' : 'text-white/40 hover:text-white hover:bg-white/5'}`
            }
          >
            <Icon sx={{ fontSize: 22 }} />
          </NavLink>
        ))}
      </aside>

      <main className="flex-1 ml-16 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
