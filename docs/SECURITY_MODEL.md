# Security model and implementation status

**Status:** partial implementation review, not a security certification. See repository findings in `CURRENT_STATE_AUDIT.md`.

## Verified in the current feature branch

- Spring validates JWT signatures, expiry, issuer, and at least one configured API audience using the configured Keycloak issuer.
- Backend authority mapping accepts realm roles and roles from the configured `pos-client` resource only; roles from unrelated Keycloak clients are ignored.
- Sale and open-order idempotency replays are scoped to the cashier identity and original request data. A different identity or changed payload receives HTTP 409 instead of the stored record.
- Deferred cash settlement locks the saved order, calculates the due from persisted server-priced items and charges, rejects duplicate/conflicting payments, and returns a replay only to the same cashier for the same order and tender amount. Payment and order state are written in one service transaction and an audit event records the transition.
- Order submission locks product rows and records one stock movement per product before creating the kitchen ticket; order and kitchen writes roll back together on failure.
- An isolated PostgreSQL 16 integration test verifies concurrent identical cash-settlement requests create one sale, preserve one stock movement, link the paid order to the sale, and return receipt items with Open EntityManager in View disabled. This verifies service/database behavior; the test mocks `JwtDecoder` and does not verify live Keycloak authentication or the HTTP security filter chain.
- Low-stock alerts and stock-movement history are restricted to `ADMIN`, `MANAGER`, and `STOCK_CLERK`. MockMvc tests verify cashiers are denied and stock clerks are allowed through the actual configured Spring Security filter chain and method security.
- Purchase-order creation and sending are limited to admins, managers, and procurement officers; receipt is limited to admins, managers, and stock clerks. DTOs prevent clients from assigning purchase-order status, line names, or totals. Receipt updates lock the order/products, write stock movement and audit records transactionally, and reject duplicate/concurrent receives.
- The `/api/tables/{id}/status` operation validates the status value, updates the occupancy timestamp consistently, and writes an audit event.
- Receipt access checks that a cashier owns the receipt; managers and admins can access receipts across cashiers.
- Shift operations enforce cashier ownership, while manager/admin paths can operate across cashiers.

These checks have unit-level regression coverage. They do not establish full endpoint or deployment security.

## Known gaps that still block a security sign-off

- Keycloak must issue access tokens with the API audience. The backend defaults to `pos-client`; override with `POS_SECURITY_JWT_REQUIRED_AUDIENCES`/`pos.security.jwt.required-audiences` when the API audience differs. Configure and verify the Keycloak audience mapper before staff sign-in testing.
- The data model has no restaurant or branch ownership boundaries. The current authorization model is single-property and cannot enforce cross-branch isolation.
- Authorization primarily uses broad role checks (`ADMIN`, `MANAGER`, `CASHIER`, and module roles), not the complete permission model below. Several endpoints still need object-level authorization and API-level authorization tests.
- Order list and payment access remain property-wide for configured cashier roles because the current schema has no branch ownership. Add branch/restaurant scope before multi-property deployment.
- Some controllers still bind persistence entities directly, and some administrative mutations do not yet produce audit events.
- CSRF is disabled for the stateless bearer-token API. This is safe only while authentication uses explicit bearer headers and never ambient cookies.
- Production CORS must use exact HTTPS origins. Do not configure wildcard origins with credentialed requests.
- Payment-provider callbacks, M-Pesa reconciliation, hotel folio posting, and external refund flows are not implemented and must not be represented as verified payment success.

## Trust boundaries

1. Browser/desktop clients are untrusted. Every protected action is authorized by Spring on the server.
2. Keycloak authenticates staff. The API validates JWT issuer/signature/expiry and an agreed audience policy, then maps only intended roles. A frontend route guard is not authorization.
3. PostgreSQL is private to the application network. MinIO objects are private; delivery uses server authorization or expiring signed URLs.
4. Payment/PMS/eTIMS callbacks are untrusted until provider signature, timestamp/replay window, event ID, amount, currency, and referenced transaction are verified.
5. Logs and audit records are operational evidence, not a place for secrets, access tokens, card data, or unnecessary guest personal data.

## Initial role matrix (proposal)

| Action | Cashier | Waiter | Kitchen | Supervisor / manager | Stock clerk | Accountant | Admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Browse menu / create draft | Yes | Yes | No | Yes | No | No | Yes |
| Assign/transfer table | Limited | Yes | No | Yes | No | No | Yes |
| Submit order / kitchen notes | Yes | Yes | No | Yes | No | No | Yes |
| Update kitchen ticket | No | No | Yes | Yes | No | No | Yes |
| Record supported tender | Yes | Limited | No | Yes | No | No | Yes |
| Discount beyond cashier limit | No | No | No | Yes, reason required | No | No | Yes, audited |
| Void submitted/preparing items | No | No | No | Yes, reason + kitchen disposition | No | No | Yes |
| Refund / room folio reversal | No | No | No | Limited, policy/provider confirmation | No | Review/reconcile | Yes, audited |
| Open/close own register | Yes | Optional | No | Review/override | No | Reconcile | Yes |
| Inventory adjustment / receive goods | No | No | No | Approve | Yes, bounded | Review | Yes |
| User/role/config administration | No | No | No | No | No | No | Yes |
| View reports / audit | Own shift only | Own service only | Own queue | Operational | Stock | Financial | Full, audited |

This matrix is a target policy, not an assertion that every permission is enforced today. Reconcile it with actual staff duties and the existing Keycloak realm roles before expanding access.

## Authorization requirements

- Test endpoint and object-level authorization, not only class-level roles. Prevent one cashier from reading/changing another branch's orders if multi-branch operation is required.
- Enforce step-up/manager approval for policy-sensitive discounts, voids after submission, refunds, cash adjustments, and manual stock changes. Record actor, approver, reason, old/new values.
- Restrict customer search and guest/folio data to least necessary fields and roles. Log reads only if policy requires it; never expose all guest data to a public screen.
- Keep registration disabled or admin-provisioned unless an explicit safe onboarding flow is designed.

## Configuration findings to verify

- The Spring Security configuration is stateless and disables CSRF. This is appropriate only if the application exclusively uses bearer tokens and not ambient authentication cookies; verify every client/token transport.
- CORS has configurable origins and a wildcard branch that disables credentials. Production must use exact origins and the smallest necessary methods/headers.
- Verify JWT audience as well as issuer/signature/expiry; role extraction from Keycloak realm/client claims must have positive and negative tests.
- Review public product image/config/health paths, Swagger authorization, Actuator exposure, upload MIME/size limits, error body leakage, SQL/query safety, and log redaction.
- Inspect `.env` files and Git history without printing secret values. Rotate exposed credentials only through the authorized operator; do not make rotations in the design stage.
- Establish rate limits for login-adjacent APIs, guest lookup, expensive reports, and payment initiation at the appropriate proxy/API layer.

## Security acceptance tests

Unauthenticated requests fail; each role has allowed and denied cases; object/branch scoping is enforced; expired/wrong issuer/audience tokens fail; invalid callback signature/replay/amount mismatch is rejected; idempotent duplicate events do not duplicate payment/folio/refund effects; guest data and secrets are absent from logs and errors.
