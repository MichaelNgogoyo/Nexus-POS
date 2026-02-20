import {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useKeycloak} from "@react-keycloak/web";
import {ROUTES} from "../../routes";
import api from "../../services/api";

function Products() {
    const {keycloak} = useKeycloak();
    const navigate = useNavigate();


    const [products, setProducts] = useState([]);
    const [inventoryError, setInventoryError] = useState("");
    const [adjustingProductId, setAdjustingProductId] = useState(null);
    const [adjustmentValue, setAdjustmentValue] = useState(1);
    const [adjustmentReason, setAdjustmentReason] = useState("Stock Refill");
    const [loadingAdjustment, setLoadingAdjustment] = useState(false);
    const [selectedHistoryProductId, setSelectedHistoryProductId] = useState(null);
    const [stockMovements, setStockMovements] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);


    const fetchProducts = useCallback(async () => {
        if (keycloak?.authenticated) {
            try {
                const response = await api.getAllProducts();
                setProducts(response.data);
                setInventoryError("");
            } catch (error) {
                console.error('Unable to fetch products', error);
                setInventoryError("Unable to fetch products. Please refresh and try again.");
            }
        }
    }, [keycloak]);

    useEffect(() => {
            fetchProducts();
        }, [fetchProducts]
    );

    const handleStockAdjustment = async (productId, direction) => {
        if (!adjustmentValue || adjustmentValue < 1) {
            setInventoryError("Adjustment quantity must be at least 1.");
            return;
        }

        const delta = direction === "in" ? Math.abs(Number(adjustmentValue)) : -Math.abs(Number(adjustmentValue));

        try {
            setLoadingAdjustment(true);
            await api.adjustProductStock(productId, {
                delta,
                reason: adjustmentReason,
            });
            setInventoryError("");
            await fetchProducts();

            if (selectedHistoryProductId === productId) {
                await handleLoadMovements(productId);
            }
        } catch (error) {
            console.error("Error adjusting stock", error);
            setInventoryError("Stock adjustment failed. Confirm backend endpoint and try again.");
        } finally {
            setLoadingAdjustment(false);
        }
    };

    const handleLoadMovements = async (productId) => {
        try {
            setSelectedHistoryProductId(productId);
            setHistoryLoading(true);
            const response = await api.getProductStockMovements(productId);
            setStockMovements(response.data || []);
            setInventoryError("");
        } catch (error) {
            console.error("Error fetching stock movements", error);
            setStockMovements([]);
            setInventoryError("Could not load stock movement history for this product.");
        } finally {
            setHistoryLoading(false);
        }
    };


    const formatCurrency = (value) => {
        const formatter = new Intl.NumberFormat("en-KE", {style: "currency", currency: "KES"});
        const numeric = Number.parseFloat(value);
        return Number.isNaN(numeric) ? "KES --" : formatter.format(numeric);
    };

    const lowStockProducts = products.filter((product) => Number(product.quantity) > 0 && Number(product.quantity) <= 5);

    return (
        <div className="min-h-screen bg-bg-primary py-8 px-4">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold tracking-wide text-brand-primary uppercase">Catalog</p>
                        <h1 className="text-3xl font-bold text-text-primary">Products</h1>
                        <p className="text-text-secondary mt-1">Browse your inventory and add new items quickly.</p>
                    </div>
                    <button
                        onClick={() => navigate(ROUTES.CREATEPRODUCT)}
                        className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold"
                    >
                        + Add Product
                    </button>
                </div>

                <div className="card rounded-2xl p-6">
                    {inventoryError && (
                        <div className="mb-4 rounded-xl bg-accent-error/10 border border-accent-error/30 text-accent-error px-4 py-3 text-sm font-medium">
                            {inventoryError}
                        </div>
                    )}

                    {lowStockProducts.length > 0 && (
                        <div className="mb-4 rounded-xl bg-accent-warning/10 border border-accent-warning/30 text-accent-warning px-4 py-3 text-sm">
                            <span className="font-semibold">Low stock alert:</span> {lowStockProducts.length} product(s) are at or below 5 units.
                        </div>
                    )}

                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold">:)</div>
                            <h2 className="text-xl font-semibold text-text-primary">No products yet</h2>
                            <p className="text-text-secondary">Add your first product to start selling.</p>
                            <button
                                onClick={() => navigate(ROUTES.CREATEPRODUCT)}
                                className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold"
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
                                        className="group relative bg-bg-secondary rounded-2xl border border-border-primary shadow-sm hover:shadow-lg transition duration-200 overflow-hidden"
                                        key={product.id}
                                    >
                                        <div className="h-48 w-full overflow-hidden bg-bg-tertiary">
                                            <img
                                                src={api.getProductImageUrl(product.id)}
                                                alt={product.name}
                                                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                                            />
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <h2 className="text-lg font-semibold text-text-primary line-clamp-1">{product.name}</h2>
                                                    <p className="text-sm text-text-muted">SKU #{product.id}</p>
                                                </div>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inStock ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                                    {inStock ? `${product.quantity} in stock` : "Out of stock"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <p className="text-2xl font-bold text-brand-primary">{formatCurrency(product.price)}</p>
                                                <button className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-hover">
                                                    Add to Cart
                                                </button>
                                            </div>

                                            <div className="space-y-2 border-t border-border-primary pt-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={adjustingProductId === product.id ? adjustmentValue : 1}
                                                        onFocus={() => {
                                                            setAdjustingProductId(product.id);
                                                            setAdjustmentValue(1);
                                                        }}
                                                        onChange={(e) => {
                                                            setAdjustingProductId(product.id);
                                                            setAdjustmentValue(Number(e.target.value));
                                                        }}
                                                        className="w-20 rounded-lg border border-border-secondary bg-bg-tertiary px-2 py-1 text-sm"
                                                    />
                                                    <select
                                                        value={adjustingProductId === product.id ? adjustmentReason : "Stock Refill"}
                                                        onFocus={() => {
                                                            setAdjustingProductId(product.id);
                                                            setAdjustmentReason("Stock Refill");
                                                        }}
                                                        onChange={(e) => {
                                                            setAdjustingProductId(product.id);
                                                            setAdjustmentReason(e.target.value);
                                                        }}
                                                        className="flex-1 rounded-lg border border-border-secondary bg-bg-tertiary px-2 py-1 text-sm"
                                                    >
                                                        <option>Stock Refill</option>
                                                        <option>Physical Count Correction</option>
                                                        <option>Damaged Goods</option>
                                                        <option>Returned Stock</option>
                                                    </select>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleStockAdjustment(product.id, "in")}
                                                        disabled={loadingAdjustment}
                                                        className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                                    >
                                                        Stock In
                                                    </button>
                                                    <button
                                                        onClick={() => handleStockAdjustment(product.id, "out")}
                                                        disabled={loadingAdjustment}
                                                        className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                                                    >
                                                        Stock Out
                                                    </button>
                                                    <button
                                                        onClick={() => handleLoadMovements(product.id)}
                                                        className="rounded-lg border border-border-secondary px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-bg-tertiary"
                                                    >
                                                        History
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {selectedHistoryProductId && (
                        <div className="mt-8 border-t border-border-primary pt-6">
                            <h3 className="text-lg font-semibold text-text-primary mb-3">Stock Movement History</h3>
                            {historyLoading ? (
                                <p className="text-sm text-text-secondary">Loading history...</p>
                            ) : stockMovements.length === 0 ? (
                                <p className="text-sm text-text-secondary">No stock movement records found for this product.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm text-left">
                                        <thead>
                                        <tr className="border-b border-border-primary text-text-secondary">
                                            <th className="px-3 py-2">Date</th>
                                            <th className="px-3 py-2">Reason</th>
                                            <th className="px-3 py-2">Change</th>
                                            <th className="px-3 py-2">Balance</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {stockMovements.map((movement, index) => (
                                            <tr key={movement.id || index} className="border-b border-border-primary/50">
                                                <td className="px-3 py-2 text-text-primary">{movement.createdAt ? new Date(movement.createdAt).toLocaleString() : "--"}</td>
                                                <td className="px-3 py-2 text-text-primary">{movement.reason || "--"}</td>
                                                <td className={`px-3 py-2 font-semibold ${(movement.delta || 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                                    {(movement.delta || 0) >= 0 ? `+${movement.delta}` : movement.delta}
                                                </td>
                                                <td className="px-3 py-2 text-text-primary">{movement.balanceAfter ?? "--"}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Products;