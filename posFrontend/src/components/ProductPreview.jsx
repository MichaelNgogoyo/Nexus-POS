const ProductPreview = (props) => {

    const products = props.blogs;
    return (
        <div className=" rounded-lg">
            {products.map ((product)=> (
                <div className="blog-preview flex border-gray-200 hover:border-gray-300 flex-col gap-2 p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300" key={product.id}>
                    <h2 className="font-bold text-pink-600 text-2xl"><span>{product.id}. </span>{product.title}</h2>
                    <p>{product.body.substring(1,100)}</p>
                    <p>{product.author}</p>
                </div>
            ))}
        </div>
    );
}

export default ProductPreview;