import {useState} from "react";
import {useKeycloak} from "@react-keycloak/web";
import {Navigate, useLocation} from "react-router-dom";
import {ROUTES} from "../routes.js";

function Login() {
    const {keycloak, initialized} = useKeycloak();
    const location = useLocation();
    const [loginError, setLoginError] = useState('');

    const beginLogin = async () => {
        setLoginError('');
        const requested = location.state?.from;
        const target = requested
            ? `${requested.pathname || ''}${requested.search || ''}${requested.hash || ''}`
            : '/';
        const redirectUri = new URL(target, window.location.origin).toString();
        try {
            await keycloak.login({redirectUri});
        } catch {
            setLoginError('Could not start secure sign-in. Check that Keycloak is running and try again.');
        }
    };

    if (!initialized) {
        return <p>Loading authentication...</p>;
    }

    if (keycloak?.authenticated) {
        return <Navigate to={ROUTES.HOME} replace />;
    }

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
            <div className="card p-8 w-full max-w-md text-center">
                <h1 className="text-2xl font-bold text-text-primary mb-3">Sign in</h1>
                <p className="text-text-secondary mb-6">Sign in with your restaurant staff account.</p>
                {loginError && <p role="alert" className="mb-4 text-sm text-red-600">{loginError}</p>}
                <button
                    onClick={beginLogin}
                    disabled={!initialized || !keycloak}
                    className="btn-primary w-full"
                >
                    Continue to Keycloak sign-in
                </button>
            </div>
        </div>
    );
}

export default Login;
