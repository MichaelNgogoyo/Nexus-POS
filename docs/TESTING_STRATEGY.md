# Testing strategy

## Current test setup

- Backend: JUnit 5/Spring Boot Test, Mockito, MockMvc. Current test classes include product controller, category/checkout services, order security, sale idempotency, and application context tests.
- Frontend: ESLint, Vite production build, and Node's built-in test runner (`npm test`). Unit coverage currently includes menu search/category/popularity helpers and cart line add/remove behavior. No browser E2E runner is configured.
- No PostgreSQL Testcontainers dependency or verified reusable isolated database integration environment was found in the inspected POM.
- Phase 2 baseline: `cd posBackend && JAVA_HOME=/home/apperstar/.jdks/ms-21.0.11 PATH=/home/apperstar/.jdks/ms-21.0.11/bin:$PATH ./mvnw -Dfrontend.skip=true test` passed 18 backend tests, including four added order validation/idempotency cases. Frontend `npm test` passed 8 unit tests; lint passed with 0 errors and 14 warnings in existing components/reports; production build passed.

## Test layers to add using repository-compatible tools

1. **Domain/service unit tests:** totals, modifier bounds, order transitions, discount authority, cash rounding/change, tender allocation, stock policies, idempotency, compensation decisions.
2. **Controller/security tests:** request validation, status/error schema, role allow/deny, object access, pagination limits, no client price/total trust.
3. **Database integration tests:** real PostgreSQL schema/migrations, constraints, transaction rollback, concurrent table/payment writes, persistence across requests. Prefer isolated disposable PostgreSQL/Testcontainers if available in CI; otherwise use an isolated test database with explicit lifecycle and no production credentials.
4. **Frontend component/browser tests:** cashier touch flow, state preservation, order errors/retry, modifier validation, responsive layout, keyboard/accessibility behavior. The current Node tests cover pure menu/cart helpers; select a supported browser runner only after inspecting CI/runtime constraints.
5. **External contract tests:** provider sandbox callbacks/retries and PMS folio post/void/reconciliation. Do not substitute fake production success; mocks are isolated to unit tests.
6. **Release checks:** frontend lint/build, backend compile/tests, migration validation, dependency scan, container build/scan, staging smoke/E2E, backup restore evidence.

## Critical acceptance scenarios

| Scenario | Required result |
|---|---|
| Dine-in and takeaway | One order is traceable from creation to kitchen, tender, receipt, history; table is assigned/released according to explicit policy. |
| Modifiers/notes/quantity | Required/min/max options validated; server prices; notes reach kitchen; invalid values do not persist. |
| Kitchen | Ticket and lines appear from submitted order; item/ticket transitions and authorized cancellations persist; changes after fire are represented safely. |
| Cash | Server total is authoritative; insufficient tender rejected; correct change/register balance; duplicate submission does not duplicate sale/stock movement. |
| Electronic tender | Pending/failed/success/unknown states; valid callback; invalid signature/replay; timeout and retry; reconcile ambiguous result. |
| Guest folio | Active stay and guest/room match; wrong/inactive stay rejected; authorized post; duplicate and timeout safe; reversal/reconciliation recorded. |
| Adjustments | Discount limit, void/cancel/refund reasons and approval; audit trail and stock/payment effects reconcile. |
| Permissions | Each relevant role has both positive and negative tests, including cross-object/branch boundaries if applicable. |
| Failure recovery | DB rollback, service timeout, stale table, unavailable menu item, session expiry, refresh/retry, and persistence after reconnect. |

Fixtures must be local/test-only. Production routes use API data or explicit empty/unavailable states. Test reports must include exact commands and actual counts/results; no claim is based only on compilation.

## UI-first verification

- Build a cashier vertical slice early and review at touch monitor, tablet landscape, and phone portrait dimensions.
- Assert primary controls are touch-sized, totals remain visible, forms are minimized, focus is visible, and errors are actionable.
- Capture screenshot evidence using synthetic/local records only. Run keyboard, zoom, and screen-reader name checks.
- When the browser test runner is selected, automate ordering, required modifier, submit/retry, payment confirmation, and receipt flows against a local test API.
