import Keycloak from "keycloak-js";
import { runtimeConfig } from "../config/runtimeConfig";

const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
const currentPageUrl = typeof window !== "undefined" ? window.location.href : "";

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
    checkLoginIframe: false,
    // Preserve deep links across Keycloak's check-sso callback.
    redirectUri: currentPageUrl || runtimeConfig.redirectUri || appOrigin,
    pkceMethod: hasWebCrypto ? "S256" : false,
    enableLogging: import.meta.env.DEV,
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
