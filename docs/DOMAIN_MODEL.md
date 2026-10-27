# Domain model and state design

**Status:** conceptual target model for review; not a migration specification. Existing entities are summarized in `CURRENT_STATE_AUDIT.md`.

## Proposed conceptual ER model

```mermaid
erDiagram
    BRANCH ||--o{ DINING_AREA : has
    DINING_AREA ||--o{ RESTAURANT_TABLE : contains
    BRANCH ||--o{ POS_ORDER : owns
    STAFF ||--o{ POS_ORDER : creates
    CUSTOMER o|--o{ POS_ORDER : associated_with
    RESTAURANT_TABLE o|--o{ POS_ORDER : serves
    POS_ORDER ||--|{ ORDER_LINE : contains
    PRODUCT ||--o{ ORDER_LINE : selected_as
    ORDER_LINE ||--o{ LINE_MODIFIER : snapshots
    MODIFIER ||--o{ LINE_MODIFIER : selected
    POS_ORDER ||--o{ KITCHEN_TICKET : routes_to
    KITCHEN_TICKET ||--|{ KITCHEN_TICKET_LINE : contains
    ORDER_LINE ||--o{ KITCHEN_TICKET_LINE : prepared_as
    POS_ORDER ||--o{ PAYMENT_ALLOCATION : paid_by
    PAYMENT ||--|{ PAYMENT_ALLOCATION : allocates
    PAYMENT ||--o{ PAYMENT_ATTEMPT : attempts
    PAYMENT ||--o{ REFUND : refunds
    REGISTER_SESSION ||--o{ PAYMENT : accepts
    REGISTER_SESSION ||--o{ CASH_MOVEMENT : records
    PRODUCT ||--o{ RECIPE_LINE : uses
    INVENTORY_ITEM ||--o{ RECIPE_LINE : ingredient
    INVENTORY_ITEM ||--o{ INVENTORY_MOVEMENT : changes
    SUPPLIER ||--o{ PURCHASE_ORDER : receives_from
    PURCHASE_ORDER ||--|{ PURCHASE_ORDER_LINE : contains
    STAFF ||--o{ AUDIT_EVENT : performs
    POS_ORDER ||--o{ AUDIT_EVENT : concerns
    CUSTOMER ||--o{ RESERVATION : books
    RESTAURANT_TABLE o|--o{ RESERVATION : requests
```

`BRANCH`, `RECIPE_LINE`, register cash movements, payment attempts/allocations/refunds, and PMS folio references are proposed only if confirmed by requirements. An external PMS should remain authoritative for stay and folio balances; store provider identifiers and posting/reconciliation status, not a copied fake stay ledger.

## State machines

```mermaid
stateDiagram-v2
  state "Order" as O {
    [*] --> Draft
    Draft --> Open: save
    Open --> Submitted: send to kitchen
    Submitted --> InService: kitchen accepted / service starts
    InService --> Completed: service complete
    Draft --> Cancelled
    Open --> Cancelled: permitted cancellation
    Submitted --> Cancelled: authorized cancellation + kitchen action
    InService --> Cancelled: manager approval + reason
    Completed --> [*]
    Cancelled --> [*]
  }
```

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Preparing
  Preparing --> Ready
  Ready --> Served
  Pending --> Cancelled: authorized void
  Preparing --> Cancelled: authorized void + reason
  Ready --> Cancelled: supervisor action
```

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Pending: external request sent
  Created --> Succeeded: cash accepted
  Pending --> Succeeded: verified provider result
  Pending --> Failed: definitive provider failure
  Pending --> Unknown: timeout / ambiguous response
  Unknown --> Succeeded: callback or reconciliation
  Unknown --> Failed: callback or reconciliation
  Succeeded --> PartiallyRefunded
  Succeeded --> Refunded
  PartiallyRefunded --> Refunded
```

```mermaid
stateDiagram-v2
  [*] --> Requested
  Requested --> Approved
  Requested --> Rejected
  Approved --> PendingProvider
  PendingProvider --> Succeeded
  PendingProvider --> Failed
  PendingProvider --> Unknown
  Unknown --> Succeeded: reconciliation
  Unknown --> Failed: reconciliation
```

```mermaid
stateDiagram-v2
  [*] --> Open
  Open --> Closing: cashier requests close
  Closing --> Closed: count reconciled / variance recorded
  Closing --> Open: correction permitted
```

Reservation states should be mapped from the existing enum and business process before standardizing. Table availability/occupancy/cleaning is a separate state machine; it should be derived or transitioned under a concurrency-safe table service, not copied from order/payment status.

## Invariants and transaction boundaries

- A submitted order has at least one valid active product line, bounded quantities, catalog-valid modifier selections, and a server-computed price snapshot.
- Dine-in requires an eligible table. Conflicting assignment/transfer uses locking or optimistic version checks.
- An idempotency key is scoped to an actor/operation and has a unique database constraint; retry returns the original result rather than duplicate side effects.
- Creating an order, its lines, local kitchen ticket(s), table assignment, audit event, and outbox records (if used) should commit or roll back together.
- A payment provider call is not part of a DB transaction. Record a pending attempt and idempotency reference; finalize only from a verified response/callback and provide reconciliation for unknown state.
- Cash tender, change, register movement, payment allocation, and paid state must agree within the database transaction.
- Refund provider state and local refund state must remain distinguishable. Never restore stock or label refunded until the policy/provider outcome is definitive; record any compensation as a new movement.
- Room-charge intent, PMS posting reference, result, and reconciliation status must be idempotent. Network timeout is unknown, not success.
- Audit sensitive transitions with actor, target, reason, before/after state, timestamp, and correlation/idempotency key; exclude credentials/payment secrets.

## Historical compatibility

Existing `Sales` and `RestaurantOrder` records need a data mapping proposal before a schema change. Preserve original totals and product/option snapshots; do not recompute historic receipts from the current menu. Add constraints/indexes only after checking real data and testing forward migration against a disposable copy.
