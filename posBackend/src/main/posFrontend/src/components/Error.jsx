import {Link} from "react-router-dom";
import {ROUTES} from "../routes.js";

function Error() {

    return (

        <div className="h-screen bg-teal-800 bg-cover flex justify-evenly">
            <div className="pt-10 text-white">
                <p className=""> This page does not exists.</p>
                <p className="py-4">Click on the link below to get back home</p>
                <Link className=" px-4 py-2 flex justify-center  bg-slate-900 text-white rounded-full border border-white" to={ROUTES.HOME}>Home</Link>
            </div>
        </div>
    );
}

export default Error;