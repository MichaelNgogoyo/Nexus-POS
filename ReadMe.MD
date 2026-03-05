# 🛒 Point of Sale (POS) System

A full-stack Point of Sale system built with **Spring Boot 3.5** (backend) and **React + Vite** (frontend), secured with **Keycloak**, storing files in **MinIO**, and connected to **PostgreSQL**.

---

## 🚀 Modules

| Module | Endpoint Prefix | Status |
|--------|----------------|--------|
| Products & Inventory | `/api/product` | ✅ Complete |
| Categories | `/api/category` | ✅ Complete |
| Sales / Checkout | `/api/sale` | ✅ Complete |
| Cart | `/api/cart` | ✅ Complete |
| Users | `/api/user`, `/api/register` | ✅ Complete |
| Blog / Announcements | `/api/blog` | ✅ Complete |
| Reports / Dashboard | `/api/report` | ✅ Complete |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.5, Spring Data JPA, Spring Security |
| Frontend | React 18, Vite 7, MUI v5, Tailwind CSS, Recharts |
| Auth | Keycloak (OAuth2 / PKCE / JWT Resource Server) |
| Database | PostgreSQL 15 |
| File Storage | MinIO (S3-compatible) |
| API Docs | Swagger UI / OpenAPI 3 |

---

## 🗄️ Quick Start (Development)

### 1. Prerequisites

```bash
docker run --name pos-db \
  -e POSTGRES_USER=pos_user -e POSTGRES_PASSWORD=pos_pass -e POSTGRES_DB=pos_db \
  -p 5432:5432 -d postgres:15

docker run --name pos-minio \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  -p 9000:9000 -p 9001:9001 \
  -d minio/minio server /data --console-address ":9001"

# Keycloak (create realm "pos", client "pos-client", roles: admin/manager/cashier/clerk)
docker run --name pos-keycloak \
  -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -p 8081:8080 -d quay.io/keycloak/keycloak:24.0 start-dev
```

### 2. Backend

```bash
cd posBackend
cp .env.example .env           # fill in your values (or set env vars)
./mvnw spring-boot:run
# API available at http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui/index.html
```

