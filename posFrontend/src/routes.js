// routes.js
export const ROUTES = {
    // Auth
    LOGIN: '/login',
    REGISTER: '/register',
    ERROR: '/error',

    // POS Mode
    POS: '/pos',
    POS_CHECKOUT: '/pos/checkout',
    POS_TABLES: '/pos/tables',
    POS_ORDERS: '/pos/orders',
    POS_KITCHEN: '/pos/kitchen',
    POS_CUSTOMERS: '/pos/customers',
    POS_SHIFT: '/pos/shift',
    POS_RESERVATIONS: '/pos/reservations',

    // Admin Mode
    ADMIN: '/admin',
    ADMIN_DASHBOARD: '/admin/dashboard',
    ADMIN_PRODUCTS: '/admin/products',
    ADMIN_PRODUCT_DETAIL: '/admin/products/:id',
    ADMIN_CREATE_PRODUCT: '/admin/products/create',
    ADMIN_CATEGORIES: '/admin/categories',
    ADMIN_INVENTORY: '/admin/inventory',
    ADMIN_REPORTS: '/admin/reports',
    ADMIN_USERS: '/admin/users',
    ADMIN_SETTINGS: '/admin/settings',
    ADMIN_CUSTOMERS: '/admin/customers',
    ADMIN_AUDIT: '/admin/audit',

    // Finance
    FINANCE: '/finance',
    FINANCE_EXPENSES: '/finance/expenses',
    FINANCE_PURCHASES: '/finance/purchases',
    FINANCE_SUPPLIERS: '/finance/suppliers',

    // Legacy compat redirects
    HOME: '/',
    DASHBOARD: '/admin/dashboard',
    PRODUCTS: '/admin/products',
    INVENTORY: '/admin/inventory',
    SALES: '/pos/checkout',
    CHECKOUT: '/pos/checkout',
    TRANSACTIONS: '/admin/reports',
    REPORTS: '/admin/reports',
    USERS: '/admin/users',
    SETTINGS: '/admin/settings',
    CATEGORIES: '/admin/categories',
    PRODUCT_DETAIL: '/admin/products/:id',
    CREATE: '/admin/products/create',
    CREATEPRODUCT: '/admin/products/create',
};
