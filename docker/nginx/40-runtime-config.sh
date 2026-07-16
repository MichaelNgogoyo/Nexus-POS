#!/bin/sh
set -eu

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__APP_CONFIG__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-http://localhost:8080}",
  VITE_KEYCLOAK_URL: "${VITE_KEYCLOAK_URL:-http://localhost:8081}",
  VITE_KEYCLOAK_REALM: "${VITE_KEYCLOAK_REALM:-pos}",
  VITE_KEYCLOAK_CLIENT_ID: "${VITE_KEYCLOAK_CLIENT_ID:-pos-client}",
  VITE_REDIRECT_URI: "${VITE_REDIRECT_URI:-http://localhost:3000}"
};
EOF
