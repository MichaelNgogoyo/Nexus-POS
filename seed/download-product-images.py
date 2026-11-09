#!/usr/bin/env python3
"""Fetch freely licensed food photos for the KE-FOOD catalog from Wikimedia Commons.

The script only downloads files and writes an attribution manifest. It does not
connect to PostgreSQL or object storage; uploading and linking are separate steps.
"""

import argparse
import csv
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

USER_AGENT = "NexusPOS-DemoCatalog/1.0 (https://nexuspos.apperstar.com; food image seeding)"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
CATEGORY_SEARCH = {
    "Breakfast & Brunch": "Kenyan breakfast food",
    "Kenyan Classics": "Kenyan traditional food meal",
    "Swahili & Coastal": "Swahili coastal food meal",
    "Nyama Choma & Grills": "nyama choma grilled meat food",
    "Chicken & Poultry": "chicken food meal",
    "Fish & Seafood": "fish seafood food meal",
    "Vegetarian & Sides": "vegetarian food meal vegetables",
    "Snacks & Street Food": "Kenyan street food snack",
    "Beverages": "fruit juice tea coffee beverage",
    "Desserts & Bakery": "dessert cake bakery food",
}
GENERIC_TERMS = {"with", "and", "the", "portion", "plate", "fresh", "special", "style", "house", "side", "pair"}
NON_FOOD_TITLE_TERMS = {"linux", "karyotype", "microscope", "logo", "icon", "diagram", "map", "anatomy", "skeleton", "x-ray", "software"}
FOOD_GROUPS = (
    {"chicken", "poultry"},
    {"beef", "steak", "nyama", "meat"},
    {"goat", "mbuzi", "mutton", "lamb"},
    {"fish", "tilapia", "tuna", "salmon", "snapper", "seafood", "prawn", "shrimp", "crab", "octopus", "calamari"},
    {"pork", "bacon", "ham"},
    {"egg"},
)


def request_json(url, attempts=5):
    last_error = None
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except (OSError, urllib.error.URLError, json.JSONDecodeError) as error:
            last_error = error
            time.sleep(min(2 ** attempt, 12))
    raise RuntimeError(f"Commons request failed after {attempts} attempts: {last_error}")


def search_images(query, limit=25):
    parameters = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,
        "gsrlimit": limit,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime",
        "iiurlwidth": 640,
        "format": "json",
    }
    url = COMMONS_API + "?" + urllib.parse.urlencode(parameters)
    payload = request_json(url)
    pages = payload.get("query", {}).get("pages", {}).values()
    results = []
    for page in pages:
        title = page.get("title", "").removeprefix("File:")
        if any(term in title.lower() for term in NON_FOOD_TITLE_TERMS):
            continue
        image = (page.get("imageinfo") or [{}])[0]
        if image.get("mime") != "image/jpeg":
            continue
        metadata = image.get("extmetadata", {})
        license_name = plain_text(metadata.get("LicenseShortName", {}).get("value", ""))
        if not license_name:
            continue
        results.append({
            "pageid": page.get("pageid"),
            "title": title,
            "url": image.get("thumburl") or image.get("url"),
            "mime": image.get("mime"),
            "source_page": image.get("descriptionurl"),
            "creator": plain_text(metadata.get("Artist", {}).get("value", "")),
            "license": license_name,
            "license_url": plain_text(metadata.get("LicenseUrl", {}).get("value", "")),
        })
    return results


def plain_text(value):
    value = re.sub(r"<[^>]*>", " ", str(value))
    value = re.sub(r"\s+", " ", value).strip()
    for marker in (" I'd appreciate if", " This file is licensed", " You are free:"):
        value = value.split(marker, 1)[0]
    return value.strip()


def words(value):
    return {
        part[:-1] if part.endswith("s") and len(part) > 4 else part
        for part in re.findall(r"[a-z0-9]+", value.lower())
        if len(part) > 2
    }


def choose_image(candidates, product, used_pages, allow_unmatched=False, allow_reuse=False, allow_group_fallback=False):
    product_words = words(product["name"]) - GENERIC_TERMS
    required_group = next((group for group in FOOD_GROUPS if product_words & group), None)
    ranked = []
    for candidate in candidates:
        if not allow_reuse and candidate["pageid"] in used_pages:
            continue
        title_words = words(candidate["title"])
        if required_group and not (title_words & required_group) and not allow_group_fallback:
            continue
        overlap = len(product_words & title_words)
        ranked.append((overlap, candidate))
    if not ranked:
        return None
    ranked.sort(key=lambda entry: entry[0], reverse=True)
    return ranked[0][1] if ranked[0][0] > 0 or allow_unmatched else None


