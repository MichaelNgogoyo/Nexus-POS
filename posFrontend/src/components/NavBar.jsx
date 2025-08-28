import {Link, useNavigate} from "react-router-dom";
import {ROUTES} from "../routes.js";
import {useKeycloak} from "@react-keycloak/web";

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
            <Link to={'/'} className="text-gray-800 font-bold">The POS Blog</Link>
            <div className="links ml-auto">
                {!keycloak.authenticated ? (
                    <>
                        <button onClick={() => keycloak.login()} className="hover:underline">Login</button>
                        <Link to={ROUTES.REGISTER} className="hover:underline">Register</Link>
                    </>) : (<>
                    <Link className="ml-4 decoration-0 p-1.5 hover:text-blue-500" to={ROUTES.HOME}>Home</Link>
                    <Link className="ml-4 decoration-0 p-1.5 hover:text-blue-500" to={ROUTES.PRODUCTS}>Shop</Link>
                    <Link className="ml-4 decoration-0 p-1.5 hover:text-blue-500" to={ROUTES.CREATE}>New Blog</Link>
                    <button onClick={handleLogout} className="hover:underline">Logout</button>
                </>)}
            </div>
        </div>
    )

}

export default NavBar;