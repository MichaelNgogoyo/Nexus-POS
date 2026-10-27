# Current state audit

**Audit scope:** repository snapshot on 2026-10-27, branch `feature/hotel-pos-rebuild`. This is a design-stage audit of checked-in code plus the current working tree; it is not a staging or production verification.

## Executive summary

The repository contains a React web application, a Spring Boot REST API, and a separate JavaFX desktop client. PostgreSQL/JPA is the server persistence layer, Keycloak is configured as the web API identity provider, and MinIO stores product images. The web application already has POS, admin, finance, reporting, table, kitchen, order, customer, shift, and reservation screens.

The most important design risk is that cash sales and restaurant orders are separate backend paths. The kitchen queue reads `KitchenOrder` records related to `RestaurantOrder`, while the cashier cash path creates `Sales`; there is no verified link that routes cashier sales into the kitchen queue. Room-charge order creation also does not verify a hotel stay or post to a folio. These must be addressed before claiming a complete live-service workflow.

## Repository and Git state

- Root repository: `Nexus-POS`; no applicable `AGENTS.md` was found in the inspected repository paths.
- Current branch: `feature/hotel-pos-rebuild` at `fe80067`; that commit is also the current `master`/`origin/master` tip. The existing `staging` branch is at `100ea97`.
- The working tree contains extensive modified/untracked POS, backend, configuration, generated static-asset, and documentation files. It also contains a changed `posFrontend/.env` and an untracked `JavaRefresherCourse2024/` directory. Values from environment files were not inspected or copied into this report.
- No files were staged, committed, reset, or removed for this audit. Before a checkpoint commit, inspect individual diffs, exclude credentials/generated artifacts/unrelated work, and agree which existing POS changes belong in the checkpoint.

## Technology and build configuration

| Area | Observed |
|---|---|
| Web frontend | React 19, Vite 7, JavaScript/JSX, Tailwind CSS 3, MUI, TanStack Query, Axios, Keycloak JS |
| API | Java 17 target, Spring Boot 3.5, Spring Security, Spring Data JPA, Bean Validation, Springdoc OpenAPI |
| Database | PostgreSQL driver; JPA/Hibernate. Production config uses `ddl-auto: validate`; dev config uses `update`. |
| Identity | Keycloak JWT resource server configuration, Keycloak realm/client role extraction |
| Object storage | MinIO service/configuration for product images |
| Desktop client | JavaFX, local SQLite cache and generic queued synchronization |
| Frontend checks | `npm run lint`, `npm run build`; no frontend test script is defined in `package.json` |
| Backend checks | Maven wrapper and Spring Boot test dependencies; tests use JUnit/Mockito/MockMvc |
| CI/CD | `.github/workflows/deploy.yml` exists; no separate pull-request test workflow was found in `.github/workflows/` |
| Deployment | Backend/frontend Dockerfiles, production Compose, Nginx config, deployment workflow |

## Application modules and routes

The React route map includes `/pos/checkout`, `/pos/tables`, `/pos/orders`, `/pos/kitchen`, `/pos/customers`, `/pos/shift`, `/pos/reservations`, `/admin/*`, and `/finance/*`. Admin modules cover products, categories, inventory, reports, users, settings, customers, and audit. The desktop module is a separate JavaFX shell with module stubs and SQLite sync infrastructure.

Backend route families observed include `/api/sale`, `/api/orders`, `/api/kitchen`, `/api/tables`, `/api/customers`, `/api/reservations`, `/api/shifts`, `/api/product`, `/api/category`, `/api/modifier-groups`, `/api/report`, `/api/audit`, `/api/suppliers`, `/api/purchase-orders`, `/api/expenses`, `/api/cart`, and `/api/config`.

## Current domain and persistence

Observed JPA models include products/categories/modifiers; `RestaurantOrder`/`OrderItem`; `Sales`/`SaleItem`; `KitchenOrder`; tables; customers; reservations; shifts; stock movements; suppliers/purchase orders; expenses; users; and audit logs. Cash/payment method and sale status are stored on `Sales`; no separate payment-attempt, allocation, or refund aggregate was found in the inspected model. A sale-return endpoint exists, but a real provider refund/reconciliation path is not evidenced.

The order lifecycle and sale lifecycle are therefore represented separately. `KitchenOrder` is associated with `RestaurantOrder`, but the cashier sale path does not establish that association. The exact persistence behavior and constraints require database-backed tests before changing the model.