def download_image(image, destination):
    request = urllib.request.Request(image["url"], headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=40) as response:
        content_type = response.headers.get_content_type()
        body = response.read(10 * 1024 * 1024 + 1)
    if len(body) > 10 * 1024 * 1024:
        raise RuntimeError(f"Image is over 10 MB: {image['title']}")
    if content_type not in {"image/jpeg", "image/png"}:
        raise RuntimeError(f"Unexpected content type {content_type}: {image['title']}")
    is_jpeg = body.startswith(b"\xff\xd8\xff")
    if not is_jpeg:
        raise RuntimeError(f"Image bytes failed signature check: {image['title']}")
    target = destination.with_suffix(".jpg")
    target.write_bytes(body)
    return target.name


def load_products(path):
    products = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(products, list) or not products:
        raise ValueError("catalog JSON must be a non-empty array")
    for product in products:
        if not all(product.get(key) for key in ("sku", "name", "category")):
            raise ValueError("each product requires sku, name, and category")
    return products


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog-json", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--limit", type=int, help="Download only the first N products (for smoke tests).")
    args = parser.parse_args()

    products = load_products(args.catalog_json)
    if args.limit:
        products = products[:args.limit]
    args.output.mkdir(parents=True, exist_ok=True)

    category_cache = {}
    used_pages = set()
    manifest = []
    failures = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {pool.submit(search_images, product["name"], 20): product for product in products}
        for future in as_completed(jobs):
            product = jobs[future]
            try:
                candidates = future.result()
                image = choose_image(candidates, product, used_pages)
                if image is None:
                    keywords = sorted(words(product["name"]) - GENERIC_TERMS, key=len, reverse=True)
                    for keyword in keywords[:2]:
                        candidates.extend(search_images(keyword, 15))
                        image = choose_image(candidates, product, used_pages)
                        if image is not None:
                            break
                if image is None:
                    category = product["category"]
                    if category not in category_cache:
                        category_cache[category] = search_images(CATEGORY_SEARCH.get(category, category + " food"), 50)
                    image = choose_image(category_cache[category], product, used_pages, allow_unmatched=True)
                if image is None:
                    image = choose_image(candidates, product, used_pages, allow_reuse=True)
                if image is None:
                    image = choose_image(
                        category_cache.get(product["category"], []),
                        product,
                        used_pages,
                        allow_unmatched=True,
                        allow_reuse=True,
                        allow_group_fallback=True,
                    )
                if image is None:
                    failures.append({"sku": product["sku"], "reason": "No suitable distinct image found"})
                    continue
                extension = ".jpg" if image["mime"] == "image/jpeg" else ".png"
                filename = download_image(image, args.output / (product["sku"] + extension))
                used_pages.add(image["pageid"])
                manifest.append({
                    "sku": product["sku"],
                    "product_name": product["name"],
                    "category": product["category"],
                    "filename": filename,
                    "object_key": f"catalog/{filename}",
                    "source_title": image["title"],
                    "source_page": image["source_page"],
                    "creator": image["creator"],
                    "license": image["license"],
                    "license_url": image["license_url"],
                })
                print(f"Downloaded {product['sku']} ({len(manifest)}/{len(products)})", flush=True)
            except Exception as error:  # Keep going so the final report lists all gaps.
                failures.append({"sku": product["sku"], "reason": str(error)})

    manifest.sort(key=lambda row: row["sku"])
    with (args.output / "manifest.csv").open("w", newline="", encoding="utf-8") as stream:
        fields = ["sku", "product_name", "category", "filename", "object_key", "source_title", "source_page", "creator", "license", "license_url"]
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(manifest)
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    sql_values = []
    for row in manifest:
        if not re.fullmatch(r"KE-FOOD-\d{3}", row["sku"]) or not re.fullmatch(r"catalog/KE-FOOD-\d{3}\.jpg", row["object_key"]):
            raise ValueError("Unsafe product image mapping")
        sql_values.append(f"('{row['sku']}', '{row['object_key']}')")
    sql = f"""BEGIN;
CREATE TEMP TABLE product_image_manifest (sku varchar(255) PRIMARY KEY, imageurl varchar(255) NOT NULL);
INSERT INTO product_image_manifest (sku, imageurl) VALUES
""" + ",\n".join(sql_values) + f""";
UPDATE product p SET imageurl = m.imageurl
FROM product_image_manifest m
WHERE p.sku = m.sku AND p.imageurl IS DISTINCT FROM m.imageurl;
DO $$
BEGIN
  IF (SELECT count(*) FROM product_image_manifest) <> {len(manifest)} OR
     (SELECT count(*) FROM product p JOIN product_image_manifest m USING (sku) WHERE p.imageurl = m.imageurl) <> {len(manifest)} THEN
    RAISE EXCEPTION 'Expected exactly {len(manifest)} product image mappings to match';
  END IF;
END $$;
COMMIT;
"""
    (args.output / "image-update.sql").write_text(sql, encoding="utf-8")
    (args.output / "report.json").write_text(json.dumps({"requested": len(products), "downloaded": len(manifest), "failures": failures}, indent=2), encoding="utf-8")
    print(f"Image download report: {len(manifest)} downloaded, {len(failures)} failed.", flush=True)
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
