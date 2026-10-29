import { NavLink, Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar.jsx';
import { ROUTES } from '../routes.js';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { usePermissions } from '../auth/permissions.js';

function SectionLabel({ label }) {
  return (
    <p className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
      {label}
    </p>
  );
}

function SideLink({ to, icon, children, iconClass = 'text-brand-primary' }) {
  const IconComponent = icon;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-link ${isActive ? 'active' : ''}`
      }
    >
      <IconComponent className={iconClass} sx={{ fontSize: 22 }} />
      <span className="font-medium">{children}</span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const { can } = usePermissions();
  const showCatalog = can('view_products') || can('view_inventory') || can('manage_categories');
  const showFinance = can('view_finance') || can('view_procurement');

  return (
    <div className="admin-layout min-h-screen bg-bg-primary">
      <NavBar />
      <div className="admin-layout-body flex pt-16">
        <aside className="admin-sidebar fixed left-0 w-64 h-[calc(100vh-4rem)] bg-bg-secondary border-r border-border-primary shadow-sm flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-border-primary">
            <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
              <DashboardRoundedIcon sx={{ fontSize: 28 }} />
              Admin Panel
            </h2>
            <p className="text-xs text-text-muted mt-1">Manage your business</p>
          </div>

          <nav className="flex flex-col flex-grow p-4">
            <div className="flex flex-col space-y-1 flex-grow">
              {can('view_dashboard') && <SideLink to={ROUTES.DASHBOARD} icon={DashboardRoundedIcon}>Dashboard</SideLink>}

              {showCatalog && <SectionLabel label="Catalogue" />}
              {can('view_products') && <SideLink to={ROUTES.PRODUCTS} icon={InventoryRoundedIcon}>Products</SideLink>}
              {can('view_inventory') && <SideLink to={ROUTES.INVENTORY} icon={WarehouseRoundedIcon} iconClass="text-accent-success">Inventory</SideLink>}
              {can('manage_categories') && <SideLink to={ROUTES.CATEGORIES} icon={AssessmentRoundedIcon} iconClass="text-accent-warning">Categories</SideLink>}

              {showFinance && <SectionLabel label="Finance" />}
              {can('view_finance') && <SideLink to={ROUTES.FINANCE_EXPENSES} icon={AttachMoneyRoundedIcon} iconClass="text-red-400">Expenses</SideLink>}
              {can('view_procurement') && <SideLink to={ROUTES.FINANCE_PURCHASES} icon={ShoppingCartRoundedIcon} iconClass="text-blue-400">Purchases</SideLink>}
              {can('view_suppliers') && <SideLink to={ROUTES.FINANCE_SUPPLIERS} icon={LocalShippingRoundedIcon} iconClass="text-violet-400">Suppliers</SideLink>}

              {can('manage_users') && <SectionLabel label="People" />}
              {can('manage_users') && <SideLink to={ROUTES.USERS} icon={PeopleAltRoundedIcon} iconClass="text-accent-warning">Users</SideLink>}

              {can('view_audit') && <SectionLabel label="Admin" />}
              {can('view_audit') && <SideLink to={ROUTES.ADMIN_AUDIT} icon={HistoryRoundedIcon} iconClass="text-text-muted">Audit Log</SideLink>}
            </div>

            {can('manage_settings') && <div className="mt-auto pt-4 border-t border-border-primary space-y-1">
              <SideLink to={ROUTES.SETTINGS} icon={SettingsRoundedIcon} iconClass="text-text-muted">Settings</SideLink>
            </div>}
          </nav>
        </aside>

        <main className="admin-content flex-grow ml-64 p-6 bg-bg-primary min-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
