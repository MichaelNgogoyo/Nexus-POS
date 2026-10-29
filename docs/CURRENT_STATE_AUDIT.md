# Current State Audit

**Audit date:** 2026-10-29
**Repository:** Nexus-POS
**Branch / HEAD:** `feature/hotel-pos-rebuild` / `ce60e16` (`fix: enforce sale and order foreign keys`)
**Scope:** Source, checked-in configuration, tests, deployment files, and current local changes. This is a code and test audit; it is not a staging or production certification.

## Executive summary

The repository is a React/Vite web POS backed by a Spring Boot modular monolith and PostgreSQL, with Keycloak JWT authentication and MinIO product-image storage. It also contains a separate JavaFX desktop client. The web project has working-looking screens and APIs for checkout, orders, kitchen tickets, tables, shifts, reservations, catalog, stock, procurement, reports, and audit history. Targeted unit and MVC tests pass, and the frontend builds.

The key distinction from the prior audit is that **immediate cash checkout currently creates a Sale, links a RestaurantOrder, and creates a kitchen ticket in one service transaction**. However, the cashier checkout still submits directly to payment. The distinct `/api/orders` path can save an open/unpaid order, but the cashier UI does not yet use it as a “send now, pay later” flow, and no payment endpoint was found that settles an existing open restaurant order. The live-service order-to-kitchen-to-later-cashier-payment-to-final-receipt workflow is therefore incomplete.

The application is **not production-ready**. External payment and hotel folio integrations are absent; database migration execution is manual/unverified; production Hibernate configuration currently enables schema updates; role and ownership coverage is incomplete; and no real-service end-to-end or deployment rehearsal has been performed in this audit.

## Repository and Git state

- Current branch is `feature/hotel-pos-rebuild`, at `557366e`; it matches `origin/feature/hotel-pos-rebuild` at audit time.
- The worktree already contains unrelated and previously made local changes, including environment/configuration files, same-origin API proxy changes, generated backend static assets, and `JavaRefresherCourse2024/`. These were preserved and excluded from the Phase Zero audit commit.
- `.env` files exist in the working tree. Their values were not read, copied, or included here. Tracked environment templates are present.
- No applicable repository `AGENTS.md` was found. The only discovered `AGENTS.md` is inside `posFrontend/node_modules/recharts` and does not govern project source changes.

## Technology and build setup

| Area | Observed implementation | Audit status |
|---|---|---|
| Frontend | React 19, Vite 7, JavaScript/JSX, Tailwind 3, MUI, TanStack Query, Axios, Keycloak JS | Present; production build verified |
| Backend | Java 17 target, Spring Boot 3.5, Spring MVC, Spring Security, JPA, Bean Validation, Springdoc | Present; Maven test suite verified |
| Database | PostgreSQL via JDBC/JPA; Hibernate schema validation in base config, development config uses `update` | Present; live database/migration compatibility not verified |
| Identity | Keycloak OIDC/JWT resource server; converter maps realm and client roles to Spring roles | Present; live realm/claim mapping not verified |
| Object storage | MinIO Java SDK and Compose service | Present; credentials/connectivity/policies not verified |
| Desktop | Separate JavaFX project with SQLite cache/sync concepts | Present; README and implementation indicate prototype-level scope; offline sale correctness not verified |
| Frontend tests | Node built-in test runner | 8 tests pass |
| Backend tests | JUnit, Mockito, MockMvc through Maven wrapper | 31 tests pass |
| CI/CD | `.github/workflows/deploy.yml` builds/publishes/deploys containers | Deployment workflow exists; it is not a verified PR test/security pipeline |
| Containers | Backend/frontend Dockerfiles, production Compose and Nginx | Present; deployment health and recovery not verified |
| External integrations | No configured payment provider, PMS/folio, eTIMS, or printer integration found | Missing or blocked by external setup |

## Architecture and modules

