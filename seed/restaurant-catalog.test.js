import test from "node:test";
import assert from "node:assert/strict";
import { RESTAURANT_CATALOG, validateRestaurantCatalog } from "./restaurant-catalog.js";

test("Kenyan restaurant demo catalog has ten categories and twenty products in each", () => {
  assert.equal(RESTAURANT_CATALOG.length, 10);
  assert.deepEqual(RESTAURANT_CATALOG.map((category) => category.products.length), Array(10).fill(20));
  assert.equal(RESTAURANT_CATALOG.flatMap((category) => category.products).length, 200);
  assert.deepEqual(validateRestaurantCatalog(), []);
});

test("all seeded food products have unique names and SKUs with complete KES pricing", () => {
  const products = RESTAURANT_CATALOG.flatMap((category) => category.products);
  assert.equal(new Set(products.map((product) => product.name.toLocaleLowerCase("en-KE"))).size, 200);
  assert.equal(new Set(products.map((product) => product.sku)).size, 200);
  for (const product of products) {
    assert.match(product.sku, /^KE-FOOD-\d{3}$/);
    assert.equal(product.imageURL, `catalog/${product.sku}.jpg`);
    assert.ok(product.description.length > product.name.length);
    assert.ok(product.costPrice > 0 && product.costPrice < product.price);
    assert.ok(product.price >= 80 && product.price <= 3200);
    assert.equal(product.status, "ACTIVE");
    assert.equal(product.active, true);
    assert.equal(product.available, true);
    assert.ok(product.quantity > 0);
  }
});

test("catalog validator rejects incomplete and duplicate catalog records", () => {
  const invalidCatalog = [{
    name: "Demo",
    products: [
      { name: "Dish", description: "", sku: "DUP", category: "Demo", price: 100, costPrice: 40, active: true, available: true, status: "ACTIVE", quantity: 1 },
      { name: "Dish", description: "Description", sku: "DUP", category: "Demo", price: 100, costPrice: 40, active: true, available: true, status: "ACTIVE", quantity: 1 },
    ],
  }];
  assert.ok(validateRestaurantCatalog(invalidCatalog).some((error) => error.includes("unique")));
});
