import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useKeycloak} from "@react-keycloak/web";
import {ROUTES} from "../../routes";
import api from "../../services/api";

function Products() {
    const {keycloak} = useKeycloak();
    const navigate = useNavigate();


    const [products, setProducts] = useState([]);


    useEffect(() => {
            const fetchProducts = async () => {
                if (keycloak?.authenticated) {
                    try {
                        const response = await api.getAllProducts();

                        setProducts(response.data);

                    } catch (error) {
                        console.error('Login Unsuccessful', error);
                    }
                }
            };
            fetchProducts();
        }, [keycloak]
    );


    const formatCurrency = (value) => {
        const formatter = new Intl.NumberFormat("en-KE", {style: "currency", currency: "KES"});
        const numeric = Number.parseFloat(value);
        return Number.isNaN(numeric) ? "KES --" : formatter.format(numeric);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold tracking-wide text-teal-600 uppercase">Catalog</p>
                        <h1 className="text-3xl font-bold text-slate-900">Products</h1>
                        <p className="text-slate-500 mt-1">Browse your inventory and add new items quickly.</p>
                    </div>
                    <button
                        onClick={() => navigate(ROUTES.CREATEPRODUCT)}
                        className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    >
                        + Add Product
                    </button>
                </div>

                <div className="bg-white/90 backdrop-blur shadow-xl border border-slate-200 rounded-2xl p-6">
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold">:)</div>
                            <h2 className="text-xl font-semibold text-slate-900">No products yet</h2>
                            <p className="text-slate-500">Add your first product to start selling.</p>
                            <button
                                onClick={() => navigate(ROUTES.CREATEPRODUCT)}
                                className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-200 transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
                            >
                                Add Product
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product) => {
                                const inStock = Number(product.quantity) > 0;
                                return (
                                    <div
                                        className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition duration-200 overflow-hidden"
                                        key={product.id}
                                    >
                                        <div className="h-48 w-full overflow-hidden bg-slate-100">
                                            <img
                                                src={api.getProductImageUrl(product.id)}
                                                alt={product.name}
                                                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                                            />
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <h2 className="text-lg font-semibold text-slate-900 line-clamp-1">{product.name}</h2>
                                                    <p className="text-sm text-slate-500">By Michael</p>
                                                </div>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inStock ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                                    {inStock ? `${product.quantity} in stock` : "Out of stock"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <p className="text-2xl font-bold text-teal-700">{formatCurrency(product.price)}</p>
                                                <button className="rounded-full bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-teal-200 shadow-sm transition hover:bg-teal-700">
                                                    Add to Cart
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Products;