Backend source is organized under `com.pos` into `controller`, `service`, `repository`, `model`, `dto`, `dao`, and `config` packages. This is a modular monolith in deployment but not yet separated into domain-owned packages. Some controller methods still contain workflow and domain decisions (notably order validation/transitions), which should move behind application services as modules are improved.

Frontend source uses feature-oriented directories for `pos`, reports, finance, admin, products, inventory, reservations, tables, kitchen, orders, and shifts, alongside shared components/services/context. The React app is already the web frontend; the JavaFX application is a separate client and should not be treated as an interchangeable implementation.

## Existing functional capabilities

Status labels mean: **Verified** = covered by the Phase Zero commands below; **Implemented, not end-to-end verified** = source paths exist and unit tests may exist, but no service-backed user journey was run; **Partial** = important workflow or controls are missing; **Blocked** = requires external service/credentials not available in this repository audit; **Missing** = no implementation found.

| Feature | Evidence and current boundary | Status |
|---|---|---|
| Login/session | Keycloak browser integration, protected routes, Spring JWT validation and role extraction | Implemented, not end-to-end verified |
| Roles | Controllers use coarse Keycloak roles such as ADMIN, MANAGER, CASHIER, KITCHEN, STOCK_CLERK; no complete permission catalog or branch/tenant scope found | Partial |
| Touch cashier menu | Product/category/search, modifier selection, notes, table selection and cart; responsive styling exists | Implemented, not tablet usability verified |
| Save unpaid order | `/api/orders` creates an OPEN server-priced order; UI checkout does not submit this as its deferred-payment action | Partial |
| Immediate cash sale | `SalesService` validates cash, calculates totals, decrements stock, creates Sale, links RestaurantOrder, creates KitchenOrder, and audits in one transaction; idempotency is present | Implemented, unit verified; no database-backed flow verification |
| Later payment for existing order | No endpoint found to take payment against an already-open restaurant order; current modal pays from cart and creates the sale immediately | Missing |
| Kitchen workflow | Kitchen API and screen read persisted tickets; statuses advance and link back to restaurant order | Implemented, unit/MVC tested; no live browser-to-database journey |
| Tables | List/status APIs and selection exist; immediate cash sale checks available table under row lock and marks it occupied | Partial; table release/transfer/merge and concurrent restaurant workflows not fully verified |
| Receipts | Backend receipt endpoint reads persisted sale details; cashier ownership/manager access checks have tests; frontend can retrieve/print receipt after immediate payment | Implemented for completed sale; pre-bill and delayed-payment receipt flow missing |
| Payment methods | Backend accepts cash only; non-cash explicitly returns unavailable | Cash implemented; card/M-Pesa blocked |
| Refunds/voids | Manager-only sale return/void paths and stock restoration exist; not a provider refund ledger; partial returns unsupported | Partial |
| Room charge | Room-charge order types exist but order API rejects until PMS validation/posting is connected | Blocked; correctly disabled |
| Shifts | Open/current/close, expected cash, variance UI/API | Partial; cash movements and complete reconciliation controls absent |
| Catalog and modifiers | Product/category/image and modifier APIs; server validates modifier constraints and prices | Implemented, not full management flow/security verified |
| Inventory/procurement | Product stock, stock movement, suppliers, purchase orders, receiving and low-stock/report surfaces | Partial; recipe/ingredient ledger and exactly-once consumption absent |
| Reservations/customers | APIs and screens, reservation lifecycle validation/audit | Implemented in part; no PMS/stay integration |
| Reporting | API-backed dashboard/reports and audit UI | Implemented in part; source totals and scoped report access need broader verification |
| Notifications | Low-stock notification UI calls reports endpoint | Partial; alert delivery/retry/role behavior not verified |
| Offline mode | Desktop client has local persistence/queued sync concepts | Prototype; unsafe to claim reliable offline POS |

## Security and data-integrity findings

### High priority

