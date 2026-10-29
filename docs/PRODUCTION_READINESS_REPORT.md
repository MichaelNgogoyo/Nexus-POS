# Production Readiness Report

**Assessment date:** 2026-10-30

**Repository:** Nexus-POS

**Branch:** `feature/hotel-pos-rebuild`
**Decision:** **NO-GO for production**

This report records the evidence gathered during the current implementation pass. It distinguishes code and automated-test evidence from live application behavior. A passing build does not certify production readiness.

## Executive assessment

The repository has a working React/Vite frontend, a Spring Boot backend, PostgreSQL migrations, Keycloak integration, and local Docker builds. The core deferred-cash order path has PostgreSQL integration coverage. A GitHub Actions CI workflow and Dependabot update schedule have been added. The branch's frontend lockfile was updated after the new CI audit found high-severity advisories in the pushed lockfile.

The project is **not production-ready**. The authenticated cashier journey has not completed in a browser; the local test Keycloak accounts still require first-login password changes. Electronic payments, refunds, hotel folio posting, branch isolation, a complete drawer movement ledger, restore rehearsal, and staging deployment remain unverified or unavailable. A previously committed third-party access token remains in Git history and must be revoked/rotated by its owner. No real transaction or production deployment was attempted.

## Requirement status

| Requirement | Status | Evidence / remaining work |
|---|---|---|
| Staff sign-in | **Partially implemented** | Keycloak is configured and local accounts were provisioned. Role mappings were read back from the realm. The browser did not complete an authenticated API journey; first-login password changes are pending. |
| Roles and permissions | **Partially implemented** | Endpoint-level role checks and authorization tests exist. A complete permission matrix, cross-branch/property scope, and API-wide privilege review remain incomplete. |
| Product/catalog management | **Implemented, not end-to-end verified** | Existing API-backed catalog and admin screens build. Manager product changes were not exercised through an authenticated browser. |
| Cashier order creation | **Verified at service/database test level** | PostgreSQL integration tests cover server-priced deferred orders, saved totals, stock movement, kitchen-ticket creation, and duplicate settlement safety. Authenticated browser acceptance remains blocked. |
| Dine-in/table lifecycle | **Partially implemented** | Table/order workflows exist; concurrency and full table occupancy lifecycle are not fully verified through concurrent HTTP requests or the browser. |
| Kitchen processing | **Implemented, not end-to-end verified** | Kitchen ticket/status paths and tests exist. Real browser handoff, reconnect/recovery, and station routing need staging verification. |
| Cash checkout and receipts | **Partially verified** | Cash amount validation, idempotent settlement, receipt retrieval, and service/database behavior have tests. Printer hardware and the cashier-to-receipt browser flow are unverified. |
| Card/M-Pesa payments | **Blocked** | No approved provider contract, sandbox credentials, or callback configuration is available. Electronic payment is not represented as successful. |
| Refunds and payment reversals | **Missing / blocked** | Provider-backed refund lifecycle, approvals, callback/reconciliation behavior, and a complete financial ledger are not implemented or testable without provider policy and access. |
| Hotel room/folio charges | **Blocked** | No PMS contract or sandbox exists. Room-charge posting remains disabled and must not be simulated. |
| Register shifts | **Partially implemented** | Opening/closing and expected cash from float plus cash sales exist. Cash-in/out/refund movement ledger and manager reconciliation workflow are missing. |
| Inventory and procurement | **Partially implemented** | Purchase-order receiving, stock movements, and one-time receiving are covered by PostgreSQL tests. Recipes, unit conversions, complete consumption/waste policy, partial receiving, and inventory reconciliation remain open. |
| Reporting | **Partially implemented** | Database-backed report APIs exist. Business totals still need comparison against controlled transactions through the actual UI and live deployment configuration. |
| Audit trail | **Partially implemented** | Sensitive workflows have audit events and tests. Coverage is not complete for all financial, role, settings, inventory, and approval operations. |
| API contracts and errors | **Partially implemented** | Springdoc/OpenAPI and common API patterns exist. Endpoint-by-endpoint auth/validation/pagination documentation and compatibility review remain incomplete. |
| Responsive POS UI | **Implemented, not end-to-end verified** | React production build passes and the cashier UI was observed rendering. API requests previously returned 401, so a real signed-in order cannot yet be certified. |
| Automated frontend tests | **Verified** | 8 frontend tests passed; lint passed with 14 existing warnings; production build passed. |
| Automated backend tests | **Verified locally and in GitHub CI** | `CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173 JAVA_HOME=... ./mvnw -B -Dfrontend.skip=true verify` passed: 84 tests, 0 failures/errors/skips, including disposable PostgreSQL integration tests. GitHub run `40954617597` passed the backend and frontend jobs; its image-build job was queued at report time. |
| Dependency audit | **Verified for current frontend lockfile** | `npm audit --audit-level=high` reports 0 vulnerabilities after updating the lockfile. The previous pushed lockfile had 17 high and 7 lower-severity advisories; it has been replaced. Backend dependency and container CVE scans remain to be added. |
| Docker image builds | **Verified locally** | Frontend and backend images built successfully. The backend image compile emitted existing Lombok builder warnings. Images were not deployed or run as a production stack. |
| Production Compose configuration | **Partially verified** | Compose syntax was parsed with placeholder environment values. Actual hostnames, credentials, TLS, volumes, and service readiness are not verified. |
| CI/CD | **Partially implemented** | CI and weekly Dependabot workflows are pushed. The deployment workflow remains separate and production deployment is not authorized; the corrected CI run is pending. |
| Backup and recovery | **Missing verification** | No restore rehearsal or rollback/forward-recovery drill has been performed. |
| Staging or production deployment | **Not performed** | No staging credentials/infrastructure were verified. Production deployment requires explicit approval and a reviewed migration/backup plan. |

