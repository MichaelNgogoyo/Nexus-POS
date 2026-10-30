# Deployment design and current constraints

**Status:** deployment plan for review. No deployment was performed as part of this design stage.

## Current deployment assets

The repository contains backend and frontend Dockerfiles, `docker-compose.production.yml`, Nginx configuration, runtime frontend configuration, and `.github/workflows/deploy.yml`. The workflow inventory found a deployment workflow but no separate pull-request CI workflow. The backend POM targets Java 17 and invokes a frontend Maven plugin configured for Node 22.16.0/npm 10.9.2; the frontend lockfile/package scripts are also present.

Production application configuration uses Hibernate schema validation. The repository has SQL files `V20261027_01__hotel_pos_sale_fields.sql` and `V20261027_02__link_cash_sales_to_kitchen_orders.sql`, but no Flyway/Liquibase Maven dependency; migration application/rollback must be explicitly performed and tested. Do not assume the SQL runs automatically. Production must apply both migrations in order before deploying this schema version.

## Environments

Maintain separate configuration and credentials for local development, automated tests, staging, and production. Keep secrets out of source, image layers, frontend bundles, logs, and CI pull-request output. Frontend runtime URLs, Keycloak issuer/realm/client/redirect, API CORS origins, MinIO policy, and provider callback URLs must agree per environment.

## Proposed release path

1. CI validates formatting/lint, backend compile/tests, frontend build/tests, migration checks, dependency scans, and container build.
2. Deploy immutable commit-SHA images to staging with non-production credentials.
3. Apply forward-compatible migration to a disposable/staging database and verify schema/application compatibility.
4. Run health/auth/API and critical workflow smoke tests, including sandbox provider/PMS flows when configured.
5. Verify current database backup and a restoration rehearsal; document rollback or forward-recovery steps.
6. Require explicit authorized approval before production release; production deployment and destructive database changes remain outside this design task.

## Deployment readiness prerequisites

- Confirm domain, TLS termination, DNS, firewall/public ports, and trusted proxy headers.
- Pin container image versions and configure health checks, graceful shutdown, persistence, resource limits, and non-root execution where supported.
- Confirm database migrations are versioned, tested against prior schema and representative data, and have forward recovery.
- Configure Keycloak public issuer/redirect/client and exact API CORS origins; verify realm import/provisioning and roles.
- Keep PostgreSQL and MinIO administration private. Verify backup schedule, off-host retention, and restore procedure.
- Configure payment/PMS/eTIMS callbacks only after provider sandbox contract testing and secret provisioning.
- Inspect the actual GitHub workflow behavior, required secrets, deployment permissions, immutable tags, health checks, and rollback; YAML presence alone is not verification.

## Verification limitation

No isolated PostgreSQL/Keycloak/MinIO/PMS/payment sandbox or staging deployment evidence was available in the documented baseline. Deployment readiness remains unverified.
