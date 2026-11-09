import unittest
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("upload_product_images", Path(__file__).with_name("upload-product-images.py"))
upload_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upload_module)
validate_manifest = upload_module.validate_manifest

download_spec = importlib.util.spec_from_file_location(
    "download_product_images", Path(__file__).with_name("download-product-images.py")
)
download_module = importlib.util.module_from_spec(download_spec)
download_spec.loader.exec_module(download_module)


def image_row(sku):
    return {
        "sku": sku,
        "filename": f"{sku}.jpg",
        "object_key": f"catalog/{sku}.jpg",
        "source_page": "https://commons.wikimedia.org/wiki/File:Food.jpg",
        "license": "CC BY-SA 4.0",
    }


class ProductImageManifestTest(unittest.TestCase):
    def test_accepts_200_unique_attributed_image_rows(self):
        rows = [image_row(f"KE-FOOD-{number:03}") for number in range(1, 201)]
        self.assertEqual(validate_manifest(rows), [])

    def test_rejects_duplicate_or_unsafe_image_mapping(self):
        first = image_row("KE-FOOD-001")
        second = image_row("KE-FOOD-001")
        second["object_key"] = "../outside.jpg"
        second["source_page"] = ""
        errors = validate_manifest([first, second], expected=2)
        self.assertTrue(any("Object key mismatch" in error for error in errors))
        self.assertTrue(any("Duplicate SKU" in error for error in errors))
        self.assertTrue(any("Missing attribution" in error for error in errors))

    def test_category_fallback_can_reuse_a_food_photo_for_every_product(self):
        product = {"name": "Chicken Pilau", "category": "Kenyan Classics"}
        category_photo = {"pageid": 42, "title": "Kenyan vegetable meal"}
        self.assertIsNone(download_module.choose_image([category_photo], product, set()))
        self.assertEqual(
            download_module.choose_image(
                [category_photo],
                product,
                {42},
                allow_unmatched=True,
                allow_reuse=True,
                allow_group_fallback=True,
            ),
            category_photo,
        )


if __name__ == "__main__":
    unittest.main()
