const BlogPreview = (props) => {

    const blogs = props.blogs;
    return (
        <div className=" rounded-lg">
            {blogs.map ((blog)=> (
                <div className="blog-preview flex border-gray-200 hover:border-gray-300 flex-col gap-2 p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300" key={blog.id}>
                    <h2 className="font-bold text-cyan-600 text-2xl"><span>{blog.id}. </span>{blog.title}</h2>
                    <p>{blog.body.substring(1,100)}</p>
                    <p>{blog.author}</p>
                </div>
                ))}
        </div>
    );
}

export default BlogPreview;