1. **Production schema mutation:** `application-prod.yml` sets `spring.jpa.hibernate.ddl-auto: update`, overriding the base profile’s safer `validate` setting. The SQL files under `db/migration` are not executed by a configured Flyway/Liquibase dependency. Production schema changes therefore lack a verified migration runner/process. Change to reviewed versioned migrations and `validate` only after confirming deployment migration procedure.
2. **Authorization completeness:** method security and role guards exist, but roles are coarse; several route families allow cashiers broad reads/writes. Object ownership checks are evidenced for receipts, but not comprehensively for shifts, orders, guest data, branch scope, or all direct object IDs. A complete API authorization matrix and negative tests are required.
3. **Payment lifecycle gap:** no persisted payment-attempt/pending/failure/refund aggregate. The cash `Sales` row represents a completed payment; this cannot represent delayed checkout, provider uncertainty, callback reconciliation, or split payments safely.
4. **No real provider confirmation:** non-cash payments are rejected, which is safe; M-Pesa/card/folio behavior cannot be claimed until sandbox/provider contracts and callback verification are added.
5. **Secrets and MinIO:** production Compose injects MinIO root user/password into the backend. Use a restricted service account/policy for the application. Environment values were not inspected; no secret scan was run in this phase.

### Medium priority

- `SecurityConfig` uses stateless bearer JWT and disables CSRF. This is appropriate only while authentication remains bearer-token based and not cookie/session based; verify this invariant if auth changes.
- CORS is configurable. Local proxy changes are uncommitted; deployment/browser behavior needs staging verification after those changes are integrated.
- Error handling, upload bounds/content validation, rate limiting, log redaction, and Actuator exposure need a dedicated review.
- Financial persistence uses `double` in the `Sales` aggregate while restaurant order calculations use `BigDecimal`; standardize on decimal money columns and values through migrations.
- MinIO request failures can surface as server errors. Credentials, endpoint, bucket policy, and service user must be checked per environment.
- The standalone legacy cart endpoints and multiple checkout abstractions should be inventoried before removal; no endpoint is classified dead solely from source inspection.

## Database and migration state

JPA entities exist for products, categories, modifiers, restaurant orders/items, sales/items, kitchen tickets, tables, customers, reservations, shifts, stock movements, suppliers, purchase orders, expenses, users, and audit logs. Two PostgreSQL SQL migration files exist, including sale/order link fields. No Flyway or Liquibase runtime was found in `pom.xml`; deployment instructions currently apply SQL manually. Production database state was not inspected or changed.

Historical prices are stored in sale/order item records, but live schema constraints, indexes, foreign-key integrity, concurrent table/order behavior, and migration compatibility were not tested against an isolated PostgreSQL instance in this audit.

## Deployment and operations

- Production Compose includes PostgreSQL, Keycloak, MinIO, backend, and frontend; services have health checks and a private bridge network.
- Frontend Nginx proxies API paths to the backend. Local Vite proxy/same-origin browser API configuration is present as an uncommitted local change.
- Deployment GitHub Actions can build/publish/deploy selected parts of the stack. Its backend image build skips tests; no separate PR CI workflow with tests/security scans was found.
- The frontend/backend image tags and production secrets depend on repository/VPS configuration. No production deployment was run or requested.
- Backup restore, TLS routing, monitoring/alerts, rollback, container hardening, and full recovery procedure were not verified.

## Phase Zero verification run

Commands executed from the repository on 2026-10-29:

| Command | Result |
|---|---|
| `npm test` in `posFrontend/` | Passed: 8 tests, 0 failures |
| `npm run lint` in `posFrontend/` | Passed: 0 errors, 14 warnings |
| `npm run build -- --outDir /tmp/nexus-pos-audit-build --emptyOutDir` in `posFrontend/` | Passed: Vite production build completed |
| `JAVA_HOME=/home/apperstar/.jdks/ms-21.0.11 PATH=/home/apperstar/.jdks/ms-21.0.11/bin:$PATH ./mvnw -B -Dfrontend.skip=true test` in `posBackend/` | Passed: 31 tests, 0 failures/errors; Java 21 runtime targeting Java 17 |

