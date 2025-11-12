const BlogPreview = (props) => {

    const blogs = props.blogs;
    return (
        <div className="rounded-lg bg-bg-secondary p-4">
            {blogs.map ((blog)=> (
                <div className="card flex flex-col gap-3 p-5 mb-4 hover:shadow-lg hover:scale-[1.01] cursor-pointer group" key={blog.id}>
                    <h2 className="font-bold text-brand-primary text-2xl group-hover:text-brand-hover transition-colors duration-250">
                        <span className="text-text-muted">{blog.id}. </span>
                        {blog.title}
                    </h2>
                    <p className="text-text-secondary leading-relaxed">{blog.body.substring(1,100)}...</p>
                    <p className="text-text-muted text-sm font-medium">By {blog.author}</p>
                </div>
                ))}
        </div>
    );
}

export default BlogPreview;