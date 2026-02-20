import {Link} from "react-router-dom";
import {ROUTES} from "../routes.js";
import {useKeycloak} from "@react-keycloak/web";
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ThemeToggle from "./ThemeToggle.jsx";
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';

function NavBar() {
    const {keycloak, initialized} = useKeycloak();
    const handleLogout =()=>{
        if (initialized && keycloak?.authenticated) {
            keycloak.logout({redirectUri: window.location.origin})
        }
    };


    return (
        <nav className="fixed top-0 left-0 right-0 h-16 z-50 glass-effect border-b border-border-primary shadow-sm">
            <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Brand Logo */}
                <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2 group">
                    <StorefrontRoundedIcon className="text-brand-primary group-hover:scale-110 transition-transform duration-250" sx={{ fontSize: 32 }} />
                    <span className="text-xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
                        POS SYSTEM
                    </span>
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-3">
                    {!keycloak.authenticated ? (
                        <>
                            <button
                                onClick={() => keycloak.login()}
                                className="px-4 py-2 text-text-secondary hover:text-brand-primary transition-colors duration-250 font-medium"
                            >
                                Login
                            </button>
                            <Link
                                to={ROUTES.REGISTER}
                                className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-hover transition-all duration-250 hover:scale-105 active:scale-95 font-medium"
                            >
                                Register
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                className="px-3 py-2 text-text-secondary hover:text-brand-primary transition-all duration-250 font-medium hover:bg-bg-secondary rounded-lg"
                                to={ROUTES.DASHBOARD}
                            >
                                Dashboard
                            </Link>
                            <Link
                                className="px-3 py-2 text-text-secondary hover:text-brand-primary transition-all duration-250 font-medium hover:bg-bg-secondary rounded-lg"
                                to={ROUTES.INVENTORY}
                            >
                                Inventory
                            </Link>
                            <Link
                                className="px-3 py-2 text-text-secondary hover:text-brand-primary transition-all duration-250 font-medium hover:bg-bg-secondary rounded-lg"
                                to={ROUTES.SALES}
                            >
                                Sales
                            </Link>
                            <Link
                                className="px-3 py-2 text-text-secondary hover:text-brand-primary transition-all duration-250 font-medium hover:bg-bg-secondary rounded-lg"
                                to={ROUTES.REPORTS}
                            >
                                Reports
                            </Link>
                            <Link
                                className="px-3 py-2 text-text-secondary hover:text-brand-primary transition-all duration-250 font-medium hover:bg-bg-secondary rounded-lg"
                                to={ROUTES.USERS}
                            >
                                Users
                            </Link>
                            <Link
                                className="px-3 py-2 text-text-secondary hover:text-brand-primary transition-all duration-250 font-medium hover:bg-bg-secondary rounded-lg"
                                to={ROUTES.SETTINGS}
                            >
                                Settings
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-text-secondary hover:text-accent-error hover:bg-bg-secondary rounded-lg transition-all duration-250 hover:scale-110 active:scale-95"
                                aria-label="Logout"
                                title="Logout"
                            >
                                <LogoutRoundedIcon sx={{ fontSize: 24 }} />
                            </button>
                        </>
                    )}

                    {/* Theme Toggle */}
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    )

}

export default NavBar;