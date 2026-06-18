import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import InventoryIcon from '@mui/icons-material/Inventory';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import { ROUTES } from '../routes.js';
import NavBar from '../components/NavBar.jsx';
import { usePermissions } from '../auth/permissions';

export default function AdminLayout() {
    const { can } = usePermissions();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Fixed Navbar */}
            <NavBar />

            <div className="flex pt-16">
                {/* Fixed Sidebar */}
                <aside className="fixed left-0 w-64 h-[calc(100vh-4rem)] bg-bg-secondary border-r border-border-primary shadow-sm flex flex-col overflow-y-auto">
                    {/* Sidebar Header */}
                    <div className="p-6 border-b border-border-primary">
                        <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                            <DashboardRoundedIcon sx={{ fontSize: 28 }} />
                            Admin Portal
                        </h2>
                        <p className="text-xs text-text-muted mt-1">Manage your business</p>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex flex-col flex-grow p-4">
                        <div className="flex flex-col space-y-2 flex-grow">
                            {/* POS Mode switch — top of sidebar */}
                            <button
                                onClick={() => navigate(ROUTES.POS_CHECKOUT)}
                                className="flex items-center gap-2 w-full px-4 py-2.5 mb-2 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-hover transition-colors"
                            >
                                <PointOfSaleRoundedIcon sx={{ fontSize: 20 }} />
                                POS Mode
                            </button>

                            <p className="px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Overview</p>
                            <NavLink
                                to={ROUTES.ADMIN_DASHBOARD}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                <DashboardRoundedIcon className="text-brand-primary" sx={{ fontSize: 22 }} />
                                <span className="font-medium">Dashboard</span>
                            </NavLink>

                            {can('view_inventory') && (
                                <>
                                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Inventory</p>
                                    <NavLink
                                        to={ROUTES.ADMIN_INVENTORY}
                                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    >
                                        <WarehouseRoundedIcon className="text-accent-success" sx={{ fontSize: 22 }} />
                                        <span className="font-medium">Inventory</span>
                                    </NavLink>
                                </>
                            )}

                            {can('view_products') && (
                                <NavLink
                                    to={ROUTES.ADMIN_PRODUCTS}
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                >
                                    <InventoryIcon className="text-accent-success" sx={{ fontSize: 22 }} />
                                    <span className="font-medium">Products</span>
                                </NavLink>
                            )}

                            {can('manage_categories') && (
                                <NavLink
                                    to={ROUTES.ADMIN_CATEGORIES}
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                >
                                    <CategoryRoundedIcon className="text-accent-success" sx={{ fontSize: 22 }} />
                                    <span className="font-medium">Categories</span>
                                </NavLink>
                            )}

                            {can('view_reports') && (
                                <>
                                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Analytics</p>
                                    <NavLink
                                        to={ROUTES.ADMIN_REPORTS}
                                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    >
                                        <AssessmentRoundedIcon className="text-accent-warning" sx={{ fontSize: 22 }} />
                                        <span className="font-medium">Reports</span>
                                    </NavLink>
                                </>
                            )}

                            {can('manage_users') && (
                                <>
                                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Team</p>
                                    <NavLink
                                        to={ROUTES.ADMIN_USERS}
                                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    >
                                        <PersonAddIcon className="text-accent-warning" sx={{ fontSize: 22 }} />
                                        <span className="font-medium">Users</span>
                                    </NavLink>
                                </>
                            )}
                        </div>

                        {/* Bottom Navigation */}
                        <div className="mt-auto pt-4 border-t border-border-primary space-y-2">
                            <NavLink to="#" className="nav-link">
                                <AccountCircleRoundedIcon className="text-text-muted" sx={{ fontSize: 22 }} />
                                <span className="font-medium">Profile</span>
                            </NavLink>
                            <NavLink
                                to={ROUTES.ADMIN_SETTINGS}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                <SettingsIcon className="text-text-muted" sx={{ fontSize: 22 }} />
                                <span className="font-medium">Settings</span>
                            </NavLink>
                        </div>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-grow ml-64 p-6 bg-bg-primary min-h-[calc(100vh-4rem)]">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
