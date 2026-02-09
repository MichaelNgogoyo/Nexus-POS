import {useState} from "react";
import axios from "axios";
import {useKeycloak} from "@react-keycloak/web";
import {useNavigate} from "react-router-dom";
import {ROUTES} from "../../routes";

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
            await keycloak.updateToken(30);

            const formData = new FormData();
            formData.append("name", products.name);
            formData.append("price", price.toString());
            formData.append("active", active);
            formData.append("discount", discount.toString());
            formData.append("quantity", quantity.toString());

            if (image) {
                formData.append("file", image);
            }

            const response = await axios.post(
                "http://localhost:8080/api/product/create",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        Authorization: `Bearer ${keycloak.token}`
                    }
                }
            );

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold tracking-wide text-teal-600 uppercase">Inventory</p>
                        <h1 className="text-3xl font-bold text-slate-900">Add Products</h1>
                        <p className="text-slate-500 mt-1">Create a new product with pricing, stock, and imagery.</p>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur shadow-xl border border-slate-200 rounded-2xl p-8">
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={products.name}
                                onChange={handleChange}
                                placeholder="Organic Arabica Beans"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Price</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="price"
                                value={products.price}
                                onChange={handleChange}
                                placeholder="e.g. 1299"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Status</label>
                            <select
                                name="status"
                                value={products.status}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            >
                                <option value="">Select status</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Discount</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="discount"
                                value={products.discount}
                                onChange={handleChange}
                                placeholder="e.g. 10"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            />
                            <p className="text-xs text-slate-500">Enter numeric discount (e.g., 10 for 10%). Leave blank for 0.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Quantity</label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                name="quantity"
                                value={products.quantity}
                                onChange={handleChange}
                                placeholder="e.g. 45"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Image</label>
                            <div className="flex items-center gap-3 rounded-xl border border-dashed border-teal-300 bg-teal-50 px-4 py-3">
                                <input
                                    type="file"
                                    name="image"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="text-sm text-slate-700"
                                />
                            </div>
                        </div>

                        {image && (
                            <div className="space-y-2 md:col-span-2">
                                <p className="text-sm font-semibold text-slate-700">Preview</p>
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm w-full max-w-md">
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
                                className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
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