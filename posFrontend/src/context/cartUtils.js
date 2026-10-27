export const getCartLineKey = (productId, modifiers = [], notes = '') => (
  `${productId}:${modifiers.map((item) => item.id).sort((a, b) => a - b).join(',')}:${notes.trim()}`
);

export function addItemToCart(cart, product, options = {}) {
  const modifiers = options.modifiers || product.modifiers || [];
  const notes = options.notes ?? product.notes ?? '';
  const lineKey = getCartLineKey(product.id, modifiers, notes);
  const existing = cart.find((item) => item.cartLineKey === lineKey);
  if (existing) {
    return cart.map((item) => item.cartLineKey === lineKey
      ? { ...item, quantity: item.quantity + 1 }
      : item);
  }
  return [...cart, { ...product, modifiers, notes, cartLineKey: lineKey, quantity: 1 }];
}

export function removeCartItem(cart, lineKeyOrProductId) {
  const existing = cart.find((item) => item.cartLineKey === lineKeyOrProductId || item.id === lineKeyOrProductId);
  if (!existing) return cart;
  if (existing.quantity <= 1) return cart.filter((item) => item.cartLineKey !== existing.cartLineKey);
  return cart.map((item) => item.cartLineKey === existing.cartLineKey
    ? { ...item, quantity: item.quantity - 1 }
    : item);
}
