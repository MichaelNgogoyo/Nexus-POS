# Restaurant POS steps 4–6 completion report

**Overall status: Partially implemented and locally verified.** The cashier, table, and kitchen core now has safer lifecycle rules and clearer touchscreen workflows. The application is not yet ready to claim end-to-end or production readiness because Keycloak still blocks live frontend API verification and several larger workflows remain outside this implementation.

## Step 4 — Cashier and order flow

**Status: Core flow implemented; broader checkout scope remains incomplete.**

- The existing POS checkout continues to use live catalog, category, modifier, guest, table, and tax/service API data. It submits server-priced orders to the kitchen and supports deferred cash collection from Orders, followed by loading and printing a receipt.
- Cashiers can start a dine-in order from an available table. The checkout reads the table ID from the route, checks that the table is still available, and disables submission if the selected table becomes stale.
- Managers can cancel eligible orders from Orders. Cancellation is confirmed in the UI and updates the order, kitchen ticket, and table lifecycle through the backend.
- Existing payment handling validates the stored order totals and uses idempotency for cash settlement. Backend integration tests cover cash settlement and duplicate requests.

Discounts, bill splitting, split tenders, electronic provider payments, and hotel room charges remain incomplete. Discounts need an approved server-side authorization and calculation policy; room charges need a hotel folio/PMS integration.

## Step 5 — Tables and service management

**Status: Assignment, transfer, and release core implemented; advanced table operations remain incomplete.**

- Creating a dine-in order locks an available table and marks it occupied. Manual status changes cannot create occupancy.
- An open order can be assigned or transferred to another free table by an authorized manager. The former table moves to cleaning, and the target table becomes occupied as part of the order update.
- Cancelling an eligible order moves its table to cleaning and cancels its unserved kitchen ticket. The table screen then supports the manager workflow from cleaning to available.
- Table status updates now lock the table and enforce allowed transitions. A table with an unsettled order cannot be marked as cleaning. A paid table stays occupied until staff clean and release it, keeping payment and occupancy separate.

Table merging, order splitting/merging, and a reservation-to-table assignment workflow are not implemented. A submitted order’s catalog stock remains deducted when the order is cancelled; the application needs a business policy for prepared, wasted, or returned stock before automating reversal.

## Step 6 — Kitchen display

**Status: Ticket lifecycle and API protections implemented; station routing remains incomplete.**

- Kitchen tickets advance through pending, preparing, ready, and served with persisted backend state. The screen polls the backend every 15 seconds and updates elapsed preparation time.
- The default queue returns active tickets. Staff can reveal served and cancelled history from the screen.
- Kitchen updates lock the linked order before the ticket, matching the order/payment lifecycle and preventing concurrent transitions from racing. Kitchen progress preserves `PAID` order state.
- The kitchen API now returns a purpose-built DTO containing only order number/type, table name, items, modifiers, notes, and kitchen timing/status. It omits customer identity, cashier identity, prices, and totals.

Kitchen stations and item-to-station routing do not exist in the current data model. Live push delivery is also absent; updates use polling. The history toggle provides persisted cancellation visibility, not an immediate push notification.

## Verification

- Full backend suite: `JAVA_HOME=/home/apperstar/.jdks/ms-21.0.11 PATH=/home/apperstar/.jdks/ms-21.0.11/bin:$PATH ./mvnw -q -Dfrontend.skip=true test` — **83 tests passed, 0 failures/errors/skips**. PostgreSQL integration tests used Testcontainers; no configured application database was modified.
- Final focused regression run: `JAVA_HOME=/home/apperstar/.jdks/ms-21.0.11 PATH=/home/apperstar/.jdks/ms-21.0.11/bin:$PATH ./mvnw -q -Dfrontend.skip=true -Dtest=KitchenControllerWorkflowTest,TableServiceTest,OrderControllerSecurityTest test` — **28 tests passed**.
- Frontend unit tests: `npm test` — **8 passed**.
- Frontend lint: `npm run lint` — **passed with 0 errors and 14 existing warnings** in unrelated files.
- Frontend production build: `npm run build -- --outDir /tmp/nexus-pos-step4-6-final --emptyOutDir` — **passed**.
- `git diff --cached --check` — **passed**.

The current browser renders the POS shell, but `/pos/tables` displays an API loading error. The existing Keycloak/API authorization problem still prevents confirming a real cashier token against the backend, so a live browser-to-API order, payment, receipt, and kitchen run remains unverified.

## Git and deployment

- Branch: `feature/hotel-pos-rebuild`.
- Implementation commit: `54f3c3a` (`feat: harden restaurant order and kitchen workflows`).
- No deployment or production database changes were made.
- The repository’s normal Vite build target writes to Spring’s static directory. Generated bundle changes are left unstaged; the implementation commit contains only the source and test files listed in the commit.
- Existing unrelated working-tree edits remain untouched and unstaged.
