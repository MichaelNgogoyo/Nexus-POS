export const ROLE_PERMISSIONS = Object.freeze({
  ADMIN: [
    'view_dashboard', 'view_products', 'edit_products', 'view_inventory',
    'view_sales', 'view_tables', 'view_orders', 'view_kitchen', 'view_customers',
    'view_shift', 'view_reservations', 'view_reports', 'manage_users',
    'manage_categories', 'view_finance', 'view_procurement', 'manage_settings',
    'view_audit', 'view_suppliers', 'view_purchase_orders',
  ],
  MANAGER: [
    'view_dashboard', 'view_products', 'edit_products', 'view_inventory',
    'view_sales', 'view_tables', 'view_orders', 'view_kitchen', 'view_customers',
    'view_shift', 'view_reservations', 'view_reports', 'manage_categories',
    'view_finance', 'view_procurement', 'manage_settings', 'view_audit',
    'view_suppliers', 'view_purchase_orders',
  ],
  CASHIER: [
    'view_sales', 'view_tables', 'view_orders', 'view_kitchen',
    'view_customers', 'view_shift', 'view_reservations',
  ],
  KITCHEN: ['view_kitchen'],
  STOCK_CLERK: ['view_products', 'view_inventory', 'view_procurement', 'view_suppliers', 'view_purchase_orders'],
  PROCUREMENT_OFFICER: ['view_procurement', 'view_purchase_orders'],
  USER: [],
});

export function normalizeRole(role) {
  const normalized = String(role ?? '').trim().toUpperCase();
  return normalized.startsWith('ROLE_') ? normalized.slice(5) : normalized;
}

export function permissionsForRoles(roles = []) {
  const permissions = new Set();
  for (const role of roles.map(normalizeRole)) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) permissions.add(permission);
  }
  return permissions;
}

export function landingRouteForRoles(roles = []) {
  const normalized = new Set(roles.map(normalizeRole));
  if (normalized.has('ADMIN') || normalized.has('MANAGER')) return '/admin/dashboard';
  if (normalized.has('CASHIER')) return '/pos/checkout';
  if (normalized.has('KITCHEN')) return '/pos/kitchen';
  if (normalized.has('STOCK_CLERK')) return '/admin/inventory';
  if (normalized.has('PROCUREMENT_OFFICER')) return '/finance/purchases';
  return null;
}
