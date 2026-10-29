# Keycloak authentication and authorization setup

## Current local realm

The local Keycloak issuer is `http://localhost:8081/realms/pos`. The frontend uses the public OIDC client `pos-client` with standard authorization-code flow. The client is enabled, standard flow is enabled, and direct access grants are disabled. The realm has self-registration disabled, so staff accounts must be provisioned by an administrator.

The backend requires a signed access token from the `pos` issuer with audience `pos-client`. The local `pos-client` had no explicit audience mapper, so the resource server could reject an otherwise valid sign-in with HTTP 401. The local realm now has an access-token-only Audience mapper named `pos-api-audience`, configured with custom audience `pos-client`. This change lives in the running Keycloak database; it is not a realm import checked into this repository and must be applied separately to staging and production.

## Users and roles found

The `pos` realm currently has two enabled application users: `administrator` and `manager`. It does not have an application user named `admin`. The `admin/admin` credentials belong to the Keycloak administrator in the `master` realm and cannot be used to sign in to the POS `pos` realm.

The realm contains application roles `ADMIN`, `USER`, `Manager`, `manager`, `cashier`, `kitchen`, and `stock_clerk`, plus standard Keycloak roles. The application normalizes case, so `cashier`, `kitchen`, and `stock_clerk` map to `CASHIER`, `KITCHEN`, and `STOCK_CLERK`. Both `Manager` and `manager` normalize to `MANAGER`, but they are separate Keycloak roles and should be consolidated to one canonical `MANAGER` role.

The `administrator` account has `ADMIN`, `cashier`, `Manager`, and `USER` realm roles. The `manager` account has `Manager`. Both accounts also have powerful `realm-management` client roles, including `realm-admin` and user/client management permissions. POS staff should not have Keycloak realm-management roles. Use the `master` realm administrator only for Keycloak administration; keep application users limited to their POS roles.

## Role behavior in the application

The frontend now normalizes role names and maps the active operational roles to role-specific workspaces:

| Keycloak role | Default workspace | Access |
| --- | --- | --- |
| `ADMIN` | Admin dashboard | Full application administration |
| `MANAGER` | Admin dashboard | Operations, catalogue, reporting, finance, audit |
| `CASHIER` | POS checkout | Tables, orders, checkout, guest and shift workflows |
| `KITCHEN` | Kitchen display | Kitchen tickets only |
| `STOCK_CLERK` | Inventory | Product and inventory workflows |
| `USER` | No workspace | Base Keycloak role only |

The backend remains the authority for API access through Spring Security role checks. The frontend route and navigation permissions only improve the staff experience; they are not a security boundary.

## Changes required in staging and production

1. On `pos-client`, add an OIDC **Audience** protocol mapper. Set custom audience to `pos-client`, include it in access tokens, and leave it out of ID tokens. Keep the backend audience validator enabled.
2. Keep the client public with standard flow and PKCE `S256`; leave direct access grants disabled. Restrict redirect URIs and web origins to the exact HTTPS application origin. Remove `*` and development origins such as `localhost:3000`, `localhost:5173`, and `localhost:8080` from production.
3. Use one canonical uppercase role for each application role: `ADMIN`, `MANAGER`, `CASHIER`, `KITCHEN`, and `STOCK_CLERK`. Migrate users off the duplicate `Manager`/`manager` roles before removing the old roles.
4. Remove all `realm-management` client roles from application users. Keep only the minimum POS realm role each staff member needs; for example, a manager account should have `MANAGER`, and a cashier account should have `CASHIER`.
5. Provision individual staff accounts in the `pos` realm. Do not use the Keycloak master administrator account as a cashier login. Create cashier, kitchen, and stock-clerk accounts as needed; those users do not currently exist in the inspected realm.
6. Enable Keycloak brute-force protection and choose a lockout policy before production. It is disabled in the inspected local realm.

The local role and audience setup should be rechecked after signing into the POS with an actual `pos` realm user. No application-user password was available during this inspection, so the full browser login and authenticated API request have not yet been verified.
