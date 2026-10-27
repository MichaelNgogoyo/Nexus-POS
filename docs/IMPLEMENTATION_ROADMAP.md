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

**Phase 2 status (2026-10-27):** The test foundation is updated and passes: 18 backend tests and 8 frontend unit tests; frontend lint/build pass. The current branch is already `feature/hotel-pos-rebuild`. The working tree remains broadly dirty, so no files were staged and no commit/checkpoint was created under the standing no-commit instruction. The `.env` diff was inspected in redacted form (variable names only). `JavaRefresherCourse2024/` remains untouched and untracked. The configured integration base (`staging` or another branch) has not been confirmed; no branch switch was made.

## Phase 3 — Authoritative order lifecycle and cashier vertical slice

- Design/implement one coherent order path from cashier through persistence to kitchen tickets; dine-in/table and takeaway, catalog/modifiers, quantity/note changes, validation, status/history.
- Refine the high-priority cashier UI with actual backend responses; use error/empty/loading/offline states and preserve cart on safe failures.
- **Tests:** valid/invalid inputs, required modifier rules, table race, duplicate create, kitchen ticket linkage, note propagation, transition rules, persistence across requests, responsive/touch/accessibility checks.
- **Acceptance:** a test order is traceable under one stable identity from creation to KDS/history. Do not claim until verified.

## Phase 4 — Pricing, checkout, payments, receipt and register

- Make server calculations authoritative; define discount policy/approval, tax/service snapshots, cash acceptance/change, payment state, receipt/history, and register reconciliation.
- Add only real supported provider integration; no fake card/M-Pesa success. Keep cash usable if electronic provider is unavailable only when business rules allow.
- **Tests:** total tampering, rounding, insufficient tender, cash success, provider pending/fail/success/unknown/callback, retries/duplicates, refunds if provider supports, receipt permission, shift variance.
- **Acceptance:** state changes only after server/provider confirmation; reconciliation evidence for ambiguous outcomes.

## Phase 5 — Hotel guest and folio

- First obtain/verify PMS API contract and sandbox; then validate active stay, guest-room match, authorization, posting, folio reference, reversal, checkout reconciliation.
- **Tests:** active and inactive stay, wrong room/guest, unauthorized staff, provider errors/timeouts, duplicate requests, reconciliation.
- **Gate:** if no PMS access exists, document this as blocked/deferred and keep room charge disabled; never simulate folio posting.

## Phase 6 — History, adjustments and staff workflow

- Implement only required/verified void, cancellation, discount, refund, feedback, reservation, customer, inventory/purchasing, reports, audit, and role-specific controls; make all POS pages consistent with the accepted design.
- **Tests:** reasons/approvals/audit, stock compensation, receipt/history scoping, feedback persistence if in scope, report totals against source transactions, and mobile/tablet UI states.

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
