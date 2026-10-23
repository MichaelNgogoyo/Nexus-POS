import Keycloak from "keycloak-js";
import { runtimeConfig } from "../config/runtimeConfig";

const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

const hasWebCrypto =
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined";

const normalizeBaseUrl = (url) => (url || "").replace(/\/+$/, "");

const keycloakConfig = {
    url: normalizeBaseUrl(runtimeConfig.keycloakUrl),
    realm: runtimeConfig.keycloakRealm,
    clientId: runtimeConfig.keycloakClientId,
};

export const keycloakInitOptions = {
    onLoad: "check-sso",
    silentCheckSsoRedirectUri: `${appOrigin}/silent-check-sso.html`,
    checkLoginIframe: false,
    redirectUri: runtimeConfig.redirectUri || appOrigin,
    pkceMethod: hasWebCrypto ? "S256" : false,
    enableLogging: import.meta.env.DEV,
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;