import {useEffect, useState} from "react";
import axios from "axios";
import {useKeycloak} from "@react-keycloak/web";
import Layout from "../../components/Layout.jsx";

function Products() {
    const {keycloak} = useKeycloak();


    const [products, setProducts] = useState([]);


    useEffect(() => {
            const fetchProducts = async () => {
                if (keycloak?.authenticated) {
                    try {
                        const response = await axios.get('http://localhost:8080/api/product',
                            {
                                headers: {
                                    Authorization: `Bearer ${keycloak.token}`
                                }
                            });

                        setProducts(response.data);

                    } catch (error) {
                        console.error('Login Unsuccessful', error);
                    }
                }
            };
            fetchProducts();
        }, [keycloak]
    );


    return (


            <div>

                {/*    Main content*/}
                        <div className="bg-gray-100 py-10 px-4">
                            <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Our Products</h1>
                            <div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                                {products.map((product) => (
                                    <div
                                        className="bg-white rounded-2xl shadow-md hover:shadow-xl transition duration-300 p-4"
                                        key={product.id}
                                    ><img src={`http://localhost:8080/api/product/${product.id}/image`}
                                        alt={product.name}
                                        className="w-full h-48 object-cover rounded-lg mb-4"
                                    />
                                        <h2 className="text-lg font-semibold text-gray-800">{product.name}</h2>

                                        <div>
                                            <label
                                                htmlFor="">{product.quantity > 1 ? product.quantity : "Out of stock"}</label>
                                        </div>

                                        <button className="float-end bg-teal-800 rounded-full px-2 py-2 text-white">Add to
                                            Cart
                                        </button>

                                        <p className="text-blue-600 font-bold text-2xl ">Ksh {product.price}</p>
                                        <p className="text-xs text-gray-400 mt-1">By Michael</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>


    );
}

export default Products;