Key environment variables (all have safe dev defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URL` | `jdbc:postgresql://localhost:5432/pos_db` | Database URL |
| `DB_USERNAME` | `pos_user` | Database user |
| `DB_PASSWORD` | `pos_pass` | Database password |
| `KEYCLOAK_URL` | `http://localhost:8081` | Keycloak base URL |
| `KEYCLOAK_REALM` | `pos` | Keycloak realm name |
| `MINIO_ENDPOINT` | `http://localhost:9000` | MinIO endpoint |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `product-images` | MinIO bucket name |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `POS_TAX_RATE` | `0` | Tax rate % (e.g. `16` for 16% VAT) |

### 3. Frontend

```bash
cd posFrontend
cp .env.example .env.local     # fill in your Keycloak + API URLs
npm install
npm run dev
# App available at http://localhost:5173
```

Key frontend env vars (`.env.local`):

```env
VITE_KEYCLOAK_URL=http://localhost:8081
VITE_KEYCLOAK_REALM=pos
VITE_KEYCLOAK_CLIENT_ID=pos-client
VITE_API_BASE_URL=http://localhost:8080
VITE_REDIRECT_URI=http://localhost:5173
```

---

## 🔑 Authentication & Roles

All API endpoints (except product images, register, and report summary) require a valid **Keycloak JWT**.

| Keycloak Role | Permissions |
|--------------|-------------|
| `admin` | Full access — manage users, products, sales, categories, reports |
| `manager` | All except user management |
| `cashier` | Checkout / create sales only |
| `clerk` | Stock adjustments only |

Roles must be assigned in Keycloak **Realm Roles** and assigned to users in Keycloak admin console.

---

## 📡 Key API Endpoints

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sale` | Create a sale (validates stock, computes tax + change) |
| `GET` | `/api/sale` | List sales (paginated) |
| `GET` | `/api/sale/{id}` | View single sale with items |
| `GET` | `/api/sale/{id}/receipt` | Plain-text receipt |
| `POST` | `/api/sale/{id}/return` | Process return (restores stock) |
| `DELETE` | `/api/sale/{id}` | Delete sale record |

Sale request body:
```json
{
  "cashierId": "keycloak-user-id",
  "paymentMethod": "CASH",
  "items": [{ "productId": 1, "quantity": 2 }],
  "amountTendered": 500.00
}
```

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/product/create` | Create product (multipart with image) |
| `GET` | `/api/product` | List all products |
| `GET` | `/api/product/{id}` | Get single product |
| `PUT` | `/api/product/{id}` | Update product (no image) |
| `PUT` | `/api/product/{id}/with-image` | Update product with new image |
| `DELETE` | `/api/product/{id}` | Delete product |
| `POST` | `/api/product/{id}/stock-adjustment` | Adjust stock (delta + reason) |
| `GET` | `/api/product/{id}/stock-movements` | View stock movement history |
| `GET` | `/api/product/low-stock` | Products at or below threshold |

### Reports / Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/report/summary` | Today/month KPIs, chart data, recent sales, top products |
| `GET` | `/api/report/low-stock` | Low stock product list |

---

## 🧰 Production Deployment

```bash
# Backend (prod profile uses validate DDL, no SQL logging, secure cookies)
SPRING_PROFILES_ACTIVE=prod ./mvnw spring-boot:run

# Or build jar and run
./mvnw clean package -DskipTests
java -jar target/pos-*.jar --spring.profiles.active=prod
```

For production set all environment variables — **never use default credentials**.

---

## 📋 Changelog — Production Hardening (6 Sectors)

### Sector 1 — Critical Bug Fixes
1. **`BlogController` NPE** — `blogService` was never injected; added `@RequiredArgsConstructor` and injected via interface
2. **`Cart.user_id` type mismatch** — `int` → `Long`; added `@Column(unique=true)`; added `findByUserId(Long)` to repository; fixed cascade; all `RuntimeException` → `ResponseStatusException`
3. **`SalesService.createSales()`** — was a stub returning `null`; full rewrite validates stock per item, deducts inventory, logs `StockMovement`, and computes total
4. **`CategoryService.delete()` Uncategorized bug** — `categoryRepository.delete()` was outside the guard block; would delete the protected Uncategorized category
5. **`Product` Lombok annotation conflict** — `@Data` conflicts with `@Builder` + explicit constructors; removed `@Data`, kept `@Getter/@Setter/@Builder/@AllArgsConstructor/@NoArgsConstructor`
6. **`Product.cartList @OneToMany` phantom join table** — `mappedBy` was missing, creating a phantom `product_cart_list` table; replaced with `saleItems` properly mapped

### Sector 2 — Critical Security
7. **MinIO credentials hardcoded** — `minioadmin/minioadmin` in source; externalized to `${MINIO_*}` env vars
8. **Password hash leak** — `UserController` was returning full `User` entity including `password` hash; now returns `UserResponse` DTO with only `{id, username, email, roles}`
9. **CORS hardcoded** — `localhost:5173` hardcoded in `SecurityConfig`; replaced with `${CORS_ALLOWED_ORIGINS}` comma-separated config property
10. **Auth strategy clarity** — Removed dead `UserDetailsServiceImpl` (never called); `User` entity gets `keycloakId` field linked to Keycloak `sub` claim; `UserRepository` gets `findByKeycloakId()` and `findByEmail()`
11. **Production DDL safety** — `ddl-auto: update` in prod would auto-migrate schema; created `application-prod.yml` with `ddl-auto: validate`, `show-sql: false`, hardened session cookies

### Sector 3 — Architecture
12. **Input validation** — Added `spring-boot-starter-validation`; all DTOs annotated with `@NotBlank`, `@NotEmpty`, `@Valid`, `@Min`, `@DecimalMin` etc.; `GlobalExceptionHandler` returns per-field error map `{errors: {field: message}}` on 400
13. **SKU / Barcode fields** — Added `sku` and `barcode` (both unique) to `Product`; `ProductRequest` includes optional `sku`, `barcode`, `lowStockThreshold`

### Sector 4 — Core POS Features
14. **Tax engine** — `pos.tax-rate` config property (set `POS_TAX_RATE=16` for 16% VAT); `SalesService` computes `taxAmount` and `total = subtotal + tax`; stored on `Sales.taxAmount`
15. **Cash handling** — `Sales` now stores `amountTendered` and `changeGiven`; service validates tendered ≥ total; `SaleRequest` accepts optional `amountTendered`
16. **Receipt endpoint** — `GET /api/sale/{id}/receipt` returns formatted plain-text receipt with item list, tax, total, tendered, and change

### Sector 5 — Reporting & Low-Stock Alerts
17. **Dashboard reporting API** — `GET /api/report/summary` returns all KPIs in one call: today/month revenue, sales counts, total products, low-stock count, daily chart data (last 30 days), recent 5 sales with items, top 5 products by quantity sold
18. **Low-stock alerts** — `lowStockThreshold` field added to `Product` (default: 5); `GET /api/report/low-stock` and `GET /api/product/low-stock` return products at or below threshold; threshold configurable per product

### Sector 6 — Frontend Data Wiring
19. **Dashboard stats** — `Stats.jsx` rewritten; shows real Today's Revenue, Month Revenue, Active Products, Low-Stock Alert count from `/api/report/summary`; loading skeleton while fetching
20. **Dashboard charts** — `Charts.jsx` rewritten; Daily Revenue bar chart (last 30 days) + Top Products horizontal bar chart, all from real data
21. **Recent transactions table** — `Tables.jsx` rewritten; shows last 5 real sales with items, amount, payment method, date, and status badge
22. **Transaction list** — `TransactionsComponent.jsx` uses `createdAt` (not non-existent `saleDate`); shows sale items table; pagination; retry button
23. **Checkout payload** — `CheckoutComponent.jsx` aligned with `SaleRequest` schema (no client-computed totals)
24. **Vite alias fix** — Removed broken `@mui/styled-engine` → `@mui/styled-engine-sc` alias (`@mui/styled-engine-sc` is not installed; project uses `@emotion`)
25. **Keycloak PKCE** — Added `pkceMethod: "S256"`; removed invalid wildcard `redirectUri`

---

## 🗺️ Roadmap

- [ ] Flyway database migrations (replace `ddl-auto: update`)
- [ ] Shift management (open/close till, opening/closing balance)
- [ ] Customer management entity
- [ ] Supplier / Purchase Order management
- [ ] Discount / coupon rules engine
- [ ] Redis cache for distributed deployments
- [ ] Unit and integration tests (Testcontainers)

---

## 📜 License

This project is licensed under the MIT License.
  




