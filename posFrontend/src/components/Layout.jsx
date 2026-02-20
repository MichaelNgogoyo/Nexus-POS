import {NavLink, Outlet} from "react-router-dom";
import InventoryIcon from "@mui/icons-material/Inventory";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SettingsIcon from '@mui/icons-material/Settings';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import {ROUTES} from "../routes.js";
import NavBar from "./NavBar.jsx";

export default function Layout() {
    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Fixed Navbar */}
            <NavBar/>

            <div className="flex pt-16">
                {/* Fixed Sidebar */}
                <aside className="fixed left-0 w-64 h-[calc(100vh-4rem)] bg-bg-secondary border-r border-border-primary shadow-sm flex flex-col overflow-y-auto">
                    {/* Sidebar Header */}
                    <div className="p-6 border-b border-border-primary">
                        <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                            <DashboardRoundedIcon sx={{ fontSize: 28 }} />
                            My Dashboard
                        </h2>
                        <p className="text-xs text-text-muted mt-1">Manage your business</p>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex flex-col flex-grow p-4">
                        {/* Main Navigation */}
                        <div className="flex flex-col space-y-2 flex-grow">
                            <NavLink
                                to={ROUTES.DASHBOARD}
                                className={({isActive}) =>
                                    `nav-link ${isActive ? 'active' : ''}`
                                }
                            >

                                <DashboardRoundedIcon className="text-brand-primary" sx={{ fontSize: 22 }} />
                                <span className="font-medium">Dashboard</span>
                            </NavLink>
                            <NavLink
                                to={ROUTES.SALES}
                                className={({isActive}) =>
                                    `nav-link ${isActive ? 'active' : ''}`
                                }
                            >

                                <ShoppingCartIcon className="text-brand-primary" sx={{ fontSize: 22 }} />
                                <span className="font-medium">Sales</span>
                            </NavLink>


                            <NavLink
                                to={ROUTES.INVENTORY}
                                className={({isActive}) =>
                                    `nav-link ${isActive ? 'active' : ''}`
                                }
                            >
                                <WarehouseRoundedIcon className="text-accent-success" sx={{ fontSize: 22 }} />
                                <span className="font-medium">Inventory</span>
                            </NavLink>

                            <NavLink
                                to={ROUTES.PRODUCTS}
                                className={({isActive}) =>
                                    `nav-link ${isActive ? 'active' : ''}`
                                }
                            >
                                <InventoryIcon className="text-accent-success" sx={{ fontSize: 22 }} />
                                <span className="font-medium">Products</span>
                            </NavLink>

                            <NavLink
                                to={ROUTES.REPORTS}
                                className={({isActive}) =>
                                    `nav-link ${isActive ? 'active' : ''}`
                                }
                            >
                                <AssessmentRoundedIcon className="text-accent-warning" sx={{ fontSize: 22 }} />
                                <span className="font-medium">Reports</span>
                            </NavLink>

                            <NavLink
                                to={ROUTES.USERS}
                                className={({isActive}) =>
                                    `nav-link ${isActive ? 'active' : ''}`
                                }
                            >
                                <PersonAddIcon className="text-accent-warning" sx={{ fontSize: 22 }} />
                                <span className="font-medium">Users</span>
                            </NavLink>
                        </div>

                        {/* Bottom Navigation */}
                        <div className="mt-auto pt-4 border-t border-border-primary space-y-2">
                            <NavLink
                                to="#"
                                className="nav-link"
                            >
                                <AccountCircleRoundedIcon className="text-text-muted" sx={{ fontSize: 22 }} />
                                <span className="font-medium">Profile</span>
                            </NavLink>

                            <NavLink
                                to="#"
                                className="nav-link"
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
                        <Outlet/>
                    </div>
                </main>
            </div>
        </div>
    );
}