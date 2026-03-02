import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useKeycloak} from "@react-keycloak/web";
import {ROUTES} from "../../routes";
import api from "../../services/api";
import {useQuery, useQueryClient} from "@tanstack/react-query";

function Products() {
    const {keycloak} = useKeycloak();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [inventoryError, setInventoryError] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [adjustingProductId, setAdjustingProductId] = useState(null);
    const [adjustmentValue, setAdjustmentValue] = useState(1);
    const [adjustmentReason, setAdjustmentReason] = useState("Stock Refill");
    const [loadingAdjustment, setLoadingAdjustment] = useState(false);
    const [selectedHistoryProductId, setSelectedHistoryProductId] = useState(null);
    const [stockMovements, setStockMovements] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const {data: products = []} = useQuery({
        queryKey: ["products"],
        queryFn: () => api.getAllProducts().then((res) => res.data),
        enabled: !!keycloak?.authenticated,
        staleTime: 5 * 60 * 1000,
    });

    const {data: categories = []} = useQuery({
        queryKey: ["categories"],
        queryFn: () => api.getCategories().then((res) => res.data || []),
        enabled: !!keycloak?.authenticated,
        staleTime: 10 * 60 * 1000,
    });

    const fetchProducts = () => queryClient.invalidateQueries({queryKey: ["products"]});

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

    const goToDetail = (productId) => {
        navigate(ROUTES.PRODUCT_DETAIL.replace(":id", productId));
    };

    return (
        <>
            <div className="min-h-screen bg-bg-primary py-8 px-4">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold tracking-wide text-brand-primary uppercase">Catalog</p>
                            <h1 className="text-3xl font-bold text-text-primary">Products</h1>
                            <p className="text-text-secondary mt-1">Browse your inventory and add new items quickly.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-text-secondary">Category</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="rounded-xl border border-border-secondary bg-bg-tertiary px-3 py-2 text-sm"
                                >
                                    <option value="">All</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => navigate(ROUTES.CATEGORIES)}
                                className="rounded-xl border border-border-secondary px-4 py-3 text-sm font-semibold text-text-primary hover:bg-bg-tertiary"
                            >
                                Manage Categories
                            </button>
                            <button
                                onClick={() => navigate(ROUTES.CREATEPRODUCT)}
                                className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold"
                            >
                                + Add Product
                            </button>
                        </div>
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
                                {(categoryFilter ? products.filter((p) => (p.category?.name || "") === categoryFilter) : products).map((product) => {
                                    const inStock = Number(product.quantity) > 0;
                                    return (
                                        <div
                                            className="group relative bg-bg-secondary rounded-2xl border border-border-primary shadow-sm hover:shadow-lg transition duration-200 overflow-hidden"
                                            key={product.id}
                                        >
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => goToDetail(product.id)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { goToDetail(product.id); } }}
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
                                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inStock ? "bg-bg-tertiary text-text-primary" : "bg-bg-tertiary text-text-secondary"}`}>
                                                            {inStock ? `${product.quantity} in stock` : "Out of stock"}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <p className="text-2xl font-bold text-text-primary">{formatCurrency(product.price)}</p>
                                                        <span className="rounded-full border border-border-secondary px-3 py-1 text-xs text-text-secondary">Tap for details</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="px-4 pb-4 space-y-2 border-t border-border-primary pt-3">
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
                                                        className="w-24 rounded-lg border border-border-secondary bg-bg-tertiary px-2 py-1 text-sm"
                                                        onClick={(e) => e.stopPropagation()}
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
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option>Stock Refill</option>
                                                        <option>Physical Count Correction</option>
                                                        <option>Damaged Goods</option>
                                                        <option>Returned Stock</option>
                                                    </select>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleStockAdjustment(product.id, "in"); }}
                                                        disabled={loadingAdjustment}
                                                        className="flex-1 rounded-lg border border-border-secondary bg-bg-tertiary px-3 py-2 text-xs font-semibold text-text-primary transition hover:bg-bg-secondary disabled:opacity-60"
                                                    >
                                                        Stock In
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleStockAdjustment(product.id, "out"); }}
                                                        disabled={loadingAdjustment}
                                                        className="flex-1 rounded-lg border border-border-secondary bg-bg-tertiary px-3 py-2 text-xs font-semibold text-text-primary transition hover:bg-bg-secondary disabled:opacity-60"
                                                    >
                                                        Stock Out
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleLoadMovements(product.id); }}
                                                        className="rounded-lg border border-border-secondary px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-bg-tertiary"
                                                    >
                                                        History
                                                    </button>
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

        </>
    );
}

export default Products;
