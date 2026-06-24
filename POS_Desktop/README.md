# POS Desktop (JavaFX)

Production-ready skeleton for an online/offline POS desktop client. JavaFX UI, SQLite cache, background sync to the REST API, and module stubs for products, inventory, sales, reports, and users.

## What was built
- JavaFX entry point with login and tabbed module shell: [src/main/java/com/pos/desktop/PosDesktopApplication.java](src/main/java/com/pos/desktop/PosDesktopApplication.java)
- Online/offline infra: HTTP client, SQLite store, sync queue, scheduler: [core/](src/main/java/com/pos/desktop/core)
- Auth flow with cached session support: [AuthService](src/main/java/com/pos/desktop/auth/AuthService.java), [SessionStore](src/main/java/com/pos/desktop/auth/SessionStore.java)
- Generic CRUD + sync service per module: [ModuleService](src/main/java/com/pos/desktop/service/ModuleService.java)
- Domain models for all POS areas: [model/](src/main/java/com/pos/desktop/model)
- Lightweight JavaFX UI components: [LoginPane](src/main/java/com/pos/desktop/ui/LoginPane.java), [MainPane](src/main/java/com/pos/desktop/ui/MainPane.java), [ModulePane](src/main/java/com/pos/desktop/ui/components/ModulePane.java)
- Local schema and config: [application.properties](src/main/resources/application.properties), [schema.sql](src/main/resources/db/schema.sql)

## How to run (you do)
1. Install Java 17+ and Maven.
2. Set API endpoints in [application.properties](src/main/resources/application.properties) (`app.api.baseUrl`, `app.api.healthUrl`).
3. Fast run with the provided script (delegates to the JavaFX Maven plugin to set module/class path correctly):
   ```bash
   cd POS_Desktop
   ./run.sh
   ```
4. Or run via Maven:
   ```bash
   mvn -f "POS_Desktop/pom.xml" clean javafx:run
   ```
5. Build a trimmed runtime image (optional):
   ```bash
   mvn -f "POS_Desktop/pom.xml" clean javafx:jlink
   ```

## Offline/online behavior
- Reads prefer the API when reachable; responses are cached to SQLite for offline reuse.
- Mutations enqueue to `sync_queue` when offline; a background scheduler pushes them once connectivity returns.
- Health checks hit `app.api.healthUrl`; tune intervals via `app.sync.interval.seconds` and `app.sync.batchSize`.

## Things you still need to wire
1. **Real API contracts**: Align payloads and endpoints (`/auth/login`, `/products`, `/inventory`, `/sales`, `/reports`, `/users`). Update parsing in `ModuleService` and `AuthService` if your shapes differ.
2. **Auth hardening**: Replace the simple login payload with your auth scheme (tokens, refresh, MFA) and decide on offline login rules.
3. **UI/UX**: Replace sample add buttons and `toString()` views with real forms, validation, and table layouts per module.
4. **Business logic**: Add module-specific rules (tax, discounts, inventory reservations, reporting filters) inside dedicated services.
5. **Packaging**: Sign/distribute installers for target OSes; configure `javafx-maven-plugin` classifiers if shipping cross-platform.
6. **Testing**: Add unit/integration tests for sync, auth, and data mapping.

## Notes
- SQLite file defaults to `./data/pos-desktop.db`; adjust path in config.
- Sync currently uses PUT to `/apiPath/{id}` for upserts and DELETE for removals.
- The module UI uses sample data builders; replace with real input forms and validations.
