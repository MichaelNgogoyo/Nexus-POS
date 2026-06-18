// Lightweight RBAC helper: derive roles from Keycloak token and expose a can(permission) check.

import {useMemo} from "react";
import {useKeycloak} from "@react-keycloak/web";

const ROLE_PERMISSIONS = {
    admin: [
        "view_dashboard",
        "view_products",
        "edit_products",
        "manage_categories",
        "view_inventory",
        "adjust_stock",
        "view_sales",
        "checkout",
        "process_return",
        "view_reports",
        "manage_users",
    ],
    manager: [
        "view_dashboard",
        "view_products",
        "edit_products",
        "manage_categories",
        "view_inventory",
        "adjust_stock",
        "view_sales",
        "checkout",
        "process_return",
        "view_reports",
    ],
    cashier: [
        "view_products",
        "view_inventory",
        "view_sales",
        "checkout",
        "process_return",
    ],
    clerk: [
        "view_products",
        "view_inventory",
        "adjust_stock",
    ],
};

const ALL_PERMISSIONS = new Set(Object.values(ROLE_PERMISSIONS).flat());

function extractRoles(tokenParsed) {
    const roles = new Set();
    if (!tokenParsed) return roles;
    const realmRoles = tokenParsed.realm_access?.roles || [];
    realmRoles.forEach((r) => roles.add(r.toLowerCase()));
    const resourceAccess = tokenParsed.resource_access || {};
    Object.values(resourceAccess).forEach((client) => {
        (client?.roles || []).forEach((r) => roles.add(r.toLowerCase()));
    });
    return roles;
}

export function usePermissions() {
    const {keycloak} = useKeycloak();

    return useMemo(() => {
        const roles = extractRoles(keycloak?.tokenParsed);
        // Admin shortcut: if any role named admin is present, grant all permissions.
        const isAdmin = roles.has("admin");
        const permissionSet = new Set();

        if (isAdmin) {
            ALL_PERMISSIONS.forEach((p) => permissionSet.add(p));
        } else {
            roles.forEach((role) => {
                const perms = ROLE_PERMISSIONS[role];
                if (perms) {
                    perms.forEach((p) => permissionSet.add(p));
                }
            });
        }

        const can = (permission) => permissionSet.has(permission);

        return {
            roles: Array.from(roles),
            permissions: permissionSet,
            can,
        };
    }, [keycloak?.tokenParsed]);
}
