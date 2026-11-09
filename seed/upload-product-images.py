#!/usr/bin/env python3
"""Upload validated Commons photos using an already configured `mc` alias."""

import argparse
import concurrent.futures
import json
import os
import re
import subprocess
from pathlib import Path


def validate_manifest(rows, expected=200):
    errors = []
    if not isinstance(rows, list) or len(rows) != expected:
        return [f"Expected {expected} image rows."]
    skus, keys = set(), set()
    for row in rows:
        sku = row.get("sku", "")
        key = row.get("object_key", "")
        if not re.fullmatch(r"KE-FOOD-\d{3}", sku):
            errors.append(f"Invalid SKU: {sku}")
        if key != f"catalog/{sku}.jpg":
            errors.append(f"Object key mismatch for {sku}")
        if sku in skus:
            errors.append(f"Duplicate SKU: {sku}")
        if key in keys:
            errors.append(f"Duplicate object key: {key}")
        if not row.get("source_page") or not row.get("license"):
            errors.append(f"Missing attribution for {sku}")
        filename = row.get("filename", "")
        if Path(filename).name != filename or not filename.endswith(".jpg"):
            errors.append(f"Invalid filename for {sku}")
        skus.add(sku)
        keys.add(key)
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--expected", type=int, default=200)
    parser.add_argument("--mc", default=os.environ.get("MC_BIN", "mc"))
    args = parser.parse_args()

    rows = json.loads(args.manifest.read_text(encoding="utf-8"))
    errors = validate_manifest(rows, args.expected)
    if errors:
        raise SystemExit("Manifest validation failed:\n- " + "\n- ".join(errors))

    alias = os.environ.get("MC_ALIAS", "nexuspos")
    bucket = os.environ.get("MINIO_BUCKET", "product-images")
    subprocess.run([args.mc, "ls", f"{alias}/{bucket}"], check=True, capture_output=True, text=True)
    base = args.manifest.resolve().parent

    def upload(row):
        file_path = (base / row["filename"]).resolve()
        if not file_path.is_relative_to(base) or not file_path.is_file():
            raise ValueError(f"Missing or unsafe file for {row['sku']}")
        target = f"{alias}/{bucket}/{row['object_key']}"
        subprocess.run(
            [args.mc, "cp", "--quiet", "--attr", "Content-Type=image/jpeg", str(file_path), target],
            check=True,
            capture_output=True,
            text=True,
        )
        subprocess.run([args.mc, "stat", target], check=True, capture_output=True, text=True)

    completed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(upload, row) for row in rows]
        for future in concurrent.futures.as_completed(futures):
            future.result()
            completed += 1
            if completed % 20 == 0 or completed == len(rows):
                print(f"Uploaded and verified {completed}/{len(rows)} objects.", flush=True)


if __name__ == "__main__":
    main()