One SQL migration is present at `posBackend/src/main/resources/db/migration/V20261027_01__hotel_pos_sale_fields.sql`. The inspected Maven dependencies did not show Flyway or Liquibase, so production migration execution is not automatically verified by this repository configuration. The schema/migration owner and deployment procedure need to be made explicit.

## Current workflow evidence and gaps

| Workflow | Current evidence | Audit status |
|---|---|---|
| Staff access | Keycloak JWT resource server and route/controller role checks exist. | Implemented in part; claim mapping, endpoint coverage, and positive/negative role tests need full verification. |
| Menu and modifiers | Product/category and modifier-group APIs/entities exist. The current worktree adds modifier selections to sale/order line models and server pricing. | Partial; verify migration, constraints, and frontend/API contract. |
| Dine-in/takeaway cash sale | `SalesService` computes totals, stock effects, and stores sale information; `OrderType` contains dine-in/takeaway. | Partial; separate from kitchen/order lifecycle. Provider methods beyond cash are not evidenced. |
| Restaurant orders | `/api/orders` creates, updates, transitions, and cancels `RestaurantOrder` records. | Partial; current checkout and payment lifecycle are not unified with this path. |
| Kitchen | `/api/kitchen/orders` reads and updates `KitchenOrder`. | Critical gap: no verified creation/linking from a cashier sale/order submission. |
| Tables | Table list/status APIs and UI exist; sales can mark a selected table occupied. | Partial; assignment conflicts, lifecycle release, transfers, and concurrency need tests. |
| Room charge | `ROOM_CHARGE` order type and order fields exist. | Unsupported as a hotel folio workflow: no active-stay validation/PMS posting/reconciliation found. |
| Electronic payments | Payment method enum/UI references exist. | Not verified; current backend sales service rejects non-cash checkout pending provider setup. |
| Discounts | Order model has a discount field; inspected order calculation forces discount to zero. | Unsupported beyond current behavior; define policy/manager approval before implementation. |
| Voids/returns | Sale return endpoint/service exists; order cancellation exists. | Partial; refund execution, partial return rules, reason capture, and complete audit history need tests. |
| Shifts/cash | Open/current/close shift endpoints and models exist. | Partial; cash movements, reconciliation rules, and authorization need verification. |
| Inventory/purchasing | Product stock, movements, adjustments, suppliers, purchase orders exist. | Partial; recipes/ingredient depletion and restaurant-specific consumption are not evidenced. |
| Reservations/guests | APIs and screens exist. | Partial; integration with tables, stays, and room guest identity needs verification. |
| Offline desktop | SQLite cache and generic PUT/DELETE sync queue exist; README says module UI uses sample builders and API contracts need alignment. | Prototype/skeleton; unsafe for offline sales/payments until conflict and idempotency semantics are designed. |
| External systems | Compose/config includes Keycloak and MinIO. | No PMS/folio, payment-provider sandbox, eTIMS, printer, SMS, or email integration was verified. |

## Tests and baseline evidence

The frontend package has lint and production-build scripts but no frontend unit/E2E test command. Backend tests are JUnit/Mockito/MockMvc. In the previous verified run on this working tree, `npm run build -- --outDir /tmp/nexus-pos-touch-build-final --emptyOutDir` passed, `npm run lint` passed with 14 warnings and no errors, and the Java 21 JDK Maven run targeting Java 17 passed 14 tests. A fresh npm advisory request failed to reach the registry. No end-to-end run against PostgreSQL/Keycloak/MinIO/PMS/payment sandbox was performed.

Commands and results are historical evidence from the prior run, not rerun as part of this document-only design stage.

## Initial recommendations

1. Make one authoritative order lifecycle feed kitchen, table, checkout, receipt, and history.
2. Keep payment attempts/provider state separate from order and kitchen state; never infer payment success from a client response.
3. Treat room charges as unavailable until a PMS contract can validate active stay/guest/room and confirm/reconcile folio posting.
4. Prioritize the cashier interaction design and build it as a real-API vertical slice, with touch-sized controls and visible error/loading/retry behavior.
5. Decide whether JavaFX/offline operation is in scope before making it share order/payment writes with the web client.
6. Add repeatable database migration and isolated integration-test procedures before relying on schema changes.

## Boundaries of this audit

This report documents code/configuration evidence only. It does not certify security, production readiness, payment providers, PMS behavior, deployment health, database migration compatibility, or backup restoration. Those require focused tests and access to the corresponding isolated services.
