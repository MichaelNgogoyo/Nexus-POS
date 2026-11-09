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

## Product photos

`download-product-images.py` finds food photos on Wikimedia Commons, downloads
JPEGs, and writes `manifest.csv` / `manifest.json` with source and license
credits. The manifest is designed for the 200 stable `KE-FOOD-*` SKUs. It also
creates `image-update.sql`, which updates only those SKUs and verifies every
mapping. No product image binary or credit is fabricated.

```sh
node --input-type=module -e "import { RESTAURANT_CATALOG } from './restaurant-catalog.js'; console.log(JSON.stringify(RESTAURANT_CATALOG.flatMap(c => c.products.map(({sku,name,category}) => ({sku,name,category})))));" > /tmp/pos-food-products.json
python3 download-product-images.py --catalog-json /tmp/pos-food-products.json --output /tmp/pos-food-images
```

Configure an `mc` alias using the restricted MinIO application credential from
the deployment secret store. Keep the mc configuration directory private, then
upload and verify every object:

```sh
MC_CONFIG_DIR=/tmp/pos-mc-config mc alias set nexuspos http://127.0.0.1:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"
MC_CONFIG_DIR=/tmp/pos-mc-config MINIO_BUCKET=product-images \
  python3 upload-product-images.py --mc "$(command -v mc)" /tmp/pos-food-images/manifest.json
```

Then apply `/tmp/pos-food-images/image-update.sql` to the POS database. The
image manifest's credits should be retained with the deployment; photos may
require attribution under their listed Creative Commons licenses. The
catalog's stable image keys match those uploaded by this process.
