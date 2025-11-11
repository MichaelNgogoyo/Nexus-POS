import {Link, useNavigate} from "react-router-dom";
import {ROUTES} from "../routes.js";
import {useKeycloak} from "@react-keycloak/web";
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';

function NavBar() {
    const {keycloak, initialized} = useKeycloak();
    useNavigate();
    const handleLogout =()=>{
        if (initialized && keycloak?.authenticated) {
            keycloak.logout({redirectUri: window.location.origin})
        }
    };


    return (
        <div className="navbar p-5 flex items-start max-w[600px] mx-auto border-b-2 border-b-gray-300">
            <Link to={'/'} className="text-gray-800 font-bold">POS SYSTEM</Link>
            <div className="links ml-auto flex items-center gap-4 text-gray-600">
                {!keycloak.authenticated ? (
                    <>
                        <button onClick={() => keycloak.login()} className="hover:underline">Login</button>
                        <Link to={ROUTES.REGISTER} className="hover:underline">Register</Link>
                    </>) : (<>
                    <Link className="ml-4 decoration-0 p-1.5 hover:text-blue-500" to={ROUTES.DASHBOARD}>Dashboard</Link>
                    <Link className="ml-4 decoration-0 p-1.5 hover:text-blue-500" to={ROUTES.PRODUCTS}>Shop</Link>
                    <Link className="ml-4 decoration-0 p-1.5 hover:text-blue-500" to={ROUTES.HOME}>Blog</Link>
                    <button onClick={handleLogout} className="ml-4 decoration-0 p-1.5 hover:text-blue-500 flex items-center gap-1">
                        <LogoutRoundedIcon/>
                    </button>
                </>)}
            </div>
        </div>
    )

}

export default NavBar;