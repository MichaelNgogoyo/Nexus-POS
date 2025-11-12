import Home from './pages/Home.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx'
import {Route, Routes} from "react-router-dom";
import CreateBlog from "./pages/Create-Blog.jsx";
import Products from "./pages/product/Products.jsx";
import RequireAuth from "./auth/RequireAuth.jsx";
import Register from "./auth/Register.jsx";
import {ROUTES} from "./routes.js";
import Error from "./components/Error.jsx";
import AddProduct from "./pages/product/AddProduct.jsx";
import Layout from "./components/Layout.jsx";
// import Sales from "./pages/sales/Sales.jsx";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout/>}>
                <Route index element={<Home/>}/>
                <Route path={ROUTES.HOME} element={<Home/>}/>
                <Route path={ROUTES.DASHBOARD} element={<Dashboard />}/>
                <Route path={ROUTES.REGISTER} element={<Register/>}/>
                <Route path={ROUTES.PRODUCTS} element={
                    <RequireAuth>
                        <Products/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.SALES} element={
                    <RequireAuth>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.CREATE} element={
                    <RequireAuth>
                        <CreateBlog/>
                    </RequireAuth>
                }/>
                <Route path={ROUTES.CREATEPRODUCT} element={
                    <RequireAuth>
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