These are unit/build results only. No PostgreSQL, Keycloak, MinIO, payment sandbox, PMS, browser E2E, Docker image scan, or deployed stack was exercised. The frontend lint warnings are pre-existing hook/Fast Refresh warnings; they remain cleanup work.

## Prioritized implementation backlog

1. **P0 — Complete cashier flow:** unpaid order creation and kitchen submission; retrieve the same order later; take cash against it exactly once; update order/payment/table state atomically; issue final paid receipt; preserve the touch-first UI and honest loading/error states.
2. **P0 — Extend PostgreSQL workflow verification:** the deferred cash order/payment slice, ticket linkage, and duplicate-settlement handling now run against isolated PostgreSQL; still verify table lifecycle, authenticated HTTP behavior, and migration compatibility.
3. **P0 — Authorization review:** sensitive low-stock and stock-movement reads now have cashier-denial/stock-clerk-allowance HTTP tests; continue mapping actual Keycloak roles to all operations, restrict object ownership, and cover kitchen, manager, and administrator paths.
4. **P1 — Migration safety:** add a repeatable migration mechanism/process, remove production `ddl-auto=update`, test an upgrade against an isolated database, and document backup/rollback or forward recovery.
5. **P1 — Financial integrity:** converge on `BigDecimal`/decimal database columns, persist payment states/attempts, define refund/void approvals and cash movement reconciliation.
6. **P1 — Role-specific/touch UX:** verify cashier tablet targets/accessibility, role landing routes, waiter table flows, and kitchen update behavior at realistic screen sizes.
7. **P1 — CI and security:** CI tests/builds, dependency/secret scans, endpoint inventory and OpenAPI permission docs, API error/log/upload review, provider callback tests when a provider exists.
8. **P2 — Integrations and operations:** payment sandbox, PMS folio contract, printer/e-invoicing scope; backup/restore drill, staging deployment, health/monitoring, repeatable installation and release report.
9. **Scope decision before expansion:** decide whether JavaFX offline use, multi-branch, delivery, recipes, loyalty, and specialized roles are launch requirements. Existing files alone do not establish these as working capabilities.

## Phase Zero conclusion

The audit confirms that the repository has a substantial working foundation and that the immediate cash-sale-to-kitchen link already exists. The critical next implementation is **deferred payment for an existing server-priced restaurant order**, alongside touch-first cashier controls and database-backed tests. This audit does not certify production readiness. No production system or existing business data was modified.

## Follow-up implementation and database audit (2026-10-29)

Since the Phase Zero snapshot, five implementation commits have been added on this branch:

- `8d5e39b` moved restaurant order rules out of the controller into an application service and introduced request/response DTOs.
- `b98bd6b` limits Keycloak client-role extraction to the configured POS client, protects idempotency replays from cross-cashier access and changed payloads, and validates/audits table status changes.
- `2ffa4bc` adds issuer, expiration, signature, and API-audience validation to JWT decoding. The default required audience is `pos-client`; Keycloak must be configured to issue it.
- `54ac60d` uses the existing pessimistic table-row lock when creating or transferring an open dine-in order, refuses an occupied table, marks its table occupied in the same transaction, and audits table-state changes.
- `ce60e16` models both sides of the sale/order link as JPA associations with explicit foreign keys, preventing orphaned links when Hibernate manages the schema.

The backend suite now passes **43 tests** with `./mvnw -B -Dfrontend.skip=true test` on Java 21 (the project compiles for Java 17). The table-order test was rerun after the final audit-log adjustment: `./mvnw -B -Dfrontend.skip=true -Dtest=OrderControllerSecurityTest test` passed 9 tests. These are unit/MVC tests, not a complete authenticated browser-to-database journey. Frontend checks from Phase Zero were not rerun because these follow-up changes are backend-only.

