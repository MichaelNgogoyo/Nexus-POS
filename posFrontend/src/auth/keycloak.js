import Keycloak from "keycloak-js";
import { runtimeConfig } from "../config/runtimeConfig";

const hasWebCrypto =
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined";

const keycloakConfig = {
    url: runtimeConfig.keycloakUrl,
    realm: runtimeConfig.keycloakRealm,
    clientId: runtimeConfig.keycloakClientId,
};

export const keycloakInitOptions = {
    onLoad: "check-sso",
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    checkLoginIframe: false,
    redirectUri: runtimeConfig.redirectUri,
    pkceMethod: hasWebCrypto ? "S256" : false,
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;