const definitions = [
  {
    name: "Breakfast & Brunch",
    costRatio: 0.38,
    quantityBase: 24,
    descriptions: [
      "A freshly prepared morning favourite, served warm with seasonal fruit.",
      "Made to order with farm eggs and locally sourced ingredients.",
      "A generous breakfast plate with a choice of Kenyan tea or coffee.",
      "Lightly seasoned and cooked fresh for a relaxed Nairobi brunch.",
    ],
    items: [
      ["Kenyan Breakfast Platter", 650], ["Two Eggs, Toast & Sausage", 480],
      ["Masala Omelette & Toast", 420], ["Spanish Omelette", 520],
      ["Mahamri & Coconut Beans", 380], ["Sweet Potato & Scrambled Eggs", 450],
      ["Pancakes with Banana & Honey", 420], ["Mandazi Breakfast Basket", 300],
      ["Avocado Toast with Kachumbari", 480], ["Beef Sausage Breakfast Roll", 390],
      ["Smokie, Egg & Toast Plate", 350], ["Spanish Omelette with Sukuma", 520],
      ["Uji wa Wimbi & Mandazi", 280], ["Chapati, Beans & Fried Egg", 400],
      ["French Toast with Pawpaw", 450], ["Mushroom & Cheese Omelette", 560],
      ["Breakfast Bhajia & Chutney", 320], ["Sweetcorn Fritter Stack", 390],
      ["Granola, Yoghurt & Passion Fruit", 520], ["Beef Liver Breakfast Plate", 580],
    ],
  },
  {
    name: "Kenyan Classics",
    costRatio: 0.46,
    quantityBase: 22,
    descriptions: [
      "A hearty Kenyan favourite, slow cooked with fresh herbs and house seasoning.",
      "Served with a choice of ugali, rice or chapati and seasonal greens.",
      "Comforting home-style cooking finished with fresh coriander and kachumbari.",
      "Prepared in the traditional style with locally sourced vegetables and spices.",
    ],
    items: [
      ["Beef Stew with Ugali", 780], ["Nyama and Sukuma Wiki", 850],
      ["Githeri Special", 520], ["Mukimo with Beef Stew", 720],
      ["Matoke and Groundnut Stew", 580], ["Pilau Beef Plate", 850],
      ["Chapati, Beans & Sukuma", 480], ["Irio with Grilled Beef", 790],
      ["Kienyeji Chicken with Ugali", 1150], ["Omena, Ugali & Greens", 620],
      ["Mbuzi Wet Fry with Ugali", 1100], ["Beef Liver with Mukimo", 780],
      ["Ndengu Stew with Chapati", 520], ["Coconut Beans and Rice", 560],
      ["Kuku Kienyeji with Chapati", 1250], ["Maziwa Mala Beef Stew", 900],
      ["Seasonal Vegetable Githeri", 480], ["Sukuma Wiki and Ugali", 320],
      ["Pumpkin Leaves with Ugali", 380], ["Goat Stew with Rice", 980],
    ],
  },
  {
    name: "Swahili & Coastal",
    costRatio: 0.47,
    quantityBase: 18,
    descriptions: [
      "A coastal-style recipe with coconut, tamarind and fragrant whole spices.",
      "Slow simmered with Swahili spices and served fresh from the kitchen.",
      "A Mombasa-inspired plate balanced with citrus, coconut and fresh herbs.",
      "Prepared with aromatic pilau masala and a bright side of kachumbari.",
    ],
    items: [
      ["Swahili Chicken Biryani", 1050], ["Mombasa Beef Biryani", 980],
      ["Coconut Fish Curry with Rice", 1250], ["Prawn Coconut Curry", 1580],
      ["Viazi Karai with Ukwaju", 350], ["Mahamri with Mbaazi za Nazi", 480],
      ["Kuku wa Kupaka with Chapati", 1180], ["Coastal Beef Pilau", 900],
      ["Tamarind Chicken Wings", 680], ["Octopus Curry with Rice", 1450],
      ["Swahili Vegetable Biryani", 760], ["Coconut Lentil Curry", 650],
      ["Mombasa Mishkaki Wrap", 720], ["Bhajia za Viazi", 320],
      ["Cassava with Coconut Sauce", 380], ["Swahili Fish Wet Fry", 1320],
      ["Pili Pili Prawns with Ugali", 1580], ["Mbaazi za Nazi with Chapati", 520],
      ["Coconut Beef Curry", 1050], ["Tamarind Glazed Grilled Fish", 1480],
    ],
  },
  {
    name: "Nyama Choma & Grills",
    costRatio: 0.52,
    quantityBase: 20,
    descriptions: [
      "Char-grilled to order over an open flame and served with kachumbari.",
      "Marinated in house spices, flame grilled and finished with pili pili.",
      "A smoky, tender grill served with a choice of ugali, chips or roast potatoes.",
      "Fresh off the grill with a side of sukuma wiki and house chilli sauce.",
    ],
    items: [
      ["Quarter Chicken, Chips & Kachumbari", 850], ["Half Chicken, Chips & Kachumbari", 1480],
      ["Whole Grilled Chicken", 2650], ["Beef Nyama Choma 300g", 1250],
      ["Beef Nyama Choma 500g", 1980], ["Mbuzi Choma 300g", 1480],
      ["Mbuzi Choma 500g", 2250], ["Pork Ribs with Tamarind Glaze", 1650],
      ["Grilled Beef Skewers", 920], ["Chicken Mishkaki Skewers", 780],
      ["Grilled T-Bone Steak", 2100], ["Pepper Steak with Roast Potatoes", 1980],
      ["Pili Pili Chicken Wings", 720], ["Honey Mustard Chicken", 980],
      ["Grilled Sausage Platter", 850], ["Lamb Chops with Rosemary", 2180],
      ["Beef Burger with Masala Chips", 1050], ["Chicken Burger with Slaw", 920],
      ["Grilled Goat Ribs", 1850], ["Mixed Grill Sharing Platter", 3200],
    ],
  },
  {
    name: "Chicken & Poultry",
    costRatio: 0.45,
    quantityBase: 24,
    descriptions: [
      "Tender chicken prepared fresh with a balanced blend of herbs and spices.",
      "A comforting poultry dish served with rice, chapati or seasonal vegetables.",
      "Cooked to order and finished with a house-made sauce.",
      "A family favourite with generous portions and fresh local ingredients.",
    ],
    items: [
      ["Chicken Tikka Masala with Rice", 1080], ["Creamy Chicken Alfredo Pasta", 980],
      ["Chicken Stew with Chapati", 820], ["Crispy Chicken Strips & Chips", 850],
      ["Chicken Pilau", 780], ["Chicken Korma with Rice", 1050],
      ["Lemon Herb Chicken Breast", 1180], ["Chicken Schnitzel & Mash", 1080],
      ["Chicken Fried Rice", 780], ["Chicken Coconut Curry", 980],
      ["Chicken Shawarma Plate", 920], ["Chicken Parmesan with Pasta", 1250],
      ["Chicken Teriyaki Bowl", 1050], ["Chicken Kiev with Vegetables", 1320],
      ["Smoky BBQ Chicken Quarter", 850], ["Chicken Manchurian with Rice", 980],
      ["Creamy Mushroom Chicken", 1180], ["Chicken Fajita Wrap", 780],
      ["Chicken Lollipop with Chilli Dip", 720], ["Kienyeji Chicken Curry", 1380],
    ],
  },
  {
    name: "Fish & Seafood",
    costRatio: 0.55,
    quantityBase: 16,
    descriptions: [
      "Fresh seafood cooked to order with lemon, herbs and a light house seasoning.",
      "A coastal-inspired seafood plate served with rice or seasonal vegetables.",
      "Pan seared for a crisp finish and paired with a fresh citrus dressing.",
      "Prepared with fresh market seafood and served with kachumbari or greens.",
    ],
    items: [
      ["Tilapia Whole Fried with Ugali", 1250], ["Tilapia Fillet with Lemon Butter", 1380],
      ["Grilled Tilapia with Coconut Rice", 1480], ["Fish Fingers with Chips", 780],
      ["Fish Curry with Steamed Rice", 1100], ["Prawn Fried Rice", 1380],
      ["Garlic Butter Prawns", 1580], ["Seafood Coconut Curry", 1780],
      ["Calamari Rings with Tartare", 980], ["Tuna Steak with Greens", 1650],
      ["Fish and Chips with Slaw", 1050], ["Swahili Grilled Snapper", 1880],
      ["Coconut Prawn Linguine", 1680], ["Crab Masala with Rice", 1850],
      ["Samosa ya Samaki", 420], ["Fish Wet Fry with Chapati", 1150],
      ["Seafood Paella", 1980], ["Lemon Pepper Fish Fillet", 1320],
      ["Prawn and Avocado Salad", 1280], ["Garlic Chilli Octopus", 1720],
    ],
  },
  {
    name: "Vegetarian & Sides",
    costRatio: 0.34,
    quantityBase: 28,
    descriptions: [
      "A fresh plant-forward plate made with seasonal Kenyan produce.",
      "Lightly seasoned vegetables prepared daily and finished with fresh herbs.",
      "A satisfying meat-free favourite with locally sourced ingredients.",
      "Served warm with a house dressing, fresh chilli or a side of chapati.",
    ],
    items: [
      ["Vegetable Stir Fry with Rice", 620], ["Paneer Tikka Masala", 880],
      ["Mushroom Cream Pasta", 850], ["Vegetable Coconut Curry", 680],
      ["Chickpea and Spinach Curry", 620], ["Roasted Pumpkin Salad", 580],
      ["Avocado and Mango Salad", 650], ["Sukuma Wiki Side", 180],
      ["Ugali Portion", 120], ["Chapati Portion", 100],
      ["Masala Chips", 280], ["Plain Chips", 220],
      ["Crispy Vegetable Spring Rolls", 380], ["Grilled Vegetable Platter", 620],
      ["Dengu and Coconut Stew", 560], ["Cabbage and Carrot Slaw", 180],
      ["Garlic Butter Greens", 280], ["Roast Potatoes with Rosemary", 350],
      ["Sweet Corn and Bean Salad", 420], ["Vegetable Samosa Plate", 360],
    ],
  },
  {
    name: "Snacks & Street Food",
    costRatio: 0.36,
    quantityBase: 30,
    descriptions: [
      "A popular Kenyan snack, freshly prepared and served with house chutney.",
      "Crisp on the outside, warmly spiced and made in small batches.",
      "A quick bite inspired by Nairobi street food and local flavours.",
      "Served hot with kachumbari, pili pili or tamarind dipping sauce.",
    ],
    items: [
      ["Beef Samosa", 120], ["Vegetable Samosa", 100],
      ["Chicken Samosa", 140], ["Beef Sausage Roll", 180],
      ["Bhajia Basket", 320], ["Kachumbari Bhajia Wrap", 350],
      ["Kibanda-Style Smokie Pasua", 180], ["Mutura with Kachumbari", 280],
      ["Mini Beef Kebabs", 420], ["Chicken Spring Rolls", 380],
      ["Cassava Crisps with Pili Pili", 220], ["Masala Peanuts", 180],
      ["Mini Chapati Wraps", 280], ["Crispy Potato Wedges", 280],
      ["Pili Pili Chicken Bites", 480], ["Beef Meat Pie", 220],
      ["Spinach and Cheese Triangles", 320], ["Mahamri Snack Pair", 180],
      ["Kachumbari and Avocado Cups", 250], ["Mogo Fries with Tamarind Dip", 300],
    ],
  },
  {
    name: "Beverages",
    costRatio: 0.28,
    quantityBase: 40,
    descriptions: [
      "Freshly prepared and served chilled over ice unless requested otherwise.",
      "A refreshing house favourite made with quality Kenyan ingredients.",
      "Brewed or blended to order and served fresh.",
      "A cool, balanced drink with no artificial colour added.",
    ],
    items: [
      ["Kenyan Masala Tea", 180], ["Dawa with Fresh Lime", 280],
      ["Kenyan AA Coffee", 220], ["Iced Vanilla Latte", 350],
      ["Fresh Passion Juice", 280], ["Fresh Mango Juice", 280],
      ["Fresh Pineapple Juice", 250], ["Sugarcane and Ginger Juice", 300],
      ["Tamarind Cooler", 250], ["Mango Lassi", 320],
      ["Avocado Smoothie", 380], ["Banana and Peanut Smoothie", 350],
      ["Watermelon Mint Cooler", 280], ["Lemon and Ginger Tea", 200],
      ["Iced Hibiscus Tea", 250], ["Fresh Orange Juice", 300],
      ["Chocolate Milkshake", 380], ["Vanilla Milkshake", 360],
      ["Spiced Cocoa", 250], ["House Lemonade", 220],
    ],
  },
  {
    name: "Desserts & Bakery",
    costRatio: 0.33,
    quantityBase: 18,
    descriptions: [
      "Baked fresh in house and served with a light dusting of icing sugar.",
      "A sweet finish made with real butter, fresh fruit and local ingredients.",
      "Prepared in small batches and served with cream or seasonal fruit.",
      "A Kenyan-inspired treat, freshly baked and served warm when available.",
    ],
    items: [
      ["Mango Cheesecake Slice", 480], ["Passion Fruit Tart", 420],
      ["Chocolate Fudge Brownie", 350], ["Banana Cake Slice", 280],
      ["Carrot Cake with Cream Cheese", 380], ["Coconut Mandazi Basket", 220],
      ["Warm Chocolate Lava Cake", 520], ["Vanilla Bean Panna Cotta", 420],
      ["Seasonal Fruit Salad", 320], ["Fresh Mango Sorbet", 280],
      ["Cinnamon Doughnut Pair", 220], ["Lemon Drizzle Loaf", 300],
      ["Apple Crumble with Custard", 420], ["Coconut Rice Pudding", 320],
      ["Mabuyu Chocolate Bark", 280], ["Cardamom Kulfi", 350],
      ["Mini Caramel Éclairs", 380], ["Pineapple Upside-Down Cake", 360],
      ["Date and Coconut Energy Bites", 260], ["Vanilla Ice Cream Scoop", 180],
    ],
  },
];

