import {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useKeycloak} from "@react-keycloak/web";
import api from "../../services/api";
import {ROUTES} from "../../routes";
import {usePermissions} from "../../auth/permissions";
import imageCompression from "browser-image-compression";

function ProductDetail() {
    const {id} = useParams();
    const {keycloak} = useKeycloak();
    const navigate = useNavigate();
    const {can} = usePermissions();

    const productId = useMemo(() => Number(id), [id]);

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [form, setForm] = useState({
        name: "",
        price: "",
        quantity: "",
        discount: "",
        status: "true",
        category: ""
    });
    const [editImage, setEditImage] = useState(null);
    const [categories, setCategories] = useState([]);

    const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB client-side limit

    useEffect(() => {
        if (!productId || Number.isNaN(productId)) {
            setError("Invalid product id.");
            setLoading(false);
            return;
        }
        const load = async () => {
            try {
                const [productRes, categoriesRes] = await Promise.all([
                    api.getProductById(productId),
                    api.getCategories(),
                ]);
                setProduct(productRes.data);
                setForm({
                    name: productRes.data.name || "",
                    price: productRes.data.price ?? "",
                    quantity: productRes.data.quantity ?? "",
                    discount: productRes.data.discount ?? "",
                    status: productRes.data.active ? "true" : "false",
                    category: productRes.data.category?.name || "",
                });
                setCategories(categoriesRes.data || []);
                setEditImage(null);
                setError("");
            } catch (err) {
                console.error("Unable to load product", err);
                setError("Unable to load product. Please go back and try again.");
            } finally {
                setLoading(false);
            }
        };
        if (keycloak?.authenticated) {
            load();
        }
    }, [productId, keycloak]);

    const handleChange = (event) => {
        const {name, value} = event.target;
        setForm((prev) => ({...prev, [name]: value}));
    };

    const handleEditImageChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            alert("File must be less than 5MB");
            event.target.value = "";
            setEditImage(null);
            return;
        }

        try {
            const compressed = await imageCompression(file, {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1200,
                useWebWorker: true,
            });
            setEditImage(compressed);
        } catch {
            setEditImage(file);
        }
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!product) return;

        const price = parseFloat(form.price);
        const discount = form.discount === "" ? 0 : parseFloat(form.discount);
        const quantity = parseInt(form.quantity, 10);
        const active = form.status === "true" || form.status === true;

        if (Number.isNaN(price) || Number.isNaN(discount) || Number.isNaN(quantity)) {
            setError("Please enter valid numeric values.");
            return;
        }

        try {
            setSaving(true);
            const updatedRes = await api.updateProductWithImage(product.id, {
                name: form.name,
                price,
                active,
                discount,
                quantity,
                category: form.category,
                file: editImage || null,
            });
            const updated = updatedRes?.data || product;
            setProduct(updated);
            setForm({
                name: updated.name || "",
                price: updated.price ?? "",
                quantity: updated.quantity ?? "",
                discount: updated.discount ?? "",
                status: updated.active ? "true" : "false",
                category: updated.category?.name || "",
            });
            setError("");
            setEditOpen(false);
            setEditImage(null);
        } catch (err) {
            console.error("Error updating product", err);
            setError("Update failed. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!product) return;
        if (!window.confirm("Delete this product? This cannot be undone.")) return;
        try {
            setDeleting(true);
            await api.deleteProduct(product.id);
            navigate(ROUTES.PRODUCTS);
        } catch (err) {
            console.error("Error deleting product", err);
            setError("Delete failed. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    const formatCurrency = (value) => {
        const formatter = new Intl.NumberFormat("en-KE", {style: "currency", currency: "KES"});
        const numeric = Number.parseFloat(value);
        return Number.isNaN(numeric) ? "KES --" : formatter.format(numeric);
    };


    const discountAmount = product ? (parseFloat(product.price) * (parseFloat(product.discount) || 0)) / 100 : 0;
    const effectivePrice = product ? parseFloat(product.price) - discountAmount : 0;
    const isLowStock = product && product.quantity <= 5;
    const canEdit = can("edit_products");

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-bg-primary gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-brand-primary border-t-transparent animate-spin" />
                <p className="text-base text-text-secondary font-medium">Loading product…</p>
            </div>
        );
    }

    if (error && !product) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-bg-primary text-text-secondary gap-5 px-4">
                <div className="text-5xl">📦</div>
                <p className="text-lg font-semibold text-text-primary text-center">{error}</p>
                <button onClick={() => navigate(ROUTES.PRODUCTS)} className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold">
                    ← Back to products
                </button>
            </div>
        );
    }

    return (
        <>
        <div className="h-screen flex flex-col bg-bg-primary overflow-hidden">

            {/* ── Top bar ── */}
            <div className="shrink-0 border-b border-border-primary bg-bg-secondary/80 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                <button
                    onClick={() => navigate(ROUTES.PRODUCTS)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Products
                </button>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
                    <span>{product?.category?.name || "Uncategorized"}</span>
                    <span>›</span>
                    <span className="text-text-primary">{product?.name}</span>
                </div>
            </div>

            {/* ── Main split ── */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">

                {/* Left: Image — desktop only, fills full height */}
                <div className="relative hidden lg:block h-full overflow-hidden bg-bg-tertiary border-r border-border-primary">
                    {product?.id && (
                        <img
                            src={api.getProductImageUrl(product.id)}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

                    {(parseFloat(product?.discount) || 0) > 0 && (
                        <div className="absolute top-4 left-4 rounded-full bg-accent-warning px-3 py-1 text-xs font-bold text-white shadow">
                            -{product.discount}% OFF
                        </div>
                    )}
                    <div className={`absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-bold shadow ${product?.active ? "bg-accent-success text-white" : "bg-black/50 text-white border border-white/20"}`}>
                        {product?.active ? "● Active" : "● Inactive"}
                    </div>

                    {/* Icon action buttons — admin / manager only */}
                    {canEdit && (
                        <div className="absolute bottom-5 right-5 flex gap-2">
                            <button
                                onClick={() => setEditOpen(true)}
                                title="Edit product"
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-primary hover:bg-brand-hover text-white shadow-lg transition"
                            >
                                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                title="Delete product"
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-error hover:bg-accent-error/90 text-white shadow-lg transition disabled:opacity-50"
                            >
                                {deleting
                                    ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    : <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                }
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Info panel */}
                <div className="overflow-y-auto">

                    {/* Mobile image */}
                    <div className="relative lg:hidden aspect-[4/3] w-full overflow-hidden bg-bg-tertiary">
                        {product?.id && (
                            <img
                                src={api.getProductImageUrl(product.id)}
                                alt={product.name}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                        {(parseFloat(product?.discount) || 0) > 0 && (
                            <div className="absolute top-3 left-3 rounded-full bg-accent-warning px-2.5 py-0.5 text-xs font-bold text-white shadow">
                                -{product.discount}% OFF
                            </div>
                        )}
                        <div className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-xs font-bold shadow ${product?.active ? "bg-accent-success text-white" : "bg-black/50 text-white"}`}>
                            {product?.active ? "● Active" : "● Inactive"}
                        </div>
                        {canEdit && (
                            <div className="absolute bottom-3 right-3 flex gap-2">
                                <button onClick={() => setEditOpen(true)} title="Edit" className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-primary hover:bg-brand-hover text-white shadow transition">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button onClick={handleDelete} disabled={deleting} title="Delete" className="w-9 h-9 flex items-center justify-center rounded-full bg-accent-error text-white shadow disabled:opacity-50">
                                    {deleting
                                        ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    }
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="px-6 sm:px-8 py-8 space-y-7">
                        {error && (
                            <div className="rounded-xl bg-accent-error/10 border border-accent-error/30 px-4 py-3 text-sm font-medium text-accent-error">
                                {error}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">#{product?.id}</p>
                            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-text-primary">
                                {product?.name}
                            </h1>
                        </div>

                        {/* Price */}
                        <div className="space-y-1">
                            {(parseFloat(product?.discount) || 0) > 0 ? (
                                <>
                                    <p className="text-3xl sm:text-4xl font-bold text-brand-primary">{formatCurrency(effectivePrice)}</p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-base text-text-muted line-through">{formatCurrency(product?.price)}</p>
                                        <span className="rounded-full bg-accent-warning/15 px-2.5 py-0.5 text-xs font-bold text-accent-warning">Save {formatCurrency(discountAmount)}</span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-3xl sm:text-4xl font-bold text-brand-primary">{formatCurrency(product?.price)}</p>
                            )}
                        </div>

                        {/* Stat cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">Stock</p>
                                <p className={`text-2xl font-bold ${isLowStock ? "text-accent-error" : "text-text-primary"}`}>{product?.quantity ?? "--"}</p>
                                {isLowStock && <p className="text-xs font-semibold text-accent-error mt-0.5">Low stock</p>}
                            </div>
                            <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">Category</p>
                                <p className="text-2xl font-bold text-text-primary truncate">{product?.category?.name || "—"}</p>
                            </div>
                            <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">Discount</p>
                                <p className="text-2xl font-bold text-text-primary">{product?.discount ?? 0}%</p>
                            </div>
                            <div className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">Status</p>
                                <span className={`inline-block mt-1 rounded-full px-3 py-1 text-xs font-bold ${product?.active ? "bg-accent-success/15 text-accent-success" : "bg-bg-tertiary text-text-muted"}`}>
                                    {product?.active ? "● Active" : "● Inactive"}
                                </span>
                            </div>
                        </div>

                        {/* Details list */}
                        <div className="rounded-2xl border border-border-primary bg-bg-secondary overflow-hidden">
                            {[
                                { label: "Full price", value: formatCurrency(product?.price) },
                                { label: "Selling price", value: formatCurrency(effectivePrice) },
                                { label: "Discount", value: `${product?.discount ?? 0}%` },
                                { label: "Units in stock", value: `${product?.quantity ?? "--"} units` },
                                { label: "Category", value: product?.category?.name || "Uncategorized" },
                            ].map(({ label, value }, i, arr) => (
                                <div key={label} className={`flex items-center justify-between px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-border-primary/50" : ""}`}>
                                    <span className="text-sm font-medium text-text-muted">{label}</span>
                                    <span className="text-sm font-semibold text-text-primary">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* ── Edit Modal ── */}
        {editOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0" role="dialog" aria-modal="true">
                <div className="w-full max-w-2xl rounded-3xl bg-bg-secondary border border-border-primary shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border-primary shrink-0">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Edit product</p>
                            <h3 className="text-xl font-bold text-text-primary mt-0.5">Update details</h3>
                        </div>
                        <button
                            onClick={() => { setEditOpen(false); setEditImage(null); }}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <form className="overflow-y-auto p-6 space-y-4" onSubmit={handleSave}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: "Name", name: "name", type: "text", required: true },
                                { label: "Price (KES)", name: "price", type: "number", step: "0.01", required: true },
                                { label: "Quantity", name: "quantity", type: "number", step: "1", min: "0", required: true },
                                { label: "Discount (%)", name: "discount", type: "number", step: "0.01", min: "0" },
                            ].map(({ label, ...inputProps }) => (
                                <div key={inputProps.name} className="space-y-1.5">
                                    <label className="block text-sm font-semibold text-text-secondary">{label}</label>
                                    <input
                                        {...inputProps}
                                        value={form[inputProps.name]}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-border-secondary bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition"
                                    />
                                </div>
                            ))}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-text-secondary">Status</label>
                                <select name="status" value={form.status} onChange={handleChange} required className="w-full rounded-xl border border-border-secondary bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary">
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-text-secondary">Category</label>
                                <select name="category" value={form.category} onChange={handleChange} className="w-full rounded-xl border border-border-secondary bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary">
                                    <option value="">Uncategorized</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="block text-sm font-semibold text-text-secondary">Product image</label>
                                <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-dashed border-border-secondary bg-bg-tertiary px-4 py-3 hover:border-brand-primary transition-colors">
                                    <svg className="w-5 h-5 text-text-muted shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                    <span className="text-sm text-text-secondary">{editImage ? editImage.name : "Choose an image (max 5 MB)"}</span>
                                    <input type="file" name="image" accept="image/*" onChange={handleEditImageChange} className="sr-only" />
                                </label>
                                {(editImage || product?.id) && (
                                    <div className="w-32 h-24 overflow-hidden rounded-xl border border-border-primary">
                                        <img
                                            src={editImage ? URL.createObjectURL(editImage) : api.getProductImageUrl(product.id)}
                                            alt="preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => { setEditOpen(false); setEditImage(null); }} className="rounded-xl border border-border-secondary px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-tertiary transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
                                {saving ? (
                                    <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving…</>
                                ) : "Save changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </>
    );
}

export default ProductDetail;
