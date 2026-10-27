export const ALL_CATEGORIES = 'ALL';

export function categoryKey(category) {
  if (category && typeof category === 'object') {
    if (category.id !== undefined && category.id !== null) return String(category.id);
    if (category.name) return `name:${category.name}`;
  }
  return category ? `name:${category}` : '';
}

export function getMenuCategories(apiCategories = [], products = []) {
  const categories = new Map();
  for (const category of Array.isArray(apiCategories) ? apiCategories : []) {
    const name = typeof category === 'string' ? category : category?.name;
    if (!name) continue;
    categories.set(categoryKey(category), { id: categoryKey(category), name });
  }
  for (const product of products) {
    const category = product?.category;
    const name = typeof category === 'string' ? category : category?.name;
    if (!name) continue;
    const key = categoryKey(category);
    if (!categories.has(key)) categories.set(key, { id: key, name });
  }
  return [{ id: ALL_CATEGORIES, name: 'All dishes' }, ...categories.values()];
}

export function isMenuProductAvailable(product) {
  return product?.active !== false
    && product?.available !== false
    && (product?.quantity === undefined || product?.quantity === null || Number(product.quantity) > 0);
}

export function filterMenuProducts(products = [], { category = ALL_CATEGORIES, search = '' } = {}) {
  const query = search.trim().toLocaleLowerCase();
  return products.filter((product) => {
    if (!isMenuProductAvailable(product)) return false;
    const productCategory = categoryKey(product?.category);
    const categoryMatches = category === ALL_CATEGORIES || productCategory === String(category);
    if (!categoryMatches) return false;
    if (!query) return true;
    const ingredients = Array.isArray(product?.ingredients) ? product.ingredients.join(' ') : product?.ingredients;
    const searchable = [product?.name, product?.sku, product?.barcode, product?.description, ingredients]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
    return searchable.includes(query);
  });
}

export function popularMenuProducts(products = [], topProducts = []) {
  const byId = new Map(products.map((product) => [String(product.id), product]));
  const byName = new Map(products.map((product) => [product.name?.toLocaleLowerCase(), product]));
  const seen = new Set();
  return topProducts.flatMap((item) => {
    const product = (item.productId != null && byId.get(String(item.productId)))
      || byName.get(item.productName?.toLocaleLowerCase());
    if (!product || !isMenuProductAvailable(product) || seen.has(String(product.id))) return [];
    seen.add(String(product.id));
    return [product];
  });
}
