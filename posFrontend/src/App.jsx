import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import { ROUTES } from './routes.js';
import RequireAuth from './auth/RequireAuth.jsx';
import { usePermissions } from './auth/permissions.js';
import { landingRouteForRoles } from './auth/accessPolicy.js';
import POSLayout from './pos/POSLayout.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import Error from './components/Error.jsx';
import Login from './auth/Login.jsx';
import Register from './auth/Register.jsx';

// Admin pages
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard.jsx'));
const Products = lazy(() => import('./pages/product/Products.jsx'));
const ProductDetail = lazy(() => import('./pages/product/ProductDetail.jsx'));
const AddProduct = lazy(() => import('./pages/product/AddProduct.jsx'));
const Categories = lazy(() => import('./pages/category/Categories.jsx'));
const Inventory = lazy(() => import('./pages/inventory/Inventory.jsx'));
const Reports = lazy(() => import('./pages/reports/Reports.jsx'));
const UserManagement = lazy(() => import('./pages/users/UserManagement.jsx'));
const Settings = lazy(() => import('./pages/settings/Settings.jsx'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog.jsx'));

// Finance pages
const Expenses = lazy(() => import('./pages/finance/Expenses.jsx'));
const Purchases = lazy(() => import('./pages/finance/Purchases.jsx'));
const Suppliers = lazy(() => import('./pages/finance/Suppliers.jsx'));

// POS pages
const POSCheckout = lazy(() => import('./pos/checkout/POSCheckout.jsx'));
const POSTables = lazy(() => import('./pos/tables/POSTables.jsx'));
const POSOrders = lazy(() => import('./pos/orders/POSOrders.jsx'));
const POSKitchen = lazy(() => import('./pos/kitchen/POSKitchen.jsx'));
const POSCustomers = lazy(() => import('./pos/customers/POSCustomers.jsx'));
const POSShift = lazy(() => import('./pos/shift/POSShift.jsx'));
const POSReservations = lazy(() => import('./pos/reservations/POSReservations.jsx'));

const Loader = () => (
    <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
);

function RoleLanding() {
    const { keycloak, initialized } = useKeycloak();
    const { roles } = usePermissions();

    if (!initialized) return <Loader />;
    if (!keycloak?.authenticated) return <Navigate to={ROUTES.LOGIN} replace />;

    const landingRoute = landingRouteForRoles(roles);
    if (!landingRoute) {
        return <div className="min-h-screen flex items-center justify-center px-6 text-center">
            <p className="text-sm text-text-secondary">Your account does not have access to a POS workspace. Ask an administrator to assign an application role.</p>
        </div>;
    }
    return <Navigate to={landingRoute} replace />;
}

function POSLanding() {
    const { can } = usePermissions();
    return <Navigate to={can('view_sales') ? ROUTES.POS_CHECKOUT : ROUTES.POS_KITCHEN} replace />;
}

function AdminLanding() {
    const { can } = usePermissions();
    return <Navigate to={can('view_dashboard') ? ROUTES.ADMIN_DASHBOARD : ROUTES.ADMIN_INVENTORY} replace />;
}

function FinanceLanding() {
    const { can } = usePermissions();
    return <Navigate to={can('view_finance') ? ROUTES.FINANCE_EXPENSES : ROUTES.FINANCE_PURCHASES} replace />;
}

function App() {
    return (
        <Suspense fallback={<Loader />}>
            <Routes>
                <Route path={ROUTES.LOGIN} element={<Login />} />
                <Route path={ROUTES.REGISTER} element={<Register />} />

                {/* POS Mode */}
                <Route path="/pos" element={<RequireAuth requiredAnyPermissions={['view_sales', 'view_kitchen']}><POSLayout /></RequireAuth>}>
                    <Route index element={<POSLanding />} />
                    <Route path="checkout" element={<RequireAuth requiredPermission="view_sales"><POSCheckout /></RequireAuth>} />
                    <Route path="tables" element={<RequireAuth requiredPermission="view_tables"><POSTables /></RequireAuth>} />
                    <Route path="orders" element={<RequireAuth requiredPermission="view_orders"><POSOrders /></RequireAuth>} />
                    <Route path="kitchen" element={<RequireAuth requiredPermission="view_kitchen"><POSKitchen /></RequireAuth>} />
                    <Route path="customers" element={<RequireAuth requiredPermission="view_customers"><POSCustomers /></RequireAuth>} />
                    <Route path="shift" element={<RequireAuth requiredPermission="view_shift"><POSShift /></RequireAuth>} />
                    <Route path="reservations" element={<RequireAuth requiredPermission="view_reservations"><POSReservations /></RequireAuth>} />
                </Route>

                {/* Admin Mode */}
                <Route path="/admin" element={<RequireAuth requiredAnyPermissions={['view_dashboard', 'view_products', 'view_inventory']}><AdminLayout /></RequireAuth>}>
                    <Route index element={<AdminLanding />} />
                    <Route path="dashboard" element={<RequireAuth requiredPermission="view_dashboard"><Dashboard /></RequireAuth>} />
                    <Route path="products" element={<RequireAuth requiredPermission="view_products"><Products /></RequireAuth>} />
                    <Route path="products/create" element={<RequireAuth requiredPermission="edit_products"><AddProduct /></RequireAuth>} />
                    <Route path="products/:id" element={<RequireAuth requiredPermission="view_products"><ProductDetail /></RequireAuth>} />
                    <Route path="categories" element={<RequireAuth requiredPermission="manage_categories"><Categories /></RequireAuth>} />
                    <Route path="inventory" element={<RequireAuth requiredPermission="view_inventory"><Inventory /></RequireAuth>} />
                    <Route path="reports" element={<RequireAuth requiredPermission="view_reports"><Reports /></RequireAuth>} />
                    <Route path="users" element={<RequireAuth requiredPermission="manage_users"><UserManagement /></RequireAuth>} />
                    <Route path="settings" element={<RequireAuth requiredPermission="manage_settings"><Settings /></RequireAuth>} />
                    <Route path="audit" element={<RequireAuth requiredPermission="view_audit"><AuditLog /></RequireAuth>} />
                </Route>

                {/* Finance Mode */}
                <Route path="/finance" element={<RequireAuth requiredAnyPermissions={['view_finance', 'view_procurement']}><AdminLayout /></RequireAuth>}>
                    <Route index element={<FinanceLanding />} />
                    <Route path="expenses" element={<RequireAuth requiredPermission="view_finance"><Expenses /></RequireAuth>} />
                    <Route path="purchases" element={<RequireAuth requiredPermission="view_procurement"><Purchases /></RequireAuth>} />
                    <Route path="suppliers" element={<RequireAuth requiredPermission="view_suppliers"><Suppliers /></RequireAuth>} />
                </Route>

                {/* Legacy redirects */}
                <Route path="/" element={<RoleLanding />} />
                <Route path="/dashboard" element={<Navigate to={ROUTES.HOME} replace />} />
                <Route path="/products" element={<Navigate to="/admin/products" replace />} />
                <Route path="/checkout" element={<Navigate to="/pos/checkout" replace />} />
                <Route path="/sales" element={<Navigate to="/pos/checkout" replace />} />
                <Route path="/transactions" element={<Navigate to="/admin/reports" replace />} />
                <Route path="/inventory" element={<Navigate to="/admin/inventory" replace />} />
                <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
                <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
                <Route path="/categories" element={<Navigate to="/admin/categories" replace />} />
                <Route path="/users" element={<Navigate to="/admin/users" replace />} />
                <Route path={ROUTES.ERROR} element={<Error />} />
                <Route path="*" element={<Error />} />
            </Routes>
        </Suspense>
    );
}

export default App;
