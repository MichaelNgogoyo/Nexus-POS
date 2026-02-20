import {useEffect, useMemo, useState} from "react";
import api from "../../services/api";
import {Sync, ErrorOutline, Inventory2} from "@mui/icons-material";

function Inventory() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoading(true);
                const response = await api.getAllProducts();
                setProducts(response.data || []);
                setError("");
            } catch (err) {
                console.error(err);
                setError("Unable to load inventory data.");
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, []);

    const filteredProducts = useMemo(() => {
        return products.filter((product) =>
            product.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const lowStockCount = useMemo(
        () => products.filter((product) => Number(product.quantity) > 0 && Number(product.quantity) <= 5).length,
        [products]
    );

    const outOfStockCount = useMemo(
        () => products.filter((product) => Number(product.quantity) <= 0).length,
        [products]
    );

    const totalUnits = useMemo(
        () => products.reduce((sum, product) => sum + Number(product.quantity || 0), 0),
        [products]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Inventory Management</h1>
                    <p className="text-text-secondary mt-1">Track current stock health and quickly identify replenishment needs.</p>
                </div>
                <div className="card px-4 py-2 text-sm text-text-secondary">
                    Last sync: {new Date().toLocaleString()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-4">
                    <p className="text-sm text-text-secondary">Total Units in Stock</p>
                    <p className="text-kpi text-text-primary mt-1 text-data">{totalUnits}</p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-text-secondary">Low Stock Items</p>
                    <p className="text-kpi text-accent-warning mt-1 text-data">{lowStockCount}</p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-text-secondary">Out of Stock Items</p>
                    <p className="text-kpi text-accent-error mt-1 text-data">{outOfStockCount}</p>
                </div>
            </div>

            <div className="card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h2 className="text-xl font-semibold">Inventory Catalog</h2>
                    <input
                        type="text"
                        placeholder="Search inventory..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="w-full sm:w-72 rounded-lg border border-border-secondary bg-bg-tertiary px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <Sync className="animate-spin text-brand-primary" sx={{fontSize: 40}}/>
                        <p className="mt-2 text-text-secondary">Loading inventory...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <ErrorOutline className="text-accent-error" sx={{fontSize: 40}}/>
                        <p className="mt-2 text-accent-error">{error}</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <Inventory2 className="text-text-muted" sx={{fontSize: 40}}/>
                        <p className="mt-2 text-text-secondary">No inventory records found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                            <tr className="border-b border-border-secondary text-text-secondary">
                                <th className="p-3">Product</th>
                                <th className="p-3">SKU ID</th>
                                <th className="p-3">Price</th>
                                <th className="p-3">Quantity</th>
                                <th className="p-3">Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredProducts.map((product) => {
                                const quantity = Number(product.quantity || 0);
                                const status = quantity <= 0 ? "Out of Stock" : quantity <= 5 ? "Low Stock" : "Healthy";
                                const statusClass = quantity <= 0
                                    ? "bg-accent-error/20 text-accent-error"
                                    : quantity <= 5
                                        ? "bg-accent-warning/20 text-accent-warning"
                                        : "bg-accent-success/20 text-accent-success";

                                return (
                                    <tr key={product.id} className="border-b border-border-primary">
                                        <td className="p-3 font-medium">{product.name}</td>
                                        <td className="p-3 text-text-secondary">#{product.id}</td>
                                        <td className="p-3 text-text-secondary text-data">KES {Number(product.price || 0).toFixed(2)}</td>
                                        <td className="p-3 font-semibold text-data">{quantity}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                                                {status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Inventory;
