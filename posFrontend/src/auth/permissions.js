import { useKeycloak } from '@react-keycloak/web';
import { runtimeConfig } from '../config/runtimeConfig';

const ROLE_PERMISSIONS = {
  ADMIN: [
    'view_dashboard', 'view_products', 'edit_products', 'view_inventory',
    'view_sales', 'view_reports', 'manage_users', 'manage_categories', 'view_finance',
  ],
  MANAGER: [
    'view_dashboard', 'view_products', 'view_inventory', 'view_sales',
    'view_reports', 'manage_categories', 'view_finance',
  ],
  CASHIER: ['view_dashboard', 'view_products', 'view_sales'],
  USER: ['view_dashboard', 'view_products', 'view_sales'],
};

function normalizeRole(role) {
  const upper = role.toUpperCase();
  return upper.startsWith('ROLE_') ? upper.slice(5) : upper;
}

function extractRoles(keycloak) {
  const tokenParsed = keycloak?.tokenParsed || {};
  const realmRoles = tokenParsed?.realm_access?.roles || keycloak?.realmAccess?.roles || [];
  const resourceRoles = tokenParsed?.resource_access?.[runtimeConfig.keycloakClientId]?.roles || [];

  return [...realmRoles, ...resourceRoles]
    .filter(Boolean)
    .map((r) => normalizeRole(String(r)));
}

export function usePermissions() {
  const { keycloak } = useKeycloak();

  const normalised = extractRoles(keycloak);

  const allPerms = new Set();
  normalised.forEach((role) => {
    (ROLE_PERMISSIONS[role] ?? []).forEach(p => allPerms.add(p));
  });

  if (normalised.includes('ADMIN')) {
    Object.values(ROLE_PERMISSIONS).flat().forEach(p => allPerms.add(p));
  }

  const can = (permission) => {
    if (!keycloak?.authenticated) return false;
    if (allPerms.size === 0) return false;
    return allPerms.has(permission);
  };

  return { can, roles: normalised, permissions: [...allPerms] };
}
