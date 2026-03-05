import Home from './pages/Home.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx'
import {Route, Routes} from "react-router-dom";
import CreateBlog from "./pages/Create-Blog.jsx";
import Products from "./pages/product/Products.jsx";
import RequireAuth from "./auth/RequireAuth.jsx";
import Register from "./auth/Register.jsx";
import Login from "./auth/Login.jsx";
import {ROUTES} from "./routes.js";
import Error from "./components/Error.jsx";
import AddProduct from "./pages/product/AddProduct.jsx";
import Layout from "./components/Layout.jsx";
import Sales from "./pages/sales/Sales.jsx";
import Checkout from "./pages/sales/Checkout.jsx";
import Transactions from "./pages/sales/Transactions.jsx";
import Inventory from "./pages/inventory/Inventory.jsx";
import Reports from "./pages/reports/Reports.jsx";
import UserManagement from "./pages/users/UserManagement.jsx";
import Settings from "./pages/settings/Settings.jsx";
import ProductDetail from "./pages/product/ProductDetail.jsx";
import Categories from "./pages/category/Categories.jsx";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout/>}>
                <Route index element={<Home/>}/>
                <Route path={ROUTES.HOME} element={<Home/>}/>
                <Route path={ROUTES.DASHBOARD} element={<RequireAuth requiredPermission="view_dashboard"><Dashboard /></RequireAuth>}/>
                <Route path={ROUTES.LOGIN} element={<Login/>}/>
                <Route path={ROUTES.REGISTER} element={<Register/>}/>
                <Route path={ROUTES.PRODUCTS} element={
                    <RequireAuth requiredPermission="view_products">
                        <Products/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.PRODUCT_DETAIL} element={
                    <RequireAuth requiredPermission="view_products">
                        <ProductDetail/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.INVENTORY} element={
                    <RequireAuth requiredPermission="view_inventory">
                        <Inventory/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.SALES} element={
                    <RequireAuth requiredPermission="view_sales">
                        <Sales/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.CHECKOUT} element={
                    <RequireAuth requiredPermission="view_sales">
                        <Checkout/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.TRANSACTIONS} element={
                    <RequireAuth requiredPermission="view_sales">
                        <Transactions/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.REPORTS} element={
                    <RequireAuth requiredPermission="view_reports">
                        <Reports/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.USERS} element={
                    <RequireAuth requiredPermission="manage_users">
                        <UserManagement/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.SETTINGS} element={
                    <RequireAuth requiredPermission="view_dashboard">
                        <Settings/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.CATEGORIES} element={
                    <RequireAuth requiredPermission="manage_categories">
                        <Categories/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.CREATE} element={
                    <RequireAuth requiredPermission="edit_products">
                        <CreateBlog/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.CREATEPRODUCT} element={
                    <RequireAuth requiredPermission="edit_products">
                        <AddProduct/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.ERROR} element={<Error/>}/>
                <Route path="*" element={<Error/>}/>
            </Route>
        </Routes>
    );
}

export default App;
