/**
 * POS Product Seeder
 * ──────────────────
 * Generates PRODUCT_COUNT fake products, fetches images from Unsplash (or
 * picsum.photos as fallback), uploads them to MinIO, and inserts the products
 * directly into PostgreSQL.
 *
 * Usage:
 *   cp .env.example .env          # fill in your values
 *   npm install
 *   npm run seed                  # insert products
 *   npm run seed -- --clean       # wipe products first, then re-seed
 */

import { faker } from "@faker-js/faker";
import { Client as MinioClient } from "minio";
import pg from "pg";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
import { Readable } from "stream";
import { argv } from "process";

dotenv.config();

// ── Config ────────────────────────────────────────────────────────────────────

const PRODUCT_COUNT = parseInt(process.env.PRODUCT_COUNT ?? "1000", 10);
const CONCURRENCY   = parseInt(process.env.CONCURRENCY  ?? "8",    10);
const CLEAN         = argv.includes("--clean");

const DB_URL           = process.env.DB_URL           ?? "postgresql://postgres:postgres@localhost:5432/pos_db";
const MINIO_ENDPOINT   = process.env.MINIO_ENDPOINT   ?? "localhost";
const MINIO_PORT       = parseInt(process.env.MINIO_PORT ?? "9000", 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? "minioadmin";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? "minioadmin";
const MINIO_BUCKET     = process.env.MINIO_BUCKET     ?? "product-images";
const MINIO_USE_SSL    = process.env.MINIO_USE_SSL    === "true";
const UNSPLASH_KEY     = process.env.UNSPLASH_ACCESS_KEY ?? "";

// ── Product categories with matching image keywords ───────────────────────────

const CATEGORIES = [
  { name: "Electronics",  keywords: ["electronics", "gadget", "technology", "computer"] },
  { name: "Beverages",    keywords: ["coffee", "drinks", "juice", "beverage"] },
  { name: "Dairy",        keywords: ["milk", "cheese", "yogurt", "dairy"] },
  { name: "Bakery",       keywords: ["bread", "bakery", "cake", "pastry"] },
  { name: "Produce",      keywords: ["vegetables", "fruit", "farm", "fresh food"] },
  { name: "Meat",         keywords: ["meat", "butcher", "protein", "steak"] },
  { name: "Clothing",     keywords: ["fashion", "clothing", "apparel", "shirt"] },
  { name: "Stationery",   keywords: ["stationery", "office supplies", "notebook", "pen"] },
  { name: "Household",    keywords: ["home", "household", "cleaning", "kitchen"] },
  { name: "Pharmacy",     keywords: ["medicine", "health", "pharmacy", "vitamins"] },
];

// ── Clients ───────────────────────────────────────────────────────────────────

const pool = new pg.Pool({ connectionString: DB_URL });

const minio = new MinioClient({
  endPoint: MINIO_ENDPOINT,
  port:     MINIO_PORT,
  useSSL:   MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Run tasks with a max concurrency cap */
async function withConcurrency(items, concurrency, task) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await task(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

/** Fetch an image buffer from Unsplash or picsum fallback */
async function fetchImage(keywords) {
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];

  let url;
  if (UNSPLASH_KEY) {
    // Official Unsplash API — returns JSON with image urls
    const apiUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=squarish&client_id=${UNSPLASH_KEY}`;
    const res = await fetch(apiUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`Unsplash API error ${res.status}`);
    const json = await res.json();
    url = json.urls?.regular ?? json.urls?.full;
    if (!url) throw new Error("No URL in Unsplash response");
  } else {
    // picsum.photos — totally free, no key needed
    const seed = Math.floor(Math.random() * 1000);
    url = `https://picsum.photos/seed/${seed}/800/800`;
  }

  const imgRes = await fetch(url, { redirect: "follow" });
  if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status} from ${url}`);

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
  return { buffer, contentType };
}

/** Upload buffer to MinIO; returns the object name (stored as imageURL in DB) */
async function uploadToMinio(buffer, contentType) {
  const ext = contentType.includes("png") ? ".png" : ".jpg";
  const objectName = `${faker.string.uuid()}${ext}`;

  await minio.putObject(
    MINIO_BUCKET,
    objectName,
    Readable.from(buffer),
    buffer.length,
    { "Content-Type": contentType }
  );

  return objectName;
}

/** Ensure MinIO bucket exists */
async function ensureBucket() {
  const exists = await minio.bucketExists(MINIO_BUCKET);
  if (!exists) {
    await minio.makeBucket(MINIO_BUCKET, "us-east-1");
    console.log(`  ✓ Created MinIO bucket: ${MINIO_BUCKET}`);
  }
}

/** Upsert categories, return map of name → id */
async function upsertCategories(client) {
  const map = {};
  for (const cat of CATEGORIES) {
    const res = await client.query(
      `INSERT INTO category (name, product_count)
       VALUES ($1, 0)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [cat.name]
    );
    map[cat.name] = res.rows[0].id;
  }
  return map;
}

