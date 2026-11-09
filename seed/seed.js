/**
 * Idempotently seed the configured POS PostgreSQL database with the curated
 * Kenyan restaurant demo catalog. No unrelated rows are deleted or modified.
 *
 * Usage: DB_URL=postgresql://... npm run seed -- --apply
 * Without --apply, the script validates the catalog and reports the target DB.
 */

import pg from "pg";
import * as dotenv from "dotenv";
import { argv } from "node:process";
import { RESTAURANT_CATALOG, validateRestaurantCatalog } from "./restaurant-catalog.js";

dotenv.config();

const APPLY = argv.includes("--apply");
const DB_URL = process.env.DB_URL;
const CATALOG = RESTAURANT_CATALOG;

function maskedDatabaseTarget(value) {
  try {
    const target = new URL(value);
    return target.hostname + ":" + (target.port || "5432") + target.pathname;
  } catch {
    return "(unparseable DB_URL)";
  }
}

function assertCatalogIsValid() {
  const errors = validateRestaurantCatalog(CATALOG);
  if (errors.length) throw new Error("Catalog validation failed:\n- " + errors.join("\n- "));
}

async function assertSchema(client) {
  const result = await client.query(
    "SELECT column_name FROM information_schema.columns " +
      "WHERE table_schema = current_schema() AND table_name = 'product' " +
      "AND column_name = ANY($1::text[])",
    [["description", "cost_price", "available"]],
  );
  const columns = new Set(result.rows.map((row) => row.column_name));
  const missing = ["description", "cost_price", "available"].filter((column) => !columns.has(column));
  if (missing.length) {
    throw new Error("Product catalog migration is missing columns: " + missing.join(", ") + ". Deploy the backend migration first.");
  }
}

async function getDatabaseSummary(client) {
  const result = await client.query(
    "SELECT current_database() AS database_name, current_schema() AS schema_name, " +
      "(SELECT count(*) FROM category) AS categories, " +
      "(SELECT count(*) FROM product) AS products, " +
      "(SELECT count(*) FROM product WHERE sku LIKE 'KE-FOOD-%') AS seeded_products",
  );
  return result.rows[0];
}

async function upsertCategory(client, name) {
  const result = await client.query(
    "INSERT INTO category (name, product_count) VALUES ($1, 0) " +
      "ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
    [name],
  );
  return result.rows[0].id;
}

async function upsertProduct(client, product, categoryId) {
  await client.query(
    "INSERT INTO product " +
      "(name, description, price, cost_price, active, available, imageurl, discount, quantity, " +
      "low_stock_threshold, reorder_level, reorder_quantity, sku, category_id, created_at, updated_at) " +
      "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now()) " +
      "ON CONFLICT (sku) DO UPDATE SET " +
      "name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, " +
      "cost_price=EXCLUDED.cost_price, active=EXCLUDED.active, available=EXCLUDED.available, " +
      "imageurl=EXCLUDED.imageurl, discount=EXCLUDED.discount, quantity=EXCLUDED.quantity, " +
      "low_stock_threshold=EXCLUDED.low_stock_threshold, reorder_level=EXCLUDED.reorder_level, " +
      "reorder_quantity=EXCLUDED.reorder_quantity, category_id=EXCLUDED.category_id, updated_at=now()",
    [
      product.name, product.description, product.price, product.costPrice, product.active,
      product.available, product.imageURL, product.discount, product.quantity,
      product.lowStockThreshold, product.reorderLevel, product.reorderQuantity,
      product.sku, categoryId,
    ],
  );
}

