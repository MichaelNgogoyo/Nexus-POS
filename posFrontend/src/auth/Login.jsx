import {useEffect} from "react";
import {useKeycloak} from "@react-keycloak/web";

function Login() {
    const {keycloak, initialized} = useKeycloak();

    useEffect(() => {
        if (initialized && keycloak && !keycloak.authenticated) {
            keycloak.login({redirectUri: window.location.origin});
        }
    }, [initialized, keycloak]);

    if (!initialized) {
        return <p>Loading authentication...</p>;
    }

    if (keycloak?.authenticated) {
        return <p>You are already logged in.</p>;
    }

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
            <div className="card p-8 w-full max-w-md text-center">
                <h1 className="text-2xl font-bold text-text-primary mb-3">Sign in</h1>
                <p className="text-text-secondary mb-6">Redirecting you to secure login...</p>
                <button
                    onClick={() => keycloak.login({redirectUri: window.location.origin})}
                    className="btn-primary w-full"
                >
                    Continue to Login
                </button>
            </div>
        </div>
    );
}

export default Login;