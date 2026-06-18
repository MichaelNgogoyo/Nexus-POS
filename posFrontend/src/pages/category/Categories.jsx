import {useEffect, useState} from "react";
import {useKeycloak} from "@react-keycloak/web";
import api from "../../services/api";
import {ROUTES} from "../../routes";
import {Link} from "react-router-dom";

function Categories() {
    const {keycloak} = useKeycloak();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState("");

    const fetchCategories = async () => {
        if (!keycloak?.authenticated) return;
        try {
            setLoading(true);
            const res = await api.getCategories();
            setCategories(res.data || []);
            setError("");
        } catch (err) {
            console.error("Unable to load categories", err);
            setError("Unable to load categories. Please refresh.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [keycloak]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!nameInput.trim()) {
            setError("Category name is required.");
            return;
        }
        try {
            await api.createCategory(nameInput.trim());
            setNameInput("");
            setError("");
            fetchCategories();
        } catch (err) {
            console.error("Create category failed", err);
            const msg = err?.response?.data?.message || "Create failed. Name must be unique.";
            setError(msg);
        }
    };

    const startEdit = (cat) => {
        setEditingId(cat.id);
        setEditingName(cat.name);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingName.trim() || !editingId) {
            setError("Category name is required.");
            return;
        }
        try {
            await api.updateCategory(editingId, editingName.trim());
            setEditingId(null);
            setEditingName("");
            setError("");
            fetchCategories();
        } catch (err) {
            console.error("Update category failed", err);
            const msg = err?.response?.data?.message || "Update failed. Name must be unique.";
            setError(msg);
        }
    };

    const handleDelete = async (catId) => {
        if (!window.confirm("Delete this category? Products will move to Uncategorized.")) return;
        try {
            await api.deleteCategory(catId);
            fetchCategories();
        } catch (err) {
            console.error("Delete category failed", err);
            const msg = err?.response?.data?.message || "Delete failed.";
            setError(msg);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary py-8 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold tracking-wide text-brand-primary uppercase">Catalog</p>
                        <h1 className="text-3xl font-bold text-text-primary">Categories</h1>
                        <p className="text-text-secondary mt-1">Manage product categories used across the catalog.</p>
                    </div>
                    <Link to={ROUTES.PRODUCTS} className="rounded-xl border border-border-secondary px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-tertiary">Back to Products</Link>
                </div>

                {error && (
                    <div className="rounded-xl border border-accent-error/30 bg-accent-error/10 text-accent-error px-4 py-3 text-sm">
                        {error}
                    </div>
                )}

                <div className="card rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-bold text-text-primary">Create category</h2>
                    <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleCreate}>
                        <input
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="e.g. Beverages"
                            className="flex-1 rounded-xl border border-border-secondary bg-bg-tertiary px-4 py-3 text-sm"
                        />
                        <button type="submit" className="btn-primary rounded-xl px-4 py-3 text-sm font-semibold">Add</button>
                    </form>
                </div>

                <div className="card rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-text-primary">All categories</h2>
                        {loading && <p className="text-sm text-text-secondary">Loading...</p>}
                    </div>
                    {categories.length === 0 ? (
                        <p className="text-sm text-text-secondary">No categories yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between rounded-xl border border-border-secondary bg-bg-tertiary px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-text-primary">{cat.name}</span>
                                        <span className="text-xs text-text-muted">{cat.productCount ?? 0} products</span>
                                    </div>
                                    {editingId === cat.id ? (
                                        <form className="flex items-center gap-2" onSubmit={handleUpdate}>
                                            <input
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="rounded-lg border border-border-secondary bg-bg-secondary px-3 py-2 text-sm"
                                                autoFocus
                                            />
                                            <button type="submit" className="btn-primary px-3 py-2 text-xs font-semibold">Save</button>
                                            <button type="button" onClick={() => { setEditingId(null); setEditingName(""); }} className="rounded-lg border border-border-secondary px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-secondary">Cancel</button>
                                        </form>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => startEdit(cat)} className="rounded-lg border border-border-secondary px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-secondary">Edit</button>
                                            <button onClick={() => handleDelete(cat.id)} className="rounded-lg border border-accent-error/40 px-3 py-2 text-xs font-semibold text-accent-error hover:bg-accent-error/10">Delete</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Categories;
