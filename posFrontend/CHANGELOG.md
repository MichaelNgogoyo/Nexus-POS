# posFrontend — Changelog

All notable changes made to the frontend during active development.

---

## [Unreleased]

### Fixed — Transactions Tab (`TransactionsComponent`)
- **Root cause 1 — Hibernate in-memory pagination**: `SalesRepository.findAll(Pageable)` used an `@EntityGraph` with a `@OneToMany` collection. Hibernate fired `HHH90003004` (firstResult/maxResults with collection fetch) and paginated in-memory. Fix: replaced with a plain JPQL `findAllPaged()` query (no entity graph) on the list endpoint.
- **Root cause 2 — sale items always empty on expand**: the list query no longer fetches `saleItems`. Items are now lazy-loaded on first row expansion via `GET /api/sales/{id}` (which does use `@EntityGraph("Sales.withItems")`).
- **Return modal**: replaced hardcoded `"Customer return"` string with a proper modal dialog that lets the cashier enter a return reason.
- Added disabled state on the Return button for already-returned sales.
- Pagination bar with numbered pills ± 2 pages from current, chevron prev/next.
- Spinner, error, and empty-state cells for all async states.

---

## Previous Session Changes

### Fixed — Development API URL (`ERR_NAME_NOT_RESOLVED`)
- **File**: `posFrontend/.env.development`
- Added `VITE_API_BASE_URL=http://localhost:8080`.
- Without this, Vite fell back to `.env`'s production URL and all API calls failed locally.

---

### Fixed — N+1 Queries (Backend)
- **File**: `posBackend/.../SalesService.java`
  - `createSales`: replaced `findById` inside the item loop with an upfront `findAllById` batch fetch, then `saveAll` after the loop.
  - `processReturn`: removed redundant `findById` inside loop — `Sales.withItems` entity graph already eagerly loads `item.getProduct()`.
  - Refactored `logStockMovement` → `buildStockMovement` (returns entity instead of saving, enables batch `saveAll`).
- **File**: `posBackend/.../CheckoutService.java`
  - `processCheckout`: replaced N individual `save()` calls with a single `saveAll()` after the loop.

---

### Fixed — Sale Return Endpoint (`@PostMapping` missing)
- **File**: `posBackend/.../SalesController.java`
- Added missing `@PostMapping("/{id}/return")` annotation on `processSaleReturn`. Without it the method was unreachable (405/404).

---

### Feature — Tax Rate from Backend
- **File**: `posBackend/.../ConfigController.java` _(new)_
  - `GET /api/config/tax-rate` — public endpoint, reads `pos.tax-rate` from `application.yml`.
- **File**: `posBackend/.../SecurityConfig.java`
  - Added `/api/config/**` to `permitAll` list.
- **File**: `posFrontend/src/services/api.js`
  - Added `getTaxRate()` method.
- **File**: `posFrontend/src/components/sales/CheckoutComponent.jsx`
  - On mount, fetches tax rate from backend instead of hardcoding 8%.

---

### Feature — Amount Tendered + Change Calculation
- **File**: `posFrontend/src/components/sales/CheckoutComponent.jsx`
- Cash payment shows an **Amount Tendered** input field.
- Live change-due calculation displayed below.
- `amountTendered` sent in the `SaleRequest` payload to the backend.

---

### Feature — Cart LocalStorage Persistence
- **File**: `posFrontend/src/components/sales/CheckoutComponent.jsx`
- Cart state persisted to `localStorage` under key `pos_cart`.
- Cart is restored on page refresh; cleared after a successful sale.

---

### Feature — Printable Thermal Receipt
- **Package**: `react-to-print` installed.
- **File**: `posFrontend/src/components/sales/ReceiptDocument.jsx` _(new)_
  - 80 mm thermal receipt layout: store header, itemized lines, subtotal/tax/total, cash change section, simulated barcode, tear-line.
  - `@media print` CSS hides everything except `#receipt-printable`.
  - `@page { size: 80mm auto }` for thermal printers.
- **File**: `posFrontend/src/components/sales/CheckoutComponent.jsx`
  - After sale completes, receipt preview appears on-screen.
  - "Print Receipt" button triggers `useReactToPrint` — no screenshot needed.

---

### Fixed — Reports Not Generating (`ReportsComponent`)
- **File**: `posFrontend/src/components/sales/ReportsComponent.jsx` _(rewritten)_
- **Root cause 1**: called `getAllSales()` (paginated) but read `.data` instead of `.data.content` — always empty.
- **Root cause 2**: "Top Products" chart used current `stock quantity`, not units sold.
- **Root cause 3**: all aggregations client-side on page 0 only — incomplete data.
- Rewrote to use `getDashboardSummary()` (`GET /api/report/summary`):
  - KPI cards (revenue, orders, AOV) with period-over-period % change.
  - Revenue trend line chart from `dailyStats`.
  - Top-5 products by **units sold** (real SQL aggregation from backend).
  - Recent sales table.

---

### Feature — Paginated Product Search in Checkout
- **File**: `posBackend/.../ProductRepository.java`
  - Added `searchActive()`: paginated JPQL search by name/SKU/barcode where `quantity > 0`. No `JOIN FETCH` (avoids Hibernate in-memory pagination).
- **File**: `posBackend/.../ProductService.java`
  - Added `searchProducts(q, page, size)` wrapping `searchActive`.
- **File**: `posBackend/.../ProductController.java`
  - Added `GET /api/product/search?q=&page=0&size=12`.
- **File**: `posFrontend/src/services/api.js`
  - Added `searchProducts(q, page, size)`.
- **File**: `posFrontend/src/components/sales/CheckoutComponent.jsx`
  - Debounced search input (350 ms).
  - Numbered pagination bar with page counter.

---

### Fixed — Products Not Visible in Checkout
- **File**: `posBackend/.../ProductRepository.java`
- **Root cause 1**: `WHERE p.active = true` — Java `boolean` defaults to `false`; all products created without explicitly setting `active` were invisible.
- **Root cause 2**: `LEFT JOIN FETCH p.category` with `Pageable` triggered Hibernate in-memory pagination.
- Fix: changed filter to `WHERE p.quantity > 0`, removed `JOIN FETCH`.

---

## Developer Notes

### Running the app locally
```bash
# Backend
cd posBackend
mvn spring-boot:run

# Frontend
cd posFrontend
npm install
npm run dev          # http://localhost:5173
npm run build        # production build
npm run lint         # ESLint
npm run preview      # preview production build
```

### Environment variables (frontend)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend base URL | `http://localhost:8080` |

Set in `.env.development` for local dev, `.env` for production.

### Key architectural notes
- All API calls go through `src/services/api.js` — never add raw `axios` calls in components.
- Auth token is handled by the Axios request interceptor (Keycloak `updateToken(30)`).
- Tax rate is served from the backend at `GET /api/config/tax-rate`; do not hardcode it.
- `SaleReturnRequest` DTO exists; the return endpoint is `POST /api/sales/{id}/return`.
- `Sales.withItems` entity graph eagerly loads `saleItems` **and** their `product`. Only use on single-record fetches — not on paginated list queries.