I inspected the running local Docker PostgreSQL database. It is `pos_db` / `public`, and it contains both POS tables and Keycloak tables such as `user_entity`, `client`, and `realm`; this is evidence about the local container only, not production. The observed `sales.subtotal_amount` column exists there. Order money columns use PostgreSQL `numeric`, while `product.price`, `sale_item.price`, and sale totals/tender fields use `double precision`. The initial read-only schema check found no foreign keys for `sales.restaurant_order_id` or `restaurant_orders.sale_id`, although the checked-in SQL migration intends to add them. Read-only checks found zero orphan references and zero reciprocal-link mismatches. After the JPA associations were added, the already-running development backend hot-reloaded and Hibernate `ddl-auto:update` added those two foreign keys to local `pos_db`; no SQL was run directly against that database and no rows changed. The API health check returned HTTP 200 afterward. Production was not inspected or changed.

The migration audit remains a blocker: the repository has two SQL migration files but no Flyway or Liquibase runtime dependency in `pom.xml`, so Spring Boot does not automatically execute them. The local working configuration currently sets Hibernate `ddl-auto: update` in development and production; those config files already had unrelated local changes and were preserved. The local POS and Keycloak tables sharing the `public` schema also means a naive Flyway `baseline-on-migrate` setup could mark an empty POS schema as already baselined. Before enabling a migration runner, separate POS schema detection from Keycloak objects and provide a complete baseline migration for fresh installations.

Phase Two is **partially implemented, not signed off**. Audience validation now fails closed in code, but a real Keycloak token with the configured audience has not been exercised. The complete permission matrix, role-specific API tests, and restaurant/branch-level data isolation remain unfinished. There is no restaurant or branch ownership model in the current entities.

Phase Three has started with two data-integrity fixes: a dine-in table is now locked and occupied atomically with open-order creation, and a competing order receives HTTP 409; JPA now models the sale/order links as foreign keys. The schema update was verified in a disposable PostgreSQL 16 container by importing a schema-only copy, removing those two constraints in the disposable database, starting Spring Boot with `ddl-auto:update`, and confirming Hibernate restored them. The test container was removed. A unit test confirms the service uses the pessimistic-lock repository method, but real concurrent requests against PostgreSQL have not been tested. Migration automation, a repeatable isolated PostgreSQL test suite, monetary type conversion, and multi-restaurant/branch schema work remain open. No production database was accessed or changed; the local development database gained only the two Hibernate-managed foreign-key constraints described above.

## Deferred cashier payment implementation (2026-10-29)

The core cashier journey now has a deferred-payment path in the working tree:

- The checkout offers **Send to kitchen · pay later** as the primary action and retains the existing immediate cash checkout as a secondary option.
- `POST /api/orders/submit` creates a priced order and submits it to the kitchen in one transaction. Replaying the same order key returns the existing order rather than consuming stock or creating another kitchen ticket.
- Submitting the order locks its product rows, validates current availability and stock, decrements stock once, and records stock movements. Settlement does not decrement stock again. Cancellation after kitchen submission currently leaves that stock consumption in place; it treats the product as committed to preparation, and needs a waste/return policy before broader inventory rollout.
- The Orders board exposes **Record cash payment** for unpaid orders after kitchen submission. `POST /api/orders/{id}/payment` locks the order, verifies persisted item/tax/service/discount totals, accepts only sufficient cash tender, writes a linked sale using saved order prices, updates the order to `PAID`, and audits the change.
- Payment requests use an idempotency key. Replays are limited to the same cashier, order, method and tender amount; conflicting keys or already-paid orders return HTTP 409. The existing sale receipt endpoint is reused after settlement.
- The UI shows payment errors and change, provides quick cash amounts, and offers receipt loading/printing after payment. Non-cash payment, split tender, refunds, and hotel room posting remain unimplemented.

Verification after this change:

