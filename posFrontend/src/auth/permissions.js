import { useKeycloak } from '@react-keycloak/web';

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
};

export function usePermissions() {
  const { keycloak } = useKeycloak();

  const roles = keycloak?.realmAccess?.roles ?? [];
  const normalised = roles.map(r => r.toUpperCase());

  const allPerms = new Set();
  normalised.forEach(role => {
    (ROLE_PERMISSIONS[role] ?? []).forEach(p => allPerms.add(p));
  });

  // If user has any admin-like role treat as full access
  if (normalised.includes('ADMIN') || normalised.includes('admin')) {
    Object.values(ROLE_PERMISSIONS).flat().forEach(p => allPerms.add(p));
  }

  const can = (permission) => {
    if (!keycloak?.authenticated) return false;
    if (allPerms.size === 0) return true; // default: allow all authenticated users
    return allPerms.has(permission);
  };

  return { can, roles: normalised, permissions: [...allPerms] };
}
