import Keycloak from "keycloak-js";

const keycloakConfig = {
    url: import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8081",
    realm: import.meta.env.VITE_KEYCLOAK_REALM || "pos",
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "poskeycloakid",
};

export const keycloakInitOptions = {
    onLoad: "check-sso",
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    checkLoginIframe: false,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
    pkceMethod: "S256",
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;