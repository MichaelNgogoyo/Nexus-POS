import {NavLink, Outlet} from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import InventoryIcon from "@mui/icons-material/Inventory";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import {ROUTES} from "../routes.js";
import NavBar from "./NavBar.jsx";

export default function Layout() {
    return (
        <div>
            <div className="fixed top-0 left-0 w-full z-50">
                <NavBar/>
            </div>
            <div className="flex bg-gray-100">
                <aside className="fixed top-[64px] w-64 h-[calc(100vh-64px)] bg-white shadow-md flex flex-col">
                    <div className="p-6 text-2xl bg-gray-100 font-bold text-blue-900 border-b">
                        My Dashboard
                    </div>
                    <nav className="flex flex-col h-full p-6 bg-gray-50">
                        <div className="flex flex-col flex-grow space-y-4">
                            <NavLink
                                to={ROUTES.DASHBOARD}
                                className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-200 transition duration-300"
                            >
                                <DashboardRoundedIcon className="text-blue-700"/>
                                <span className="font-medium text-gray-800">Dashboard</span>
                            </NavLink>
                            <NavLink
                                to={ROUTES.PRODUCTS}
                                className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-200 transition duration-300"
                            >
                                <InventoryIcon className="text-blue-700"/>
                                <span className="font-medium text-gray-800">Products</span>
                            </NavLink>
                            <NavLink
                                to={ROUTES.CREATE}
                                className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-200 transition duration-300"
                            >
                                <PersonAddIcon className="text-blue-700"/>
                                <span className="font-medium text-gray-800">Create User</span>
                            </NavLink>
                        </div>
                        <div className="mt-auto">
                            <NavLink
                                to="#"
                                className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-200 transition duration-300"
                            >
                                <AccountCircleRoundedIcon className="text-blue-700"/>
                                <span className="font-medium text-gray-800">Profile</span>
                            </NavLink>
                            <NavLink
                                to="#"
                                className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-200 transition duration-300"
                            >
                                <SettingsIcon className="text-blue-700"/>
                                <span className="font-medium text-gray-800">Settings</span>
                            </NavLink>
                        </div>
                    </nav>
                </aside>
                <main className="flex-grow ml-64 p-6 mt-16 bg-gray-100 min-h-screen">
                    <Outlet/>
                </main>
            </div>
        </div>
    );
}