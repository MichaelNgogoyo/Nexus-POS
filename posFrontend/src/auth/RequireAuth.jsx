import {useKeycloak} from "@react-keycloak/web";
import {useEffect} from "react";


function RequireAuth({ children }) {
    const {keycloak, initialized} = useKeycloak();

    useEffect(() => {
        if (initialized && keycloak && !keycloak.authenticated) {
            keycloak.login({redirectUri: window.location.href});
        }
    }, [initialized, keycloak]);


    if (!initialized || keycloak?.authenticated === undefined) {
        return <p>Loading...</p>;
    }

    if (!keycloak.authenticated){
        return null;
    }

    return  children;
}

export default RequireAuth;
