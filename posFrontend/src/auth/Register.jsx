import {useEffect} from 'react';
import {Link} from "react-router-dom";
import {ROUTES} from "../routes.js";
import {useKeycloak} from "@react-keycloak/web";

function Register() {
    const {keycloak, initialized} = useKeycloak();

    useEffect(() => {
        if (initialized && keycloak && !keycloak.authenticated) {
            keycloak.register({redirectUri: window.location.origin});
        }
    }, [initialized, keycloak]);

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
            <div className="card p-8 w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-3 text-text-primary">Create account</h2>
                <p className="text-text-secondary mb-6">Redirecting you to secure registration...</p>

                <button
                    onClick={() => keycloak.register({redirectUri: window.location.origin})}
                    className="btn-primary w-full"
                >
                    Continue to Registration
                </button>

                <div className="mt-5 text-sm text-text-secondary">
                    Already have an account? <Link className="text-brand-primary font-semibold" to={ROUTES.LOGIN}>Log in</Link>
                </div>
            </div>
        </div>
    );
}

export default Register;