const roundToFive = (amount) => Math.round(amount / 5) * 5;

export const RESTAURANT_CATALOG = definitions.map((category, categoryIndex) => ({
  name: category.name,
  products: category.items.map(([name, price], itemIndex) => {
    const globalIndex = categoryIndex * 20 + itemIndex + 1;
    const sku = `KE-FOOD-${String(globalIndex).padStart(3, "0")}`;
    return {
      name,
      description: `${name}: ${category.descriptions[itemIndex % category.descriptions.length]}`,
      sku,
      category: category.name,
      price,
      costPrice: roundToFive(price * category.costRatio),
      quantity: category.quantityBase + ((globalIndex * 7) % 31),
      discount: 0,
      active: true,
      available: true,
      lowStockThreshold: 5,
      reorderLevel: 5,
      reorderQuantity: 20,
      imageURL: `catalog/${sku}.jpg`,
      status: "ACTIVE",
    };
  }),
}));

export function validateRestaurantCatalog(catalog = RESTAURANT_CATALOG) {
  const errors = [];
  const products = catalog.flatMap((category) => category.products);
  const names = products.map((product) => product.name.toLocaleLowerCase("en-KE"));
  const skus = products.map((product) => product.sku);

  if (catalog.length !== 10) errors.push(`Expected 10 categories, got ${catalog.length}.`);
  for (const category of catalog) {
    if (category.products.length !== 20) {
      errors.push(`${category.name} must contain 20 products, got ${category.products.length}.`);
    }
  }
  if (products.length !== 200) errors.push(`Expected 200 products, got ${products.length}.`);
  if (new Set(names).size !== names.length) errors.push("Product names must be unique.");
  if (new Set(skus).size !== skus.length) errors.push("Product SKUs must be unique.");

  for (const product of products) {
    if (!product.name || !product.description || !product.category || !product.sku || product.imageURL !== `catalog/${product.sku}.jpg`) {
      errors.push(`Incomplete catalog fields for SKU ${product.sku || "(missing)"}.`);
    }
    if (!Number.isFinite(product.price) || product.price <= 0 || product.costPrice <= 0 || product.costPrice >= product.price) {
      errors.push(`Invalid KES selling/cost price for ${product.sku}.`);
    }
    if (!product.active || !product.available || product.status !== "ACTIVE" || product.quantity <= 0) {
      errors.push(`Demo menu item ${product.sku} must be active, available and stocked.`);
    }
  }
  return errors;
}
