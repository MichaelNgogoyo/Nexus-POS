import {useKeycloak} from "@react-keycloak/web";


function RequireAuth({ children }) {
    const {keycloak} = useKeycloak();


    if (keycloak.authenticated === undefined) {
        return <p>Loading...</p>; // Optional: splash screen
    }

    if (!keycloak.authenticated){
         keycloak.login;
        return null;
    }

    return  children;
}

export default RequireAuth;
