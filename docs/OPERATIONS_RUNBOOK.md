# Operations runbook (draft)

**Status:** operational design checklist. Commands requiring credentials/services must be confirmed against the target environment before execution.

## Local development

Repository instructions currently describe PostgreSQL, Keycloak, and MinIO as local dependencies. Backend and frontend can be started separately using the README instructions after environment variables are configured. Use the JDK compatible with the project target; do not copy credentials from `.env` into terminal output or logs. Local service URLs, Keycloak realm/client, roles, database migrations, and CORS must be aligned before attempting a sign-in flow.

## Health and diagnosis

1. Check container/process health and recent logs; never include access tokens, passwords, payment credentials, or full guest records in shared output.
2. Check backend health endpoint and database connectivity.
3. Check Keycloak issuer reachability and frontend redirect/CORS configuration.
4. For missing menu images, verify MinIO health, bucket policy, and signed/backend URL behavior.
5. For a payment in pending/unknown state, query the provider by idempotency/provider reference and reconcile before retrying or marking paid.
6. For an absent kitchen ticket, inspect order submission, ticket creation, and outbox/consumer state using correlation IDs; do not manually duplicate a paid sale to force a ticket.
7. For folio uncertainty, query PMS by idempotency/reference and reconcile before retrying the posting.

## Recovery controls to implement and test

- **Database:** scheduled encrypted backups, off-host copy, retention, monitored failures, and restoration rehearsal to an isolated instance. No verified recovery evidence is currently recorded.
- **Migrations:** use approved, versioned migration; snapshot/backup before high-risk changes; stop if migration validation fails; use forward repair for irreversible data movement.
- **Payment/PMS:** retain durable pending/unknown attempts, provider references, signed callback results, replay detection, and reconciliation queue/report. Never infer success from a browser timeout.
- **Desktop offline sync:** define queue ownership, conflict policy, retry backoff/dead-letter review, and an operator resolution screen before enabling transactional writes. Never blindly replay payment or folio operations.
- **Audit/logs:** correlation IDs and safe event data; restricted access/retention; avoid logging secrets or unnecessary guest PII.

## Incident responsibilities to assign

Before live deployment, name an owner for failed/unknown payments, folio reconciliation, database restore, Keycloak account/role issues, stock correction, and deployment rollback. Document escalation contacts and provider support references without storing secrets here.

## Not yet verified

Backup/restore, production health checks, alert delivery, payment/PMS reconciliation, dead-letter recovery, desktop conflict resolution, TLS/proxy behavior, and rollback procedures require environment-level rehearsal.
