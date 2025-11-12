import Keycloak from "keycloak-js";

const keycloakConfig = {
    url: import.meta.env.VITE_KEYCLOAK_URL,
    realm: import.meta.env.VITE_KEYCLOAK_REALM,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    redirectUri: import.meta.env.VITE_REDIRECT_URI
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;