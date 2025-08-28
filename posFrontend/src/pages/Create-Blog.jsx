import {useState} from "react";

function CreateBlog() {

    const[title, setTitle] = useState();

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6 text-center text-blue-900">Create a Blog</h2>

                <form className="flex flex-col gap-4 text-blue-950 font-medium">
                    <div>
                        <label className="block mb-1">Enter Title:</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                            placeholder="Enter blog title..."
                        />
                    </div>

                    <div>
                        <label className="block mb-1">Enter Blog Text:</label>
                        <textarea
                            required
                            rows="5"
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
                            placeholder="Write your blog content here..."
                        />
                    </div>

                    <div>
                        <label className="block mb-1">Author:</label>
                        <select
                            required
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        >
                            <option value="">-- Select author --</option>
                            <option value="michael">Michael</option>
                            <option value="ngogoyo">Ngogoyo</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="mt-2 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-semibold"
                    >
                        Add Blog
                    </button>
                </form>

                {title && (
                    <p className="mt-6 text-center text-gray-600">
                        Preview Title: <span className="font-semibold">{title}</span>
                    </p>
                )}
            </div>
        </div>
    )
}

export default CreateBlog;