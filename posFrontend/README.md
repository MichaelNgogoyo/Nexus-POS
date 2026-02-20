# POS Frontend (React + Vite)

A modern point-of-sale frontend with Keycloak authentication, theme-aware Tailwind UI, and feature modules for product catalog, inventory, sales/checkout, reports, and user management.

## Implemented Modules

- **Product Catalog**
  - Product listing with image rendering
  - Create product flow (multipart upload)
  - Low-stock visibility integrated into product cards
- **Inventory Management**
  - Dedicated inventory dashboard page
  - Stock health summaries (total units, low stock, out of stock)
  - Inventory table with searchable product records
  - Stock adjustment + movement history actions in product module
- **Sales & Checkout**
  - Product search and cart flow
  - Discount + tax + payment selection
  - Sale payload includes line items
  - Receipt preview and print action
  - Transaction list with return processing action
- **Reports & Analysis**
  - Dedicated reports page
  - API-driven KPIs for selected timeframe (today/week/month)
  - Revenue trend chart
  - Top stocked products chart
- **User Management**
  - Dedicated user management page
  - Role matrix for: Admin, Cashier, Inventory Manager, Supervisor, Accountant, Auditor
  - Permission profile panel for selected role

## Architecture Overview

- `src/main.jsx`
  - App bootstrap with `ReactKeycloakProvider` + `BrowserRouter`
- `src/App.jsx`
  - Route registration and auth-protected module routes
- `src/routes.js`
  - Source of truth for paths (`/inventory`, `/sales`, `/reports`, `/users`, etc.)
- `src/components/Layout.jsx`
  - Shared shell (top nav, sidebar, outlet)
- `src/services/api.js`
  - Axios singleton, auth token interceptor, base URL from env

## Auth and API Conventions

- Keycloak is the single authentication authority.
- Protected pages are wrapped with `RequireAuth`.
- API calls should be added to `src/services/api.js`, not directly in pages.
- Base URL is read from:
  - `VITE_API_BASE_URL` (fallback: `http://localhost:8080`)

## Theming and UI Standards

- Theme tokens are defined in `src/index.css` CSS variables.
- Reuse utility classes first: `card`, `btn-primary`, `btn-secondary`, `nav-link`.
- Dark mode toggles via `.dark` class (see `src/components/ThemeToggle.jsx`).
- Prefer tokenized colors (`brand-*`, `accent-*`, `bg-*`, `text-*`, `border-*`) over hardcoded values.

## Run and Validate

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## Current Routes

- `/dashboard`
- `/products`
- `/inventory`
- `/sales`
- `/reports`
- `/users`
- `/createproduct`
- `/login`
- `/register`

## Notes

- Some analytics depend on available backend sales data shape (`saleDate`, `totalAmount`, etc.).
- Inventory adjustment and return endpoints are integrated in frontend and require backend support.
- There is currently no automated frontend test suite configured.
