import {useKeycloak} from "@react-keycloak/web";
import {Navigate, useLocation} from "react-router-dom";
import {usePermissions} from "./permissions";
import {ROUTES} from "../routes.js";

function RequireAuth({children, requiredPermission, requiredAnyPermissions = []}) {
    const {keycloak, initialized} = useKeycloak();
    const {can} = usePermissions();
    const location = useLocation();

    if (!initialized || keycloak?.authenticated === undefined) {
        return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-text-secondary">Loading…</p></div>;
    }

    if (!keycloak.authenticated) {
        return <Navigate to={ROUTES.LOGIN} state={{from: location}} replace />;
    }

    const hasSinglePermission = !requiredPermission || can(requiredPermission);
    const hasAnyPermission = requiredAnyPermissions.length === 0 || requiredAnyPermissions.some(can);
    if (!hasSinglePermission || !hasAnyPermission) {
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
