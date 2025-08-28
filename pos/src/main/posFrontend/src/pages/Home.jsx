import {useState} from "react";
import BlogPreview from "../components/BlogPreview.jsx";

const Home = () => {



    //use state for blogs
    const [blogs] = useState([
        {title: 'Blog 1', body: 'This is the initial blog', author: 'michael', id: 1},
        {title: 'Blog 2', body: 'This is the second blog', author: 'michael', id: 2},
        {title: 'Blog 3', body: 'This is the third blog', author: 'michael', id: 3}
    ]);




    return (
        <div className="home">
                <BlogPreview blogs={blogs}/>
        </div>
    );
}

export default Home;