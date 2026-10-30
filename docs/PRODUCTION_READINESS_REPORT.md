# Production Readiness Report

**Assessment date:** 2026-10-30

**Repository:** Nexus-POS

**Branch:** `feature/hotel-pos-rebuild`

**Application revision assessed:** `a66c4f0`
**Decision:** **NO-GO for production**

This report records the evidence gathered during the current implementation pass. It distinguishes code and automated-test evidence from live application behavior. A passing build does not certify production readiness.

## Executive assessment

The repository has a working React/Vite frontend, a Spring Boot backend, PostgreSQL migrations, Keycloak integration, and local Docker builds. The core deferred-cash order path has PostgreSQL integration coverage. A GitHub Actions CI workflow and Dependabot update schedule have been added. The branch's frontend lockfile was updated after the new CI audit found high-severity advisories in the pushed lockfile.

The project is **not production-ready**. A local test cashier completed Keycloak authorization-code/PKCE authentication and API role checks, but a fresh browser sign-in and complete order-to-receipt journey remain unverified. Cash movement recording and cash refund accounting are implemented locally with tests, but not yet deployed or acceptance-tested in a browser. Electronic payments, hotel folio posting, branch isolation, restore rehearsal, and staging deployment remain unverified or unavailable. A previously committed third-party access token remains in Git history and must be revoked/rotated by its owner. No real transaction or production deployment was attempted.

## Requirement status

