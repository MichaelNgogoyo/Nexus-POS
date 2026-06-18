import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ROUTES } from './routes.js';
import RequireAuth from './auth/RequireAuth.jsx';
import POSLayout from './pos/POSLayout.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import Error from './components/Error.jsx';
import Login from './auth/Login.jsx';
import Register from './auth/Register.jsx';

// Admin pages (lazy)
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard.jsx'));
const Products = lazy(() => import('./pages/product/Products.jsx'));
const ProductDetail = lazy(() => import('./pages/product/ProductDetail.jsx'));
const AddProduct = lazy(() => import('./pages/product/AddProduct.jsx'));
const Categories = lazy(() => import('./pages/category/Categories.jsx'));
const Inventory = lazy(() => import('./pages/inventory/Inventory.jsx'));
const Reports = lazy(() => import('./pages/reports/Reports.jsx'));
const UserManagement = lazy(() => import('./pages/users/UserManagement.jsx'));
const Settings = lazy(() => import('./pages/settings/Settings.jsx'));

// POS pages (lazy)
const POSCheckout = lazy(() => import('./pos/checkout/POSCheckout.jsx'));
const POSTables = lazy(() => import('./pos/tables/POSTables.jsx'));
const POSOrders = lazy(() => import('./pos/orders/POSOrders.jsx'));
const POSKitchen = lazy(() => import('./pos/kitchen/POSKitchen.jsx'));
const POSCustomers = lazy(() => import('./pos/customers/POSCustomers.jsx'));
const POSShift = lazy(() => import('./pos/shift/POSShift.jsx'));

const Loader = () => (
    <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
);

function App() {
    return (
        <Suspense fallback={<Loader />}>
            <Routes>
                {/* ── Auth ── */}
                <Route path={ROUTES.LOGIN} element={<Login />} />
                <Route path={ROUTES.REGISTER} element={<Register />} />

                {/* ── POS Mode ── */}
                <Route path="/pos" element={<RequireAuth requiredPermission="view_sales"><POSLayout /></RequireAuth>}>
                    <Route index element={<Navigate to={ROUTES.POS_CHECKOUT} replace />} />
                    <Route path="checkout" element={<POSCheckout />} />
                    <Route path="tables" element={<POSTables />} />
                    <Route path="orders" element={<POSOrders />} />
                    <Route path="kitchen" element={<POSKitchen />} />
                    <Route path="customers" element={<POSCustomers />} />
                    <Route path="shift" element={<POSShift />} />
                </Route>

                {/* ── Admin Mode ── */}
                <Route path="/admin" element={<RequireAuth requiredPermission="view_dashboard"><AdminLayout /></RequireAuth>}>
                    <Route index element={<Navigate to={ROUTES.ADMIN_DASHBOARD} replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="products" element={<RequireAuth requiredPermission="view_products"><Products /></RequireAuth>} />
                    <Route path="products/create" element={<RequireAuth requiredPermission="edit_products"><AddProduct /></RequireAuth>} />
                    <Route path="products/:id" element={<RequireAuth requiredPermission="view_products"><ProductDetail /></RequireAuth>} />
                    <Route path="categories" element={<RequireAuth requiredPermission="manage_categories"><Categories /></RequireAuth>} />
                    <Route path="inventory" element={<RequireAuth requiredPermission="view_inventory"><Inventory /></RequireAuth>} />
                    <Route path="reports" element={<RequireAuth requiredPermission="view_reports"><Reports /></RequireAuth>} />
                    <Route path="users" element={<RequireAuth requiredPermission="manage_users"><UserManagement /></RequireAuth>} />
                    <Route path="settings" element={<Settings />} />
                </Route>

                {/* ── Legacy redirects ── */}
                <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
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
