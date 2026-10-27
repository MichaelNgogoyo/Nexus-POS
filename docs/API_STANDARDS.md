# API and integration standards

**Status:** proposed contract rules. Existing endpoints remain in place until callers and compatibility are mapped.

## Existing API surface

The current API uses `/api` resource paths, including `/api/sale`, `/api/orders`, `/api/kitchen`, `/api/tables`, `/api/product`, `/api/category`, `/api/modifier-groups`, `/api/customers`, `/api/reservations`, `/api/shifts`, `/api/purchase-orders`, `/api/suppliers`, `/api/expenses`, `/api/report`, and `/api/audit`. Springdoc/OpenAPI is a dependency; the actual secured spec and DTO completeness need verification.

## Contract rules for new/changed behavior

- Keep existing paths and semantics during the first audit. Introduce endpoint changes only with compatibility notes and frontend/desktop caller migration.
- Controllers accept validated request DTOs and return explicit response DTOs; do not bind arbitrary entity graphs from clients.
- Use decimal monetary types and ISO-8601 timestamps with an explicit timezone policy. Never accept client totals/prices as authoritative fields.
- Use `201 Created` with a resource location/representation for creation, `200 OK` for reads/updates with a representation, `204 No Content` for successful deletes where appropriate, `400` for malformed fields, `401/403` for auth, `404` for absent resources, `409` for stale/conflicting state, and a consistent structured error body.
- Bound collection sizes and use stable pagination/sorting for histories and reports. Do not expose unbounded kitchen/order queries.
- Sensitive commands carry idempotency keys (order creation, payment attempts, folio posting, refunds, cash movements). Enforce uniqueness in the database, scope keys to actor/operation, and return the prior result on a safe retry.
- Audit command actor, reason, correlation ID and result; omit bearer tokens, secrets, card data, and unnecessary guest PII.
- Use OpenAPI examples and schemas that match deployed behavior. Publish secured API docs only to authorized operators.

## Target resource grouping

| Resource | Proposed command/query boundary |
|---|---|
| Catalog | products, categories, modifiers, availability, tax/price rules |
| Orders | create/edit draft, submit, add/change lines, transfer table, cancel, history |
| Kitchen | ticket queue, item/ticket state transitions, re-fire/cancel delta |
| Payments | create/confirm/query attempts, allocate tenders, refunds, reconciliation |
| Guests / folios | guest/stay verification and folio posting status through PMS adapter |
| Tables / reservations | area/table availability, reservation lifecycle, seat/clear/transfer |
| Register | open/close session, cash movement, counted/expected balance |
| Inventory / procurement | movements, adjustments, purchase orders, receipt of goods |
| Reporting / audit | role-limited paginated read models and traceable sensitive actions |

These are logical groups, not a demand to split the current Spring application or rename all routes.

## Failure semantics

- A validation/business-rule rejection must not persist partial changes.
- A table race returns a conflict with current state; client refreshes and preserves the cart.
- Payment timeout is `PENDING/UNKNOWN`, not success. A status query/callback/reconciliation resolves it.
- If a provider reports success but the client disconnects, retry with the same idempotency key returns/queries the original attempt.
- Room charge must include a verified PMS guest/stay/room reference and preserve provider response/reconciliation metadata.
- Errors shown to users are safe and actionable; detailed stack traces remain server-side with correlation ID.

## API questions to resolve

Confirm current DTO/error schemas, versioning strategy, pagination defaults, exact roles, desktop API compatibility, payment webhook authentication, callback idempotency, PMS contract, and whether API docs are public or admin-only.
