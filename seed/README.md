# Kenyan restaurant demo catalog

This seeder inserts ten Kenyan restaurant categories and 200 curated products
(20 per category) into the configured POS PostgreSQL database. Product records
include a short menu description, stable SKU, KES selling price, internal cost
price, active status, availability, stock and reorder thresholds.

The script only upserts the reserved KE-FOOD SKU namespace and the ten catalog
category names. It does not delete or rewrite unrelated records. Reruns update
these demo rows in place. Because demo stock quantities are reset to their
catalog values on rerun, avoid rerunning after using those items for inventory
testing unless you want to restore the initial demo quantities.

## Local use

Apply the backend migration first, then use a PostgreSQL connection URL for the
POS database. The script does not supply fallback credentials.

    cd seed
    npm ci
    DB_URL='postgresql://USER:PASSWORD@HOST:5432/pos_db' npm run seed
    DB_URL='postgresql://USER:PASSWORD@HOST:5432/pos_db' npm run seed -- --apply

The first command is read-only. The second writes inside a single transaction
and verifies all seeded categories, product counts, required fields and unique
SKUs before it exits successfully. Do not pass a production database URL from
an untrusted shell or place it in source control.

The existing active field is the product status; available is the separate POS
availability flag. The cost_price field is internal and excluded from JSON
product responses.
