import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.js';
import { useKeycloak } from '@react-keycloak/web';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import TableRestaurantRoundedIcon from '@mui/icons-material/TableRestaurantRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import KitchenRoundedIcon from '@mui/icons-material/KitchenRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';

const NAV_ITEMS = [
    { label: 'Checkout', icon: <PointOfSaleRoundedIcon sx={{ fontSize: 28 }} />, to: ROUTES.POS_CHECKOUT },
    { label: 'Tables',   icon: <TableRestaurantRoundedIcon sx={{ fontSize: 28 }} />, to: ROUTES.POS_TABLES },
    { label: 'Orders',   icon: <ReceiptLongRoundedIcon sx={{ fontSize: 28 }} />, to: ROUTES.POS_ORDERS },
    { label: 'Kitchen',  icon: <KitchenRoundedIcon sx={{ fontSize: 28 }} />, to: ROUTES.POS_KITCHEN },
    { label: 'Customers',icon: <PeopleAltRoundedIcon sx={{ fontSize: 28 }} />, to: ROUTES.POS_CUSTOMERS },
    { label: 'Shift',    icon: <AccessTimeRoundedIcon sx={{ fontSize: 28 }} />, to: ROUTES.POS_SHIFT },
];

export default function POSLayout() {
    const navigate = useNavigate();
    const { keycloak } = useKeycloak();

    const username = keycloak?.tokenParsed?.preferred_username
        ?? keycloak?.tokenParsed?.name
        ?? 'Cashier';
    const initials = username.slice(0, 2).toUpperCase();

    return (
        <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
            {/* ── Sidebar ── */}
            <aside className="flex flex-col w-20 lg:w-56 h-full bg-[#111111] border-r border-white/5 flex-shrink-0">

                {/* Brand / Logo */}
                <div className="flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-5 h-16 border-b border-white/5">
                    <div className="relative flex-shrink-0">
                        <StorefrontRoundedIcon sx={{ fontSize: 28 }} className="text-brand-primary" />
                        {/* Active shift indicator dot */}
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#111111]" />
                    </div>
                    <span className="hidden lg:block text-white font-bold text-base tracking-tight leading-tight">
                        POS<br />
                        <span className="text-gray-500 font-normal text-[11px] tracking-widest uppercase">Station</span>
                    </span>
                </div>

                {/* Nav Items */}
                <nav className="flex flex-col gap-1 flex-1 p-2 lg:p-3 overflow-y-auto">
                    {NAV_ITEMS.map(({ label, icon, to }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex flex-col lg:flex-row items-center lg:items-center justify-center lg:justify-start gap-1 lg:gap-3 h-16 w-full px-2 lg:px-3 transition-all duration-150 ${
                                    isActive
                                        ? 'bg-brand-primary text-white rounded-2xl shadow-lg'
                                        : 'text-gray-400 hover:text-white hover:bg-white/10 rounded-2xl'
                                }`
                            }
                        >
                            {icon}
                            <span className="text-[10px] lg:text-sm font-medium leading-none">{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom: Admin switch + user */}
                <div className="p-2 lg:p-3 border-t border-white/5 space-y-2">
                    <button
                        onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
                        className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 h-14 w-full px-2 lg:px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-150"
                        title="Switch to Admin"
                    >
                        <DashboardRoundedIcon sx={{ fontSize: 22 }} />
                        <span className="text-[10px] lg:text-sm font-medium">Admin</span>
                    </button>

                    {/* User avatar */}
                    <div className="flex items-center justify-center lg:justify-start gap-3 px-1 lg:px-2 py-2">
                        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {initials}
                        </div>
                        <span className="hidden lg:block text-gray-400 text-xs truncate">{username}</span>
                    </div>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
}