async function verifySeed(client) {
  const result = await client.query(
    "SELECT (SELECT count(*) FROM category) AS total_categories, " +
      "(SELECT count(*) FROM product) AS total_products, " +
      "(SELECT count(*) FROM category WHERE name = ANY($1::text[])) AS seeded_categories, " +
      "(SELECT count(*) FROM product WHERE sku LIKE 'KE-FOOD-%') AS seeded_products, " +
      "(SELECT count(DISTINCT sku) FROM product WHERE sku LIKE 'KE-FOOD-%') AS unique_seeded_skus, " +
      "(SELECT count(*) FROM product WHERE sku LIKE 'KE-FOOD-%' AND " +
      "(name IS NULL OR description IS NULL OR category_id IS NULL OR price IS NULL " +
      "OR cost_price IS NULL OR active IS NOT TRUE OR available IS NOT TRUE OR quantity <= 0)) AS incomplete_products, " +
      "(SELECT count(*) FROM (SELECT c.id FROM category c JOIN product p ON p.category_id=c.id " +
      "WHERE c.name = ANY($1::text[]) GROUP BY c.id HAVING count(*)=20) category_counts) " +
      "AS categories_with_20_products",
    [CATALOG.map((category) => category.name)],
  );
  const counts = result.rows[0];
  const valid = Number(counts.seeded_categories) === 10
    && Number(counts.seeded_products) === 200
    && Number(counts.unique_seeded_skus) === 200
    && Number(counts.incomplete_products) === 0
    && Number(counts.categories_with_20_products) === 10;
  if (!valid) throw new Error("Database verification failed: " + JSON.stringify(counts));
  return counts;
}

async function main() {
  const errors = validateRestaurantCatalog(CATALOG);
  if (errors.length) throw new Error("Catalog validation failed:\n- " + errors.join("\n- "));
  if (!DB_URL) {
    throw new Error("Set DB_URL to the intended POS PostgreSQL database. The script has no fallback credentials.");
  }

  const pool = new pg.Pool({ connectionString: DB_URL, max: 2, connectionTimeoutMillis: 10000 });
  const client = await pool.connect();
  try {
    await assertSchema(client);
    const before = await getDatabaseSummary(client);
    console.log("Target database: " + before.database_name + "/" + before.schema_name +
      " (" + maskedDatabaseTarget(DB_URL) + ")");
    console.log("Before: " + before.categories + " categories, " + before.products +
      " products; " + before.seeded_products + " rows in the KE-FOOD seed namespace.");
    console.log("Catalog: " + CATALOG.length + " categories and " +
      CATALOG.reduce((total, category) => total + category.products.length, 0) + " products.");
    if (!APPLY) {
      console.log("Dry run only. Pass --apply to upsert the demo restaurant catalog.");
      return;
    }

    await client.query("BEGIN");
    try {
      const categoryIds = new Map();
      for (const category of CATALOG) {
        categoryIds.set(category.name, await upsertCategory(client, category.name));
      }
      for (const category of CATALOG) {
        const categoryId = categoryIds.get(category.name);
        for (const product of category.products) await upsertProduct(client, product, categoryId);
      }
      await client.query(
        "UPDATE category c SET product_count = " +
          "(SELECT count(*) FROM product p WHERE p.category_id = c.id) WHERE c.id = ANY($1::bigint[])",
        [[...categoryIds.values()]],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    const counts = await verifySeed(client);
    console.log("Verified: " + counts.seeded_categories + " seeded categories, " +
      counts.seeded_products + " products, " + counts.unique_seeded_skus +
      " unique SKUs, " + counts.incomplete_products + " incomplete rows.");
    console.log("Database totals: " + counts.total_categories + " categories, " +
      counts.total_products + " products.");
    console.log("Category product counts:");
    const categoryCounts = await client.query(
      "SELECT c.name, c.product_count, count(p.id) AS actual_products " +
        "FROM category c LEFT JOIN product p ON p.category_id=c.id " +
        "WHERE c.name = ANY($1::text[]) GROUP BY c.id ORDER BY c.name",
      [CATALOG.map((category) => category.name)],
    );
    for (const row of categoryCounts.rows) {
      console.log("- " + row.name + ": " + row.product_count + " recorded / " + row.actual_products + " actual");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Seeding failed: " + error.message);
  process.exitCode = 1;
});
