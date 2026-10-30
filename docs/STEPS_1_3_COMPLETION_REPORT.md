# Steps 1–3 Completion Report

**Date:** 2026-10-29
**Branch:** `feature/hotel-pos-rebuild`
**Scope:** Browser cashier journey, API authorization review, and safe PostgreSQL migrations / money precision.

## Status

| Step | Status | Evidence / boundary |
|---|---|---|
| 1. Verify cashier browser journey | **Blocked at API authentication** | The touchscreen checkout renders at `/pos/checkout`, but menu/category/summary API requests return HTTP 401. No order, kitchen ticket, payment, or receipt was created. |
| 2. API authorization review | **Improved; review remains partial** | Added cashier ownership checks for restaurant orders and their cash settlement, corrected new cashier identity to Keycloak subject, restricted table status and supplier deletion, and added/ran authorization tests. Restaurant/branch tenancy and granular permission policy are absent. |
| 3. Database/money changes | **Implemented and isolated-test verified; rollout not performed** | Added Flyway baseline and upgrade migrations, production Hibernate validation, `BigDecimal`/`numeric(19,2)` for persisted monetary values, Testcontainers migration tests, and full JPA schema validation. No local or production database was migrated. |

## Implementation

- Cashier order lists query by the authenticated subject/preferred-username aliases in the repository before applying the page limit. Order detail, edit, kitchen submission, item-add, and settlement operations check ownership; mutations lock the order row. Manager/admin access follows endpoint role rules.
- New order and sale rows use the Keycloak subject, matching shift identity. Legacy username identity remains accepted for existing data. Cash receipt access accepts either identity representation.
- Cashiers cannot manually change table occupancy status. Generic table updates ignore client-provided status and occupancy timestamp. Supplier deletion requires manager/admin.
- Flyway now has a POS baseline suitable for a fresh schema or an existing database sharing `public` with Keycloak, followed by the existing POS migrations and a fixed-precision money migration. Production `ddl-auto` is `validate`; development remains `update`.
- Persisted money values across products, modifiers, combos, orders, sales, customer totals, shifts, procurement, and expenses use `BigDecimal` and `numeric(19,2)`. Tax/service calculations, cash reconciliation sums, report totals, and the legacy sale request now use decimal values end to end. The migration checks bounds before rounding legacy values to two decimals.

## Verification run

| Command | Result |
|---|---|
| `JAVA_HOME=/home/apperstar/.jdks/ms-21.0.11 PATH=/home/apperstar/.jdks/ms-21.0.11/bin:$PATH ./mvnw -B -Dfrontend.skip=true test` | Passed: 75 tests, 0 failures/errors/skips. Uses disposable PostgreSQL 16 Testcontainers for migration and integration tests. |
| `npm test` in `posFrontend` | Passed: 8 tests, 0 failures. |
| `npm run lint` in `posFrontend` | Exit 0; 14 existing warnings, 0 errors. |
| `npm run build -- --outDir /tmp/nexus-pos-step123-build --emptyOutDir` in `posFrontend` | Passed. |
| `git diff --check` | Passed after the implementation and documentation changes. |

The migration test preserves a Keycloak marker and legacy money data in an isolated PostgreSQL container. The Spring test applies Flyway to a fresh PostgreSQL container and confirms Hibernate `ddl-auto=validate` accepts the resulting schema. These tests do not prove compatibility with the current local or VPS database.

## Blockers and deployment prerequisites

1. Resolve the browser's HTTP 401 before accepting the cashier journey. The API requires a JWT audience configured as `pos-client` by default; verify the token's `aud` claim, issuer, and expiration against `SecurityConfig` without weakening API validation. Sign in again after correcting the Keycloak client/audience configuration, then exercise order → kitchen → later payment → receipt.
2. Take and verify a database backup before allowing Flyway to run against any persistent environment. Review the generated baseline against the actual VPS schema and execute first against a restored staging copy. No direct SQL was run against the user's database.
3. Do not enable multi-branch/multi-restaurant use until ownership fields, repository scoping, and cross-tenant negative tests exist.
4. Complete a permission matrix review. Kitchen/reservation reads are property-wide for their granted roles, persistence entities are still exposed by some APIs, and approval-reason workflows are incomplete.
5. The real browser order/payment/receipt journey remains unverified. This report does not claim production readiness.
