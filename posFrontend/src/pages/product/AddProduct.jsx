import {useState} from "react";
import {useKeycloak} from "@react-keycloak/web";
import {useNavigate} from "react-router-dom";
import {ROUTES} from "../../routes";
import api from "../../services/api";

function AddProduct() {
    const {keycloak} = useKeycloak();
    const navigate = useNavigate();

    const [products, setProducts] = useState({
        name: "",
        price: "",
        status: "",
        discount: "",
        quantity: ""
    });

    const [image, setImage] = useState(null);

    const handleChange = (e) => {
        setProducts({
            ...products,
            [e.target.name]: e.target.value
        });
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!keycloak?.authenticated) {
            alert("You must be logged in to add a product");
            return;
        }

        // basic client-side validation to match backend expectations
        const price = parseFloat(products.price);
        const discount = products.discount === "" ? 0 : parseFloat(products.discount);
        const quantity = parseInt(products.quantity, 10);
        const active = products.status === "true" || products.status === true;

        if (Number.isNaN(price)) {
            alert("Price must be a number");
            return;
        }

        if (Number.isNaN(discount)) {
            alert("Discount must be a number (or leave blank for 0)");
            return;
        }

        if (Number.isNaN(quantity)) {
            alert("Quantity must be an integer");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("name", products.name);
            formData.append("price", price.toString());
            formData.append("active", active);
            formData.append("discount", discount.toString());
            formData.append("quantity", quantity.toString());

            if (image) {
                formData.append("file", image);
            }

            const response = await api.createProduct(formData);

            if (response.status === 200 || response.status === 201) {
                alert("Product Saved!");
                setProducts({name: "", price: "", status: "", discount: "", quantity: ""});
                setImage(null);
                navigate(ROUTES.PRODUCTS);
            } else {
                alert("Product not saved");
            }
        } catch (error) {
            console.log("Error saving product", error);
            alert("Error saving product");
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary py-8 px-4">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold tracking-wide text-brand-primary uppercase">Inventory</p>
                        <h1 className="text-3xl font-bold text-text-primary">Add Products</h1>
                        <p className="text-text-secondary mt-1">Create a new product with pricing, stock, and imagery.</p>
                    </div>
                </div>

                <div className="card rounded-2xl p-8">
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={products.name}
                                onChange={handleChange}
                                placeholder="Organic Arabica Beans"
                                className="w-full rounded-xl border border-border-secondary bg-bg-tertiary px-4 py-3 text-text-primary placeholder:text-text-muted shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Price</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="price"
                                value={products.price}
                                onChange={handleChange}
                                placeholder="e.g. 1299"
                                className="w-full rounded-xl border border-border-secondary bg-bg-tertiary px-4 py-3 text-text-primary placeholder:text-text-muted shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Status</label>
                            <select
                                name="status"
                                value={products.status}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-border-secondary bg-bg-tertiary px-4 py-3 text-text-primary shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                            >
                                <option value="">Select status</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Discount</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="discount"
                                value={products.discount}
                                onChange={handleChange}
                                placeholder="e.g. 10"
                                className="w-full rounded-xl border border-border-secondary bg-bg-tertiary px-4 py-3 text-text-primary placeholder:text-text-muted shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                            />
                            <p className="text-xs text-text-muted">Enter numeric discount (e.g., 10 for 10%). Leave blank for 0.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Quantity</label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                name="quantity"
                                value={products.quantity}
                                onChange={handleChange}
                                placeholder="e.g. 45"
                                className="w-full rounded-xl border border-border-secondary bg-bg-tertiary px-4 py-3 text-text-primary placeholder:text-text-muted shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Image</label>
                            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border-secondary bg-bg-tertiary px-4 py-3">
                                <input
                                    type="file"
                                    name="image"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="text-sm text-text-secondary"
                                />
                            </div>
                        </div>

                        {image && (
                            <div className="space-y-2 md:col-span-2">
                                <p className="text-sm font-semibold text-text-secondary">Preview</p>
                                <div className="overflow-hidden rounded-xl border border-border-primary bg-bg-tertiary shadow-sm w-full max-w-md">
                                    <img
                                        src={URL.createObjectURL(image)}
                                        alt="preview"
                                        className="w-full h-64 object-cover"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                            <button
                                type="submit"
                                className="btn-primary inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
                            >
                                Save Product
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AddProduct;