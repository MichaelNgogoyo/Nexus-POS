# Security model proposal

**Status:** design review, not a security certification. See repository findings in `CURRENT_STATE_AUDIT.md`.

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

This must be reconciled with actual staff duties and the existing Keycloak realm roles before enforcement. Current branch claims several role checks; this matrix does not assert they are complete.

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
