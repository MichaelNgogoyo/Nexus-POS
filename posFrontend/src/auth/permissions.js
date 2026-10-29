import { useKeycloak } from '@react-keycloak/web';
import { runtimeConfig } from '../config/runtimeConfig';
import { normalizeRole, permissionsForRoles } from './accessPolicy.js';

function extractRoles(keycloak) {
  const tokenParsed = keycloak?.tokenParsed || {};
  const realmRoles = tokenParsed?.realm_access?.roles || keycloak?.realmAccess?.roles || [];
  const resourceRoles = tokenParsed?.resource_access?.[runtimeConfig.keycloakClientId]?.roles || [];

  return [...new Set([...realmRoles, ...resourceRoles])]
    .filter(Boolean)
    .map((r) => normalizeRole(String(r)));
}

export function usePermissions() {
  const { keycloak } = useKeycloak();

  const normalised = extractRoles(keycloak);

  const allPerms = permissionsForRoles(normalised);

  const can = (permission) => {
    if (!keycloak?.authenticated) return false;
    if (allPerms.size === 0) return false;
    return allPerms.has(permission);
  };

  return { can, roles: normalised, permissions: [...allPerms] };
}
