const runtime = window.__APP_CONFIG__ || {};

const env = import.meta.env;

export const runtimeConfig = {
  // API requests stay same-origin; Vite and Nginx proxy /api to Spring Boot.
  apiBaseUrl: window.location.origin,
  keycloakUrl: runtime.VITE_KEYCLOAK_URL || env.VITE_KEYCLOAK_URL || "http://localhost:8081",
  keycloakRealm: runtime.VITE_KEYCLOAK_REALM || env.VITE_KEYCLOAK_REALM || "pos",
  keycloakClientId: runtime.VITE_KEYCLOAK_CLIENT_ID || env.VITE_KEYCLOAK_CLIENT_ID || "pos-client",
  redirectUri: runtime.VITE_REDIRECT_URI || env.VITE_REDIRECT_URI || window.location.origin,
};