/** Generate a random SKU */
function makeSku(index) {
  return `PRD-${String(index).padStart(6, "0")}`;
}

/** Generate a random EAN-13-style barcode */
function makeBarcode() {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  // Compute check digit
  const check =
    (10 -
      (digits.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) %
    10;
  return [...digits, check].join("");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║           POS Product Seeder                 ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`  Products    : ${PRODUCT_COUNT}`);
  console.log(`  Concurrency : ${CONCURRENCY}`);
  console.log(`  Images      : ${UNSPLASH_KEY ? "Unsplash API" : "picsum.photos (free fallback)"}`);
  console.log(`  MinIO       : ${MINIO_ENDPOINT}:${MINIO_PORT} → ${MINIO_BUCKET}`);
  console.log(`  Database    : ${DB_URL.replace(/:\/\/[^@]+@/, "://<credentials>@")}`);
  console.log();

  const client = await pool.connect();

  try {
    await ensureBucket();

    if (CLEAN) {
      console.log("  ⚠  --clean: deleting all existing products…");
      await client.query("DELETE FROM product");
      await client.query("UPDATE category SET product_count = 0");
      console.log("  ✓  Cleared.\n");
    }

    console.log("  Upserting categories…");
    const categoryMap = await upsertCategories(client);
    console.log(`  ✓  ${Object.keys(categoryMap).length} categories ready.\n`);

    // Build the list of product indices to seed
    const indices = Array.from({ length: PRODUCT_COUNT }, (_, i) => i + 1);

    let done = 0;
    let failed = 0;

    await withConcurrency(indices, CONCURRENCY, async (idx) => {
      const cat = CATEGORIES[idx % CATEGORIES.length];
      const categoryId = categoryMap[cat.name];

      const name     = faker.commerce.productName();
      const price    = parseFloat(faker.commerce.price({ min: 50, max: 50000, dec: 2 }));
      const quantity = faker.number.int({ min: 0, max: 500 });
      const discount = faker.helpers.arrayElement([0, 0, 0, 5, 10, 15, 20, 25]);
      const active   = faker.datatype.boolean({ probability: 0.85 });
      const lowStock = faker.number.int({ min: 3, max: 15 });
      const sku      = makeSku(idx);
      const barcode  = makeBarcode();

      try {
        // 1. Fetch image
        const { buffer, contentType } = await fetchImage(cat.keywords);

        // 2. Upload to MinIO
        const imageURL = await uploadToMinio(buffer, contentType);

        // 3. Insert product
        await client.query(
          `INSERT INTO product
             (name, price, active, image_url, discount, quantity,
              low_stock_threshold, sku, barcode, category_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (sku) DO NOTHING`,
          [name, price, active, imageURL, discount, quantity,
           lowStock, sku, barcode, categoryId]
        );

        // 4. Bump category product count
        await client.query(
          "UPDATE category SET product_count = product_count + 1 WHERE id = $1",
          [categoryId]
        );

        done++;
        if (done % 50 === 0 || done === PRODUCT_COUNT) {
          const pct = ((done / PRODUCT_COUNT) * 100).toFixed(1);
          process.stdout.write(`\r  ⏳ ${done}/${PRODUCT_COUNT} (${pct}%)  `);
        }
      } catch (err) {
        failed++;
        // Non-fatal: log and continue
        process.stderr.write(`\n  ✗ [${idx}] ${name}: ${err.message}\n`);
      }
    });

    console.log(`\n\n  ✅ Done! Inserted: ${done}  Failed: ${failed}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n  ❌ Fatal:", err.message);
  process.exit(1);
});