## Checks run

| Check | Result |
|---|---|
| Backend Maven suite on Java 21 | Previously passed: 84 tests, 0 failures/errors/skips. The new CI run first failed because `CORS_ALLOWED_ORIGINS` was unset in the integration-test environment; the workflow now sets `http://127.0.0.1:5173` only for tests. The rerun is pending at report time. |
| Frontend `npm test` | Passed: 8 tests. |
| Frontend `npm run lint` | Passed: 0 errors, 14 existing warnings. |
| Frontend production build | Passed. |
| Frontend `npm audit --audit-level=high` | Passed: 0 vulnerabilities in the current lockfile. |
| Frontend Docker image build | Passed locally. |
| Backend Docker image build | Passed locally; Java compilation emitted existing Lombok `@Builder` warnings. |
| Production Compose syntax | Passed with dummy placeholder values; this does not validate real deployment settings. |
| Local service probes | Frontend, backend actuator health, local Keycloak realm discovery, and MinIO readiness each returned HTTP 200 in this pass. |
| Browser POS workflow | Not passed: the browser API session had HTTP 401; no order/payment/receipt was created in that attempt. |
| Security scans | Frontend npm audit only. A secret-scanning binary and backend/container vulnerability scanner were not available in the environment. The committed token noted below is a known finding, not a clean scan result. |

## Critical and high risks

1. **Credential exposure in Git history — Critical.** A third-party Unsplash access token was committed in repository history. Revoke/rotate it in the provider console and remove the active configuration value. History rewriting is not included here because it changes shared Git history; approve that separately if historical purge is required. The token value is intentionally omitted from this report.
2. **Browser authentication still unverified — Critical.** Do not rely on the POS for live service until a cashier signs in and completes a real test order through the frontend and backend. Local provisioned accounts require first-login password changes.
3. **Financial workflows incomplete — Critical.** Cash is the only verified payment method. Electronic payment, provider callbacks, refunds, split tenders, and reconciliation of uncertain provider outcomes remain unavailable.
4. **Tenant/branch isolation absent — High.** The current data model and repositories are single-property and do not establish restaurant/branch ownership boundaries.
5. **Register reconciliation incomplete — High.** The drawer expected-balance calculation does not account for a durable cash-in/out/refund ledger or manager review.
6. **External hotel and operations integrations unavailable — High.** PMS/folio, payment provider, receipt hardware, and any required electronic invoicing have not been configured or tested.
7. **Deployment recovery is unproven — High.** No real-environment migration rehearsal, backup restore, rollback/forward recovery, TLS verification, monitoring, or post-deploy smoke test has been performed.
8. **Other operational credentials need owner review — High.** Review MinIO, Keycloak bootstrap/admin, database, and JWT signing configuration before deployment. Use unique secrets from a secret manager; do not reuse development defaults.

## Release gates

1. Complete the first-login password change for local test users, then verify a cashier token's audience/roles and complete sign-in → open shift → create order → kitchen → cash settlement → receipt → report in a browser.
2. Complete API-wide authorization and restaurant/branch scoping before supporting multiple properties or branches.
3. Define and implement cash movement, refund, discount, and manager-approval policies with tests.
4. Obtain payment/PMS sandbox access and verify their pending, failure, duplicate callback, reconciliation, and reversal paths; keep unsupported methods disabled.
5. Revoke the exposed third-party token, remove it from active config, and decide whether shared-history purge is required.
6. Add backend dependency and image CVE scans; resolve or explicitly accept findings.
7. Rehearse Flyway against a production-like database copy, then test backup restoration and recovery procedures.
8. Verify real deployment variables, CORS, Keycloak redirect/issuer settings, TLS, MinIO policy, health checks, logs, and monitoring in staging.
9. Require explicit owner approval before production deployment or real financial operations.

**Final recommendation:** keep this branch in review/testing. Do not represent the system as production-ready until the critical release gates above are passed with recorded evidence.
