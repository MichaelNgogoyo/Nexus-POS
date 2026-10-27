import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMenuProducts, getMenuCategories, popularMenuProducts } from './menuUtils.js';

const products = [
  { id: 1, name: 'Garden Bowl', sku: 'BOWL-1', description: 'Avocado and greens', price: 12, active: true, quantity: 8, category: { id: 10, name: 'Bowls' } },
  { id: 2, name: 'Tomato Soup', description: 'Roasted tomato', price: 8, active: true, quantity: 4, category: { id: 11, name: 'Soups' } },
  { id: 3, name: 'Unavailable Bowl', active: true, quantity: 0, category: { id: 10, name: 'Bowls' } },
  { id: 4, name: 'Hidden Salad', active: false, quantity: 2, category: { id: 10, name: 'Bowls' } },
];

test('category filtering uses backend category identifiers', () => {
  assert.deepEqual(filterMenuProducts(products, { category: '10' }).map((product) => product.id), [1]);
});

test('search matches product name, SKU, description, and available ingredient data', () => {
  assert.equal(filterMenuProducts(products, { search: 'bowl-1' })[0].id, 1);
  assert.equal(filterMenuProducts(products, { search: 'roasted' })[0].id, 2);
  assert.equal(filterMenuProducts([{ ...products[0], ingredients: ['Avocado', 'Kale'] }], { search: 'kale' }).length, 1);
});

test('unavailable and inactive products are excluded', () => {
  assert.deepEqual(filterMenuProducts(products).map((product) => product.id), [1, 2]);
});

test('category options combine backend categories with categories present on products', () => {
  const categories = getMenuCategories([{ id: 10, name: 'Bowls' }], products);
  assert.deepEqual(categories.map((category) => category.name), ['All dishes', 'Bowls', 'Soups']);
});

test('popular products use real backend ranking and do not duplicate products', () => {
  const ranked = popularMenuProducts(products, [
    { productId: 2, productName: 'Tomato Soup' },
    { productId: 2, productName: 'Tomato Soup' },
    { productId: 3, productName: 'Unavailable Bowl' },
  ]);
  assert.deepEqual(ranked.map((product) => product.id), [2]);
});