| Command | Result |
|---|---|
| `./mvnw -B -Dfrontend.skip=true test` in `posBackend/` using Java 21 | Passed: 50 tests, 0 failures/errors; compiles to Java 17 |
| `npm test` in `posFrontend/` | Passed: 8 tests, 0 failures |
| `npm run lint` in `posFrontend/` | Passed: 0 errors, 14 existing warnings |
| `npm run build` in `posFrontend/` | Passed: Vite production build |
| `git diff --check` | Passed |

These tests do not exercise authenticated browser-to-PostgreSQL behavior or concurrent HTTP requests. The new repository lock/query behavior, transaction rollback, Keycloak roles, and receipt printing still require an isolated PostgreSQL/Keycloak-backed integration or staging check. The local development database was not started, migrated, or changed during this implementation. Production was not accessed. This closes the missing deferred-cash code path at unit/build level; it does **not** certify the complete POS or production readiness.

## Deferred cashier PostgreSQL verification follow-up (2026-10-29)

The deferred-payment service workflow is now exercised against a disposable PostgreSQL 16 Testcontainers instance. The test uses a fresh `create-drop` schema and test-only configuration; it does not connect to or modify the running development `pos-postgres` container.

- Submitting an unpaid takeaway order persists the server-calculated total, creates the kitchen ticket, reduces product stock once, and records one stock movement.
- Two simultaneous cash settlement calls with the same idempotency key return the same sale. PostgreSQL contains one sale, the order is `PAID` and linked to that sale, and stock is not deducted a second time.
- A replay returns the existing sale, and a different key cannot settle the already-paid order.
- The integration test also caught a lazy-loading defect in the API response path. `SalesRepository.findByIdempotencyKey` now fetches the receipt item graph, and the settlement service reloads the saved sale graph before returning it. The test runs with `spring.jpa.open-in-view=false` and verifies the receipt line is available after settlement.

Verification on 2026-10-29:

| Command | Result |
|---|---|
| `JAVA_HOME=/home/apperstar/.jdks/ms-21.0.11 PATH=/home/apperstar/.jdks/ms-21.0.11/bin:$PATH ./mvnw -B -Dfrontend.skip=true test` in `posBackend/` | Passed: 51 tests, 0 failures/errors/skips, including the PostgreSQL 16 Testcontainers integration test |

The database integration test invokes application services directly and mocks `JwtDecoder`; it does not verify a real Keycloak token, authenticated HTTP request/response, browser printing, provider payment, or deployment. It is skipped when Docker is unavailable. Table concurrency, migration automation, production schema safety, and full frontend-to-backend acceptance remain open. This evidence verifies one cashier order/payment slice and does **not** certify the complete POS or production readiness.

## Focused product-data authorization follow-up (2026-10-29)

The product API's low-stock alert and stock-movement history endpoints previously required a valid login but had no role restriction. They now allow only `ADMIN`, `MANAGER`, and `STOCK_CLERK`; other authenticated roles, including `CASHIER`, receive HTTP 403. Four MockMvc checks exercise the production `SecurityConfig` filter chain and method-security rules, with only `ProductService` and `JwtDecoder` mocked.

Verification on 2026-10-29:

| Command | Result |
|---|---|
| `JAVA_HOME=/home/apperstar/.jdks/ms-21.0.11 PATH=/home/apperstar/.jdks/ms-21.0.11/bin:$PATH ./mvnw -B -Dfrontend.skip=true -Dtest=ProductControllerAuthorizationTest test` in `posBackend/` | Passed: 4 authorization tests |
| `JAVA_HOME=/home/apperstar/.jdks/ms-21.0.11 PATH=/home/apperstar/.jdks/ms-21.0.11/bin:$PATH ./mvnw -B -Dfrontend.skip=true test` in `posBackend/` | Passed: 55 tests, 0 failures/errors/skips; includes isolated PostgreSQL order/payment integration |

This narrows access to these two endpoints only. It does not complete the API-wide permission review, verify real Keycloak-issued tokens, establish branch/property scoping, or certify production security.
