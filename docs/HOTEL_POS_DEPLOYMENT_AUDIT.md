# Hotel POS rebuild — review and deployment notes

## Review status

This branch is **not production-ready yet**. The frontend production bundle and Java unit/web tests pass, but frontend-to-backend runtime checks could not be completed without local PostgreSQL, Keycloak, and MinIO services. Card, M-Pesa, and hotel-folio settlement are deliberately blocked until real providers are configured.

## Changes in this branch

- Replaced the dark cashier screen with a warm, responsive hotel dining POS. It reads products, categories, tables, tax/service rates, and guest matches from the Java APIs and uses the existing Keycloak sign-in and cart.
- Replaced fabricated customer, table, order, kitchen-ticket, reservation, and shift records with live API data and clear empty/loading/error states. Removed estimated product profit and static report trend/recommendation claims that the APIs do not provide.
- Added selectable menu modifiers and kitchen notes to the sale/order item contracts. The backend validates modifier-group constraints and calculates modifier prices from catalog data.
- Added server-priced room-charge order creation with input bounds, open-order status, room number, guest, notes, configured tax/service calculations, and an idempotency key. This creates an order; it does not post to a room folio.
- Added role checks for sales, orders, tables, guest records, modifiers, kitchen, shifts, reports, audit records, and inventory/finance actions. Public self-registration is now disabled; user creation requires an admin role.
- Sales now use catalog prices, locked product rows, server-calculated tax/service totals, a request idempotency key, authenticated cashier identity, soft voids with stock restoration, and audit entries. Partial returns are rejected.
- Replaced the vulnerable `xlsx` dependency and its Excel export with quoted UTF-8 CSV exports. Updated compatible dependency versions with `npm audit fix`.
- Replaced a tracked seed configuration credential with an environment variable. Rotate the former credential because it may remain in repository history.
- Added the production schema changes at `posBackend/src/main/resources/db/migration/V20261027_01__hotel_pos_sale_fields.sql`. Production uses Hibernate `ddl-auto=validate`, so apply this SQL before deploying this version.

## Checks run

- `npm run lint` — passed with 14 warnings in existing files; no errors.
- `npm run build -- --outDir /tmp/nexus-pos-touch-build-final --emptyOutDir` — passed.
- `npm audit fix` completed earlier with 0 reported vulnerabilities. A fresh `npm_config_cache=/tmp/nexus-npm-cache npm audit --audit-level=high` could not reach the npm advisory endpoint; current online audit status is inconclusive.
- `JAVA_HOME=/home/apperstar/.jdks/ms-21.0.11 PATH=/home/apperstar/.jdks/ms-21.0.11/bin:$PATH ./mvnw -B -Dfrontend.skip=true test` — passed, 14 tests, 0 failures/errors (Java 21 compiler targeting Java 17).
- Docker runtime check — unavailable because the Docker daemon is not running. No local PostgreSQL/Keycloak/MinIO services or credentials were available for an end-to-end test.

Backend tests cover server-side order authorization and duplicate sale submissions. The Java suite compiled successfully with a Java 21 JDK targeting Java 17.

## Open items before production

- Configure and test the hotel’s tax and service-charge percentages. Both defaults are `0`; do not deploy with those defaults unless they are correct for the property.
- Connect and test the payment gateway(s). Only cash checkout is enabled. Card, M-Pesa, and mixed payments are disabled in the UI and rejected by the backend.
- Connect the hotel property-management/folio API. Room-charge orders are saved to the restaurant order list, but no guest folio is charged.
- Manager-authorized discounts are not implemented; do not apply discounts outside the existing supported server workflow.
- Critical workflow gap: cash dine-in/takeaway checkout creates a `Sale`, but the kitchen ticket API reads tickets associated with `RestaurantOrder`. The current cashier checkout does not create/link that restaurant order, so completed POS sales will not appear in the kitchen queue. Link these flows and verify end-to-end before live service.
- Refund processing currently restores stock and marks a sale returned; it does not execute or reconcile a cash/card refund. Partial returns are unsupported.
- Run the Java suite, apply the migration to a staging database, verify Keycloak role claims, test race/retry behavior and receipts, and complete a browser-to-API deployment rehearsal before production use.
- The old `application-seed-local.yml` credential was present in tracked history. Revoke/rotate it outside this branch.

## Run locally

Start PostgreSQL, Keycloak, and MinIO using the repository’s existing Quick Start instructions in `README.md`. Configure the `pos` Keycloak realm, public PKCE client, redirect URI, and roles `admin`, `manager`, `cashier`, `stock_clerk`, and `kitchen`.

Backend, from `posBackend/`:

```bash
SPRING_PROFILES_ACTIVE=dev \
DB_URL=jdbc:postgresql://localhost:5432/pos_db \
DB_USERNAME=pos_user DB_PASSWORD='REPLACE_WITH_DB_PASSWORD' \
KEYCLOAK_ISSUER_URI=http://localhost:8081/realms/pos \
CORS_ALLOWED_ORIGINS=http://localhost:5173 \
POS_TAX_RATE=0 POS_SERVICE_CHARGE_RATE=0 \
./mvnw spring-boot:run
```

Frontend, from `posFrontend/`:

```bash
VITE_API_BASE_URL=http://localhost:8080 \
VITE_KEYCLOAK_URL=http://localhost:8081 \
VITE_KEYCLOAK_REALM=pos \
VITE_KEYCLOAK_CLIENT_ID=pos-client \
VITE_REDIRECT_URI=http://localhost:5173 \
npm run dev -- --host 0.0.0.0
```

## Deploy with the production Compose file

On the VPS, copy the example without overwriting an existing environment file, then edit every placeholder and set real registry image names and property tax/service rates:

```bash
cp -n .env.production.example .env
```

Build/tag the backend and frontend images, then set `BACKEND_IMAGE` and `FRONTEND_IMAGE` in `.env` to those image tags. Replace the build arguments below with the public HTTPS endpoints for this installation:

```bash
docker build -f docker/Dockerfile.backend -t nexus-pos-backend:hotel-pos .
docker build -f docker/Dockerfile.frontend \
  --build-arg VITE_API_BASE_URL=https://pos.example.com/api \
  --build-arg VITE_KEYCLOAK_URL=https://auth.example.com \
  --build-arg VITE_KEYCLOAK_REALM=pos \
  --build-arg VITE_KEYCLOAK_CLIENT_ID=pos-client \
  --build-arg VITE_REDIRECT_URI=https://pos.example.com \
  -t nexus-pos-frontend:hotel-pos .
```

Configure Keycloak’s public issuer URL, frontend redirect, and exact CORS origin to the HTTPS domain. The example hostnames above are placeholders.

Start the database and apply the migration before starting the new backend:

```bash
set -a
. ./.env
set +a
docker compose -f docker-compose.production.yml up -d postgres
docker compose -f docker-compose.production.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < posBackend/src/main/resources/db/migration/V20261027_01__hotel_pos_sale_fields.sql
```

Then start the stack and inspect service health:

```bash
docker compose -f docker-compose.production.yml config
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml ps
```

The production Compose file exposes the frontend HTTP port; terminate TLS at the VPS reverse proxy and forward the configured domain to that port. Configure DNS, TLS, firewall rules, backups, and a populated Keycloak realm separately.
