import {useState} from "react";
import axios from "axios";
import {useKeycloak} from "@react-keycloak/web";

function AddProduct() {
    const {keycloak} = useKeycloak();

    const [products, setProducts] = useState({
        name: "",
        price: "",
        status: "",
        discount: "",
        quantity: ""
    });

    const [image, setImage] = useState(null);

    //handle change
    const handleChange = (e) => {
        setProducts({
            ...products,
            [e.target.name] : e.target.value
        });
    };

    //handle image selection
    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]){
            setImage(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {

        //stop page reload
        e.preventDefault();

        if (!keycloak?.authenticated) {
            alert("You must be logged in to add a product");
            return;
        }
        try {
            //refresh token if needed
            await keycloak.updateToken(30);
            //form data
            const formData = new FormData();

            formData.append("name", products.name);
            formData.append("price", products.price);
            formData.append("active", products.status === "true" || products.status === true);
            formData.append("discount", products.discount);
            formData.append("quantity", products.quantity);

            if (image){
                formData.append("file", image);
            }

            const response = await axios.post('http://localhost:8080/api/product/create',
                formData,
                {

                    headers: {
                        "Content-Type": `multipart/form-data`,
                        Authorization: `Bearer ${keycloak.token}`
                    }
                });

            if (response.status == 200 || response.status == 201) {
                alert("Product Saved!");
                setProducts({name: "", price: "", status: "", discount: "", quantity: ""});
            }else{
                alert("product not saved");
            }
        } catch (error) {
            console.log("Error saving product", error);
            alert("Error saving product");
        }
    };


    return (
        <div className="min-h-screen bg-gray-200 py-10 mx-60 px-40">
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Add Products</h1>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <label htmlFor="">Name:</label>
                <input
                    type="text"
                    name="name"
                    value={products.name}
                    onChange={handleChange}
                    placeholder="Enter product name"
                />
                <label htmlFor="">Price:</label>
                <input
                    type="text"
                    name="price"
                    value={products.price}
                    onChange={handleChange}
                    placeholder="Enter the Price"/>
                <label htmlFor="">Status:</label>
                <input
                    type="text"
                    name="status"
                    value={products.status}
                    onChange={handleChange}
                    placeholder="Enter Status"/>
                <label htmlFor="">Discount:</label>
                <input
                    type="text"
                    name="discount"
                    value={products.discount}
                    onChange={handleChange}
                    placeholder="Enter Discount"/>
                <label htmlFor="">Quantity:</label>
                <input
                    type="text"
                    name="quantity"
                    value={products.quantity}
                    onChange={handleChange}
                    placeholder="Enter product Quantity"/>
                <label htmlFor="">Image:</label>
                <input
                    type="file"
                    name="image"
                    onChange={handleImageChange}
                    placeholder="Select Image"
                    accept="image/*"
                />

                {image && (
                    <div>
                        <p>Preview</p>
                        <img src={URL.createObjectURL(image)}
                        alt="preview"
                             width="200"
                        />
                    </div>
                )}

                <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded">Submit</button>
            </form>
        </div>


    );
}

export default AddProduct;