import Home from './pages/Home.jsx';
import {Route, Routes} from "react-router-dom";
import CreateBlog from "./pages/Create-Blog.jsx";
import Products from "./pages/product/Products.jsx";
import RequireAuth from "./auth/RequireAuth.jsx";
// import Login from "./auth/Login.jsx";
import Register from "./auth/Register.jsx";
import {ROUTES} from "./routes.js";
import Error from "./components/Error.jsx";
import AddProduct from "./pages/product/AddProduct.jsx";

function App() {

    return (
        <div className="mx-4">

            <Routes>

                <Route path={ROUTES.HOME} element={<Home/>}/>
                {/*<Route path={ROUTES.LOGIN} element={<Login/>}/>*/}
                <Route path={ROUTES.REGISTER} element={<Register/>}/>

                <Route path={ROUTES.PRODUCTS} element={
                    <RequireAuth>
                        <Products/>
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

                <Route path={ROUTES.ERROR}element={
                  <Error/>
                }/> 


            </Routes>

        </div>
);
}

export default App;
