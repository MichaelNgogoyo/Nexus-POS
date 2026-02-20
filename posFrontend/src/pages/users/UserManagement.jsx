import {useMemo, useState} from "react";
import {useKeycloak} from "@react-keycloak/web";
import {AdminPanelSettings, PointOfSale, Warehouse, SupervisorAccount, AccountBalance, Visibility} from "@mui/icons-material";

const ROLES = [
    {
        key: "Admin",
        icon: AdminPanelSettings,
        permissions: ["Full access", "User provisioning", "System configuration"]
    },
    {
        key: "Cashier",
        icon: PointOfSale,
        permissions: ["Checkout", "Transactions", "Receipt printing"]
    },
    {
        key: "Inventory Manager",
        icon: Warehouse,
        permissions: ["Stock adjustments", "Product updates", "Low stock management"]
    },
    {
        key: "Supervisor",
        icon: SupervisorAccount,
        permissions: ["Refund approvals", "Void approvals", "Shift oversight"]
    },
    {
        key: "Accountant",
        icon: AccountBalance,
        permissions: ["Financial reports", "Revenue reconciliation", "Tax checks"]
    },
    {
        key: "Auditor",
        icon: Visibility,
        permissions: ["Read-only reporting", "Activity review", "Compliance checks"]
    }
];

function UserManagement() {
    const {keycloak} = useKeycloak();
    const [selectedRole, setSelectedRole] = useState("Admin");

    const currentUser = useMemo(() => ({
        username: keycloak?.tokenParsed?.preferred_username || "current-user",
        email: keycloak?.tokenParsed?.email || "Not available",
    }), [keycloak]);

    const selectedPermissions = useMemo(() => {
        return ROLES.find((role) => role.key === selectedRole)?.permissions || [];
    }, [selectedRole]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-text-primary">User Management</h1>
                <p className="text-text-secondary mt-1">Define access policies and role responsibilities for your POS team.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="card p-4 lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Role Matrix</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ROLES.map((role) => {
                            const Icon = role.icon;
                            const isActive = selectedRole === role.key;
                            return (
                                <button
                                    key={role.key}
                                    onClick={() => setSelectedRole(role.key)}
                                    className={`text-left rounded-xl border p-4 transition-all duration-250 ${isActive ? 'border-brand-primary bg-brand-primary/10' : 'border-border-primary bg-bg-secondary hover:bg-bg-tertiary'}`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Icon className="text-brand-primary"/>
                                        <h3 className="font-semibold text-text-primary">{role.key}</h3>
                                    </div>
                                    <p className="text-sm text-text-secondary">{role.permissions.length} core permissions</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="card p-4">
                    <h2 className="text-xl font-semibold mb-4">Selected Role</h2>
                    <p className="text-lg font-bold text-brand-primary mb-3">{selectedRole}</p>
                    <ul className="space-y-2">
                        {selectedPermissions.map((permission) => (
                            <li key={permission} className="text-sm text-text-secondary bg-bg-tertiary border border-border-primary rounded-lg px-3 py-2">
                                {permission}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="card p-4">
                <h2 className="text-xl font-semibold mb-4">Current Session User</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-bg-tertiary border border-border-primary rounded-lg p-3">
                        <p className="text-text-muted">Username</p>
                        <p className="font-semibold text-text-primary">{currentUser.username}</p>
                    </div>
                    <div className="bg-bg-tertiary border border-border-primary rounded-lg p-3">
                        <p className="text-text-muted">Email</p>
                        <p className="font-semibold text-text-primary">{currentUser.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserManagement;