| Requirement | Status | Evidence / remaining work |
|---|---|---|
| Staff sign-in | **Partially verified** | Local cashier `nexus-test-cashier-20261029` completed Keycloak authorization-code/PKCE authentication; token audience `pos-client` and realm role `CASHIER` were verified. `GET /api/product` returned 200 (962 rows) and a manager-only low-stock endpoint returned 403 after the exception mapping fix. A clean browser login and complete cashier transaction journey remain unverified because the opened browser tab reused an existing signed-in session. |
| Roles and permissions | **Partially implemented** | Endpoint-level role checks and authorization tests exist. A complete permission matrix, cross-branch/property scope, and API-wide privilege review remain incomplete. |
| Product/catalog management | **Implemented, not end-to-end verified** | Existing API-backed catalog and admin screens build. Manager product changes were not exercised through an authenticated browser. |
| Cashier order creation | **Verified at service/database test level** | PostgreSQL integration tests cover server-priced deferred orders, saved totals, stock movement, kitchen-ticket creation, and duplicate settlement safety. Authenticated browser acceptance remains blocked. |
| Dine-in/table lifecycle | **Partially implemented** | Table/order workflows exist; concurrency and full table occupancy lifecycle are not fully verified through concurrent HTTP requests or the browser. |
| Kitchen processing | **Implemented, not end-to-end verified** | Kitchen ticket/status paths and tests exist. Real browser handoff, reconnect/recovery, and station routing need staging verification. |
| Cash checkout and receipts | **Partially verified** | Cash amount validation, idempotent settlement, receipt retrieval, and service/database behavior have tests. Printer hardware and the cashier-to-receipt browser flow are unverified. |
| Card/M-Pesa payments | **Blocked** | No approved provider contract, sandbox credentials, or callback configuration is available. Electronic payment is not represented as successful. |
| Refunds and payment reversals | **Partially implemented / blocked** | Full cash-sale return requires a reason and an open shift; cash outflow, returned sale status, and stock restoration commit together and are covered by tests. Non-cash refunds return 503 until a provider integration exists. Partial refunds and approval policy remain unsupported. |
| Hotel room/folio charges | **Blocked** | No PMS contract or sandbox exists. Room-charge posting remains disabled and must not be simulated. |
| Register shifts | **Partially implemented** | Cash payments are linked to an open cashier shift. The ledger records idempotent cash-in/out adjustments and cash refunds; expected cash includes these movements. Managers can record cash-in/out in the shift UI; role checks, movement history, and reconciliation arithmetic have tests. Browser acceptance, manager review/approval, and branch scope remain incomplete. The migration's unique-open-shift index must be preflighted against any existing duplicate open shifts before deployment. |
| Inventory and procurement | **Partially implemented** | Purchase-order receiving, stock movements, and one-time receiving are covered by PostgreSQL tests. Recipes, unit conversions, complete consumption/waste policy, partial receiving, and inventory reconciliation remain open. |
| Reporting | **Partially implemented** | Database-backed report APIs exist. Business totals still need comparison against controlled transactions through the actual UI and live deployment configuration. |
| Audit trail | **Partially implemented** | Sensitive workflows have audit events and tests. Coverage is not complete for all financial, role, settings, inventory, and approval operations. |
| API contracts and errors | **Partially implemented** | Springdoc/OpenAPI and common API patterns exist. Endpoint-by-endpoint auth/validation/pagination documentation and compatibility review remain incomplete. |
| Responsive POS UI | **Implemented, not end-to-end verified** | React production build passes and the cashier UI was observed rendering. API requests previously returned 401, so a real signed-in order cannot yet be certified. |
| Automated frontend tests | **Verified** | 8 frontend tests passed; lint passed with 14 existing warnings; production build passed. |
| Automated backend tests | **Verified locally and in GitHub CI** | The latest full `verify` passed 94 tests, 0 failures/errors/skips, including disposable PostgreSQL migration/integration tests. GitHub Actions run [41016446324](https://github.com/MichaelNgogoyo/Nexus-POS/actions/runs/41016446324) passed backend verification. |
| Dependency audit | **Verified for current frontend lockfile** | `npm audit --audit-level=high` reports 0 vulnerabilities after updating the lockfile. The previous pushed lockfile had 17 high and 7 lower-severity advisories; it has been replaced. Backend dependency and container CVE scans remain to be added. |
| Docker image builds | **Verified locally** | Frontend and backend images built successfully. The backend image compile emitted existing Lombok builder warnings. Images were not deployed or run as a production stack. |
| Production Compose configuration | **Partially verified** | Compose syntax was parsed with placeholder environment values. Actual hostnames, credentials, TLS, volumes, and service readiness are not verified. |
| CI/CD | **Partially implemented** | GitHub Actions run [41016446324](https://github.com/MichaelNgogoyo/Nexus-POS/actions/runs/41016446324) passed frontend tests/lint/audit/build, backend verification, and both deployable image builds. No staging or production deployment has been performed; deployment configuration and recovery still require environment verification. |
| Backup and recovery | **Missing verification** | No restore rehearsal or rollback/forward-recovery drill has been performed. |
| Staging or production deployment | **Not performed** | No staging credentials/infrastructure were verified. Production deployment requires explicit approval and a reviewed migration/backup plan. |

## Checks run

| Check | Result |
|---|---|
| Backend Maven suite on Java 21 | The earlier baseline ran 84 tests, 0 failures/errors/skips. The latest expanded run and the CI status are recorded in the cash-ledger follow-up below. The test workflow sets `CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173` for integration tests. |
| Frontend `npm test` | Passed: 8 tests. |
| Frontend `npm run lint` | Passed: 0 errors, 14 existing warnings. |
| Frontend production build | Passed. |
| Frontend `npm audit --audit-level=high` | Passed: 0 vulnerabilities in the current lockfile. |
| Frontend Docker image build | Passed locally. |
| Backend Docker image build | Passed locally; Java compilation emitted existing Lombok `@Builder` warnings. |
| Production Compose syntax | Passed with dummy placeholder values; this does not validate real deployment settings. |
| Local service probes | Frontend, backend actuator health, local Keycloak realm discovery, and MinIO readiness each returned HTTP 200 in this pass. |
| Browser POS workflow | **Partially checked**: the shift page displayed the no-open-shift empty state without an unexpected 404 toast or console error. The browser reused an existing administrator session; cashier sign-in and the full order/payment/receipt journey were not verified. No shift, order, payment, or receipt was created in this check. |
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

1. Use the local test cashier credentials from the secure local credential file, verify a clean browser sign-in, then complete sign-in → open shift → create order → kitchen → cash settlement → receipt → report in a browser. The protocol-level token and authorization checks now pass, but the UI workflow remains open.
2. Complete API-wide authorization and restaurant/branch scoping before supporting multiple properties or branches.
3. Validate cash-in/out and cash refund workflows in a clean manager/cashier browser session; define manager approval and discount policy. Cash movement APIs/UI and cash refund accounting now have automated coverage, but have not had browser acceptance.
4. Obtain payment/PMS sandbox access and verify their pending, failure, duplicate callback, reconciliation, and reversal paths; keep unsupported methods disabled.
5. Revoke the exposed third-party token, remove it from active config, and decide whether shared-history purge is required.
6. Add backend dependency and image CVE scans; resolve or explicitly accept findings.
7. Rehearse Flyway against a production-like database copy, then test backup restoration and recovery procedures.
8. Verify real deployment variables, CORS, Keycloak redirect/issuer settings, TLS, MinIO policy, health checks, logs, and monitoring in staging.
9. Require explicit owner approval before production deployment or real financial operations.

**Final recommendation:** keep this branch in review/testing. Do not represent the system as production-ready until the critical release gates above are passed with recorded evidence.

## Follow-up verification — 2026-10-30

- Reset the local-only cashier account's required first-login password and cleared its `UPDATE_PASSWORD` action. The username, test password, and role are stored outside the repository in `/home/apperstar/.local/share/nexus-pos/keycloak-cashier-reset-20261030T062026Z.txt` with owner-only permissions. Do not reuse this test account or password outside the local environment.
- Completed an isolated Keycloak authorization-code/PKCE exchange. Verified the resulting token identifies `nexus-test-cashier-20261029`, includes audience `pos-client`, and carries realm role `CASHIER`.
- Exercised authenticated APIs with that cashier token: `GET /api/product` returned HTTP 200; a manager-only low-stock endpoint returned HTTP 500 before the fix and HTTP 403 after it.
- Fixed `GlobalExceptionHandler` to map Spring Security `AccessDeniedException` to HTTP 403 rather than the generic 500 response. Added the real exception advice to `ProductControllerAuthorizationTest`; all four focused tests passed.
- Full backend verification passed locally: `CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173 JAVA_HOME=/home/apperstar/.jdks/ms-21.0.11 PATH=/home/apperstar/.jdks/ms-21.0.11/bin:$PATH ./mvnw -B -Dfrontend.skip=true verify` — 84 tests, 0 failures, 0 errors, 0 skipped; disposable PostgreSQL integration tests ran successfully.
- The in-app browser already had an authenticated session. Opening a separate tab to `/login` redirected it to the existing admin dashboard, so this does not count as a fresh browser sign-in or complete POS acceptance journey.
- The current local catalog contains 962 products across generic retail categories. The repository's separate `seed/seed.js` utility explicitly generates Faker product names and categories such as electronics, clothing, and pharmacy. This is evidence of optional development/demo data, not a verified production catalog source. Do not run its `--clean` option against any persistent database.
- No payment, PMS, staging, production, backup/restore, branch-isolation, or historical-token revocation actions were performed.

## Cash ledger implementation — 2026-10-30

- Added a versioned `cash_movements` ledger and a nullable shift reference for sales. A partial unique index prevents multiple open shifts for one cashier; if a concurrent open request loses that race, the API now responds with HTTP 409 instead of a generic error. Before applying the migration to an existing database, check for duplicate open shifts and resolve them under the site's operational policy.
- Cash sale creation and cash order settlement require the cashier's open shift and persist its ID on the sale. Idempotent retries return the original sale without adding another shift cash sale.
- Managers can record cash-in and cash-out adjustments with a reason and idempotency key. The shift screen now provides manager-only controls, movement history, and expected-cash totals; cashiers can view their own movements.
- A full cash-sale refund requires a reason and open shift. The refund ledger entry, returned sale status, and stock restoration run in one transaction. Electronic refunds remain disabled until a provider integration is available.
- Backend `./mvnw -B -Dfrontend.skip=true verify`: 94 tests passed, 0 failures/errors/skips, including Testcontainers PostgreSQL and Flyway. A controller test covers the concurrent open-shift conflict response.
- Frontend `npm test`: 8 passed. `npm run lint`: 0 errors, 14 warnings. `npm run build`: passed. The frontend build writes generated bundles under `posBackend/src/main/resources/static`; those generated files are excluded from the source commit.
- The in-app browser showed the open-shift empty state with no unexpected 404 toast and no console errors. A fresh cashier session and the manager cash adjustment form have not been exercised in the browser; no financial or register records were changed.
- The cash-ledger changes were committed as `a66c4f0` and pushed to `feature/hotel-pos-rebuild`. GitHub Actions run [41016446324](https://github.com/MichaelNgogoyo/Nexus-POS/actions/runs/41016446324) passed all jobs, including both image builds. CI reported existing Lombok `@Builder` warnings; it did not report failures. The changes do not resolve provider/PMS access, multi-branch isolation, third-party token revocation, backup restore, or staging verification.
