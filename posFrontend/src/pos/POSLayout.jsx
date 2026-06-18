import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '../routes.js';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import TableRestaurantRoundedIcon from '@mui/icons-material/TableRestaurantRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LocalDiningRoundedIcon from '@mui/icons-material/LocalDiningRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import BookOnlineRoundedIcon from '@mui/icons-material/BookOnlineRounded';
import AccessAlarmRoundedIcon from '@mui/icons-material/AccessAlarmRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';

const NAV_ITEMS = [
    { to: ROUTES.POS_CHECKOUT,     Icon: PointOfSaleRoundedIcon,      label: 'Checkout' },
    { to: ROUTES.POS_TABLES,       Icon: TableRestaurantRoundedIcon,   label: 'Tables' },
    { to: ROUTES.POS_KITCHEN,      Icon: LocalDiningRoundedIcon,       label: 'Kitchen' },
    { to: ROUTES.POS_ORDERS,       Icon: ReceiptLongRoundedIcon,       label: 'Orders' },
    { to: ROUTES.POS_CUSTOMERS,    Icon: GroupsRoundedIcon,            label: 'Customers' },
    { to: ROUTES.POS_RESERVATIONS, Icon: BookOnlineRoundedIcon,        label: 'Reservations' },
    { to: ROUTES.POS_SHIFT,        Icon: AccessAlarmRoundedIcon,       label: 'Shift' },
];

export default function POSLayout() {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a]">

            {/* ── Icon sidebar ── */}
            <aside className="flex-shrink-0 w-[60px] h-full bg-[#0d0d0d] border-r border-white/5 flex flex-col items-center py-4 gap-1 z-50">
                {/* Logo */}
                <div className="mb-4 p-1">
                    <StorefrontRoundedIcon sx={{ fontSize: 26 }} className="text-violet-400" />
                </div>

                {/* Nav links */}
                <div className="flex-1 flex flex-col items-center gap-1 w-full px-1.5">
                    {NAV_ITEMS.map(({ to, Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            title={label}
                            className={({ isActive }) =>
                                `w-full flex items-center justify-center p-3 rounded-xl transition-all ${
                                    isActive
                                        ? 'bg-violet-600/25 text-violet-400'
                                        : 'text-white/30 hover:text-white/70 hover:bg-white/5'
                                }`
                            }
                        >
                            <Icon sx={{ fontSize: 22 }} />
                        </NavLink>
                    ))}
                </div>

                {/* Admin link at bottom */}
                <NavLink
                    to={ROUTES.DASHBOARD}
                    title="Admin Dashboard"
                    className="p-3 rounded-xl text-white/20 hover:text-white/50 hover:bg-white/5 transition-all mt-auto"
                >
                    <DashboardRoundedIcon sx={{ fontSize: 22 }} />
                </NavLink>
            </aside>

            {/* ── Page content ── */}
            <main className="flex-1 h-full overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
}
