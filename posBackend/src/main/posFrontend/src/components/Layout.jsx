import { NavLink, Outlet } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import InventoryIcon from "@mui/icons-material/Inventory";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {ROUTES} from "../routes.js";

export default function Layout() {
    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-6 text-2xl font-bold text-blue-900 border-b">
                    My Dashboard
                </div>
                <nav className="flex-1 p-6 space-y-4 bg-gray-50">
                    <NavLink
                        to={ROUTES.HOME}
                        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-200 transition duration-300"
                    >
                        <HomeIcon className="text-blue-700" />
                        <span className="font-medium text-gray-800">Home</span>
                    </NavLink>
                    <NavLink
                        to={ROUTES.PRODUCTS}
                        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-200 transition duration-300 bg-gray-200"
                    >
                        <InventoryIcon className="text-blue-700" />
                        <span className="font-medium text-gray-800">Products</span>
                    </NavLink>
                    <NavLink
                        to={ROUTES.CREATE}
                        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-200 transition duration-300"
                    >
                        <PersonAddIcon className="text-blue-700" />
                        <span className="font-medium text-gray-800">Create User</span>
                    </NavLink>
                </nav>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-6">
                <Outlet />
            </main>
        </div>
    );
}
