# Implementation roadmap for approval

The cashier UI is the first user-facing priority. Design and implementation stay tied to real APIs; backend work required for integrity is delivered alongside the relevant screen. Each phase gets a focused branch, tests, documentation, a diff review, and a report. Stop for owner review after each phase; no push or production deployment without explicit authorization.

## Phase 0 — Current-state audit (completed for this design packet)

- Inventory clients, modules, APIs, entities, auth, deployment, tests, risks, and Git state.
- Record evidence and limits in `CURRENT_STATE_AUDIT.md`.
- No application behavior changed.
- Existing dirty tree makes checkpoint staging unsafe until individual diffs/secrets/generated files/unrelated work are classified.

## Phase 1 — Architecture and UX design (this packet; approval gate)

- Review architecture, data relationships, order/payment/kitchen/shift states, API principles, security matrix, UI flows, test plan, deployment/operations needs, and scope questions.
- **UI deliverable:** cashier screen map/wireframe and touch behavior are first in `POS_UX_DESIGN.md`; detailed polished screen design can be refined after the choices below.
- **Verification:** consistency review against controllers/entities/routes, Mermaid review, and documented baseline evidence. This is not a runtime integration test.
- **Stop:** owner approves or requests design changes before feature implementation.

## Phase 2 — Safe Git checkpoint and test foundation

- Reconcile the current dirty branch without discarding changes; inspect `.env` diffs without printing secrets; exclude unrelated Java learning project and generated artifacts.
- Select integration branch after confirming whether `staging` is the intended base. Create phase feature branch only after a clean, reviewed starting state/checkpoint.
- Add service/controller tests for existing order, sale, table, totals, and permission rules before changing behavior.
- **Checks:** Java compile/unit/security tests; frontend lint/build; verify documented DB test setup and no production fixtures.
- **Stop:** report checkpoint files/commit, baseline outcomes, and unresolved tests.

**Phase 2 status (2026-10-27):** The test foundation passed before Phase 3/4 work. The current branch is `feature/hotel-pos-rebuild`. After explicit owner authorization, commit `55f517f` captured the POS source/docs/tests while excluding local `.env`, generated bundles, the package lockfile, and `JavaRefresherCourse2024/`. Those excluded local/generated/unrelated files remain uncommitted. The configured integration base (`staging` or another branch) has not been confirmed; no branch switch was made.

## Phase 3 — Authoritative order lifecycle and cashier vertical slice

- Design/implement one coherent order path from cashier through persistence to kitchen tickets; dine-in/table and takeaway, catalog/modifiers, quantity/note changes, validation, status/history.
- Refine the high-priority cashier UI with actual backend responses; use error/empty/loading/offline states and preserve cart on safe failures.
- **Tests:** valid/invalid inputs, required modifier rules, table race, duplicate create, kitchen ticket linkage, note propagation, transition rules, persistence across requests, responsive/touch/accessibility checks.
- **Acceptance:** a test order is traceable under one stable identity from creation to KDS/history. Do not claim until verified.

**Phase 3 status (2026-10-27):** Cash checkout now creates a server-priced sale, linked restaurant order, and pending kitchen ticket in one service transaction. `Sales` and `RestaurantOrder` record each other's IDs/order number; kitchen transitions synchronize order state; order cancellation updates unsent tickets; kitchen actions are audited and cannot skip stages. Dine-in table checks use a database row lock in the cash-sale path. Unit tests cover these service/controller rules. The requested PostgreSQL persistence/concurrency trace is still unverified because no local database is running; mocked unit tests do not satisfy the full end-to-end acceptance.

## Phase 4 — Pricing, checkout, payments, receipt and register

- Make server calculations authoritative; define discount policy/approval, tax/service snapshots, cash acceptance/change, payment state, receipt/history, and register reconciliation.
- Add only real supported provider integration; no fake card/M-Pesa success. Keep cash usable if electronic provider is unavailable only when business rules allow.
- **Tests:** total tampering, rounding, insufficient tender, cash success, provider pending/fail/success/unknown/callback, retries/duplicates, refunds if provider supports, receipt permission, shift variance.
- **Acceptance:** state changes only after server/provider confirmation; reconciliation evidence for ambiguous outcomes.

**Phase 4 status (2026-10-27):** Server-owned catalog prices, 2-decimal line/subtotal/tax/service rounding, cash tender validation/change, sale idempotency, receipt retrieval/printing, cashier receipt ownership, manager-only void/refund API paths, and expected cash/variance calculation at shift close are covered by implementation and unit tests. Card and M-Pesa remain disabled because no provider contract/sandbox is configured. Discounts and a ledger for non-sale cash movements are not implemented; expected drawer cash covers opening float plus completed cash sales only. Full register reconciliation and provider state/callback tests remain open.

## Phase 5 — Hotel guest and folio

- First obtain/verify PMS API contract and sandbox; then validate active stay, guest-room match, authorization, posting, folio reference, reversal, checkout reconciliation.
- **Tests:** active and inactive stay, wrong room/guest, unauthorized staff, provider errors/timeouts, duplicate requests, reconciliation.
- **Gate:** if no PMS access exists, document this as blocked/deferred and keep room charge disabled; never simulate folio posting.

**Phase 5 status (2026-10-27):** Deferred at the integration gate: no PMS contract, sandbox, or credentials are available. To prevent false folio records, room-charge selection is visibly disabled in cashier checkout and the order API rejects room-charge create/update requests with 503. No guest lookup or folio posting is simulated. Active stay validation, authorization rules, post/void references, and reconciliation remain unimplemented until the PMS is identified.

## Phase 6 — History, adjustments and staff workflow

- Implement only required/verified void, cancellation, discount, refund, feedback, reservation, customer, inventory/purchasing, reports, audit, and role-specific controls; make all POS pages consistent with the accepted design.
- **Tests:** reasons/approvals/audit, stock compensation, receipt/history scoping, feedback persistence if in scope, report totals against source transactions, and mobile/tablet UI states.

**Phase 6 status (2026-10-27):** Partial. Existing POS pages retain their API-backed loading, empty, and error states. Reservation create/update now validates future dates, party size, and bounded text; creates start as PENDING; status changes follow the cashier UI lifecycle; terminal reservations cannot be edited or reopened; sensitive reservation changes are audited. Tests cover validation, transition rules, and audit behavior. The larger history/adjustment scope remains open where policy is not defined or backing models are absent, including discount approvals, complete cash-movement/refund history, and feedback persistence. Role/ownership coverage and cross-page UI review are not a complete release audit.

## Phase 7 — Security, integration and release readiness

- Full API/role/object scope audit, dependency/secret/container scans, migration compatibility, end-to-end staging flow, desktop/offline decision, TLS/CORS, monitoring, backup restore, rollback/forward recovery.
- **Tests:** all critical workflow matrix plus staging sandbox callbacks and reconciliation.
- **Acceptance:** truthful readiness status with unresolved risks; not production-ready if any critical flow remains unverified.

## Approval inputs for Phase 1

1. Is the JavaFX desktop client in scope for the first release, and must it support offline sales?
2. Which PMS/folio API and payment provider(s) are available, or should those phases remain deferred until you provide sandbox access?
3. Are multiple branches, delivery, customer ordering, bar routing, printers, eTIMS, and loyalty launch requirements or later options?
4. Which cashier role and manager override rules apply to discounts, voids, refunds, and cash adjustments?

These questions do not prevent the current-system audit or cashier screen design; they affect implementation boundaries and acceptance criteria.
