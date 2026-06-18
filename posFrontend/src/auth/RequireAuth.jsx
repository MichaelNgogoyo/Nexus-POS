import {useKeycloak} from "@react-keycloak/web";
import {useEffect} from "react";
import {usePermissions} from "./permissions";

function RequireAuth({children, requiredPermission}) {
    const {keycloak, initialized} = useKeycloak();
    const {can} = usePermissions();

    useEffect(() => {
        if (initialized && keycloak && !keycloak.authenticated) {
            keycloak.login({redirectUri: window.location.href});
        }
    }, [initialized, keycloak]);

    if (!initialized || keycloak?.authenticated === undefined) {
        return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-text-secondary">Loading…</p></div>;
    }

    if (!keycloak.authenticated) {
        return null;
    }

    if (requiredPermission && !can(requiredPermission)) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6 text-center">
                <div className="space-y-2">
                    <p className="text-lg font-semibold text-text-primary">Access denied</p>
                    <p className="text-sm text-text-secondary">You don&apos;t have permission to view this section.</p>
                </div>
            </div>
        );
    }

    return children;
}

export default RequireAuth;
