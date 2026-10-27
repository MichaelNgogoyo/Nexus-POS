import test from 'node:test';
import assert from 'node:assert/strict';
import { addItemToCart, removeCartItem } from './cartUtils.js';

test('adding the same product and options increments one cart line', () => {
  const product = { id: 7, name: 'Soup', price: 12 };
  const first = addItemToCart([], product);
  const second = addItemToCart(first, product);

  assert.equal(second.length, 1);
  assert.equal(second[0].quantity, 2);
});

test('different modifiers or notes remain separate order lines', () => {
  const product = { id: 7, name: 'Soup', price: 12 };
  const first = addItemToCart([], product, { modifiers: [{ id: 1 }], notes: 'No cream' });
  const second = addItemToCart(first, product, { modifiers: [{ id: 2 }], notes: 'No cream' });

  assert.equal(second.length, 2);
  assert.notEqual(second[0].cartLineKey, second[1].cartLineKey);
});

test('removing one quantity decrements the line and then removes it', () => {
  const product = { id: 7, name: 'Soup', price: 12 };
  const cart = addItemToCart(addItemToCart([], product), product);
  const lineKey = cart[0].cartLineKey;
  const decremented = removeCartItem(cart, lineKey);
  const removed = removeCartItem(decremented, lineKey);

  assert.equal(decremented[0].quantity, 1);
  assert.deepEqual(removed, []);
});
