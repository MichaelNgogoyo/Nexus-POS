# Copilot Instructions for POS Frontend

## Big Picture Architecture
- This is a React + Vite SPA with feature-based pages under `src/pages` and reusable UI in `src/components`.
- App shell and route registration live in `src/App.jsx`; routes are centralized in `src/routes.js`.
- `src/main.jsx` wraps the app with `ReactKeycloakProvider` and `BrowserRouter`.
- Protected routes use `src/auth/RequireAuth.jsx`; unauthenticated users are redirected through Keycloak.
- Layout composition pattern: `Layout` renders `NavBar`, sidebar, and `<Outlet />` for page content.

## Service Boundaries and Data Flow
- All backend calls should go through `src/services/api.js` (Axios singleton + interceptors).
- API base URL comes from `VITE_API_BASE_URL` (fallback: `http://localhost:8080`).
- Auth token handling is centralized in Axios request interceptors (`keycloak.updateToken(30)` + Bearer token).
- Do not add new direct `axios` calls in pages/components; extend `api.js` instead.
- Product image URLs should use `api.getProductImageUrl(productId)`.

## Module Patterns
- Sales module is tabbed in `src/pages/sales/Sales.jsx` and delegates to:
  - `components/sales/CheckoutComponent.jsx`
  - `components/sales/TransactionsComponent.jsx`
  - `components/sales/ReportsComponent.jsx`
- Inventory/product flows are in `src/pages/product/Products.jsx` and `src/pages/product/AddProduct.jsx`.
- Dashboard widgets in `src/components/dashboard/*` currently include static/mock data in several places.

## UI/Theming Conventions
- Theme tokens are defined in `src/index.css` using CSS variables and Tailwind mapped colors.
- Reuse utility classes (`card`, `btn-primary`, `btn-secondary`, `nav-link`) before adding new style patterns.
- Preserve dark mode behavior (`.dark` class toggle in `components/ThemeToggle.jsx`).
- Prefer existing color tokens (`brand-*`, `accent-*`, `bg-*`, `text-*`, `border-*`) over hardcoded colors.

## Developer Workflows
- Install dependencies: `npm install`
- Run dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview build: `npm run preview`
- There is currently no automated test suite configured in this frontend workspace.

## Project-Specific Gotchas
- `src/routes.js` is the source of truth for route paths; avoid hardcoded route strings.
- `vite.config.js` contains custom config for MUI styled engine alias and output behavior; modify carefully.
- Some analytics/report views are mock-driven; verify backend endpoint availability before assuming live data.
- If adding auth-related pages, keep Keycloak as the single auth authority (avoid parallel local auth flows).
