import type {
  Category,
  Product,
  ProductAddOnGroup,
  ProductOptionGroup,
  User,
} from "./types";

export const PAGE_SIZE = 25;

export const MOCK_USERS: User[] = [
  { id: "u1", username: "tablet", password: "tablet123", name: "Tablet Cashier" },
  { id: "u2", username: "cashier", password: "cashier123", name: "Main Cashier" },
];

export const CATEGORIES: Category[] = [
  { id: "coffee", name: "Coffee" },
  { id: "tea", name: "Tea" },
  { id: "snacks", name: "Snacks" },
  { id: "meals", name: "Meals" },
];

const coffeeNames = [
  "Americano",
  "Cappuccino",
  "Cafe Latte",
  "Flat White",
  "Mocha",
  "Caramel Macchiato",
  "Iced Americano",
  "Iced Latte",
  "Cold Brew",
  "Spanish Latte",
  "Vanilla Latte",
  "Hazelnut Latte",
  "Dark Mocha",
  "White Mocha",
  "Salted Caramel Latte",
  "Dirty Horchata",
  "Affogato",
  "Coffee Jelly Latte",
  "Brown Sugar Latte",
  "Oat Latte",
  "Almond Latte",
  "Coconut Latte",
  "Java Chip",
  "Toffee Nut Latte",
  "Honey Cinnamon Latte",
  "Irish Cream Latte",
  "Butterscotch Latte",
  "Double Espresso",
  "Long Black",
  "Drip Coffee",
  "Nitro Cold Brew",
  "Maple Latte",
  "Toasted Marshmallow Latte",
  "Banana Bread Latte",
  "Mint Mocha",
  "Raspberry Mocha",
  "Ube Latte",
  "Sea Salt Cream Coffee",
  "Tiramisu Latte",
  "Cookie Butter Latte",
];

const teaNames = [
  "Classic Milk Tea",
  "Wintermelon Milk Tea",
  "Oolong Milk Tea",
  "Jasmine Green Tea",
  "Thai Milk Tea",
  "Matcha Latte",
  "Hojicha Latte",
  "Earl Grey Latte",
  "Lemon Iced Tea",
  "Peach Black Tea",
];

const snackNames = [
  "Garlic Fries",
  "Potato Wedges",
  "Nachos",
  "Onion Rings",
  "Chicken Pops",
  "Loaded Fries",
  "Cheese Sticks",
  "Caesar Salad",
  "Cobb Salad",
  "Sourdough Toast",
];

const mealNames = [
  "Classic Burger",
  "Bacon Cheeseburger",
  "Chicken Pesto Sandwich",
  "Beef Tapa Bowl",
  "Chicken Teriyaki Bowl",
  "Pork BBQ Rice",
  "Creamy Carbonara",
  "Spicy Tuna Pasta",
  "Margherita Pizza",
  "Pepperoni Pizza",
];

const sizeOptions: ProductOptionGroup[] = [
  {
    id: "size",
    name: "Size",
    required: true,
    choices: [
      { id: "regular", name: "Regular", priceDelta: 0 },
      { id: "large", name: "Large", priceDelta: 30 },
    ],
  },
];

const coffeeAddOnGroups: ProductAddOnGroup[] = [
  {
    id: "coffee-addons",
    name: "Add-ons",
    addOns: [
      { id: "extra-shot", name: "Extra Espresso Shot", price: 25 },
      { id: "oat-milk", name: "Oat Milk", price: 20 },
      { id: "whipped-cream", name: "Whipped Cream", price: 15 },
      { id: "caramel-drizzle", name: "Caramel Drizzle", price: 15 },
    ],
  },
];

const sugarOptions: ProductOptionGroup[] = [
  {
    id: "sugar-level",
    name: "Sugar Level",
    required: true,
    choices: [
      { id: "0", name: "0%", priceDelta: 0 },
      { id: "25", name: "25%", priceDelta: 0 },
      { id: "50", name: "50%", priceDelta: 0 },
      { id: "100", name: "100%", priceDelta: 0 },
    ],
  },
];

const bobaAddOnGroup: ProductAddOnGroup[] = [
  {
    id: "tea-addons",
    name: "Sinkers",
    addOns: [
      { id: "pearls", name: "Pearls", price: 15 },
      { id: "nata", name: "Nata", price: 15 },
      { id: "pudding", name: "Pudding", price: 20 },
    ],
  },
];

const mealOptions: ProductOptionGroup[] = [
  {
    id: "side",
    name: "Side",
    required: true,
    choices: [
      { id: "fries", name: "Fries", priceDelta: 0 },
      { id: "salad", name: "Salad", priceDelta: 20 },
      { id: "chips", name: "Chips", priceDelta: 10 },
    ],
  },
];

const mealAddOns: ProductAddOnGroup[] = [
  {
    id: "meal-addons",
    name: "Extras",
    addOns: [
      { id: "add-egg", name: "Egg", price: 20 },
      { id: "add-bacon", name: "Bacon", price: 35 },
      { id: "add-cheese", name: "Cheese", price: 20 },
    ],
  },
];

const makeImage = (seed: string) => `https://picsum.photos/seed/${seed}/200/200`;

const buildProducts = () => {
  const products: Product[] = [];

  coffeeNames.forEach((name, index) => {
    products.push({
      id: `coffee-${index + 1}`,
      categoryId: "coffee",
      name,
      image: makeImage(`coffee-${index + 1}`),
      price: 130 + (index % 5) * 12,
      options: index % 3 === 0 ? sizeOptions : undefined,
      addOnGroups: index % 4 === 0 ? coffeeAddOnGroups : undefined,
    });
  });

  teaNames.forEach((name, index) => {
    products.push({
      id: `tea-${index + 1}`,
      categoryId: "tea",
      name,
      image: makeImage(`tea-${index + 1}`),
      price: 110 + (index % 4) * 10,
      options: sugarOptions,
      addOnGroups: bobaAddOnGroup,
    });
  });

  snackNames.forEach((name, index) => {
    products.push({
      id: `snack-${index + 1}`,
      categoryId: "snacks",
      name,
      image: makeImage(`snack-${index + 1}`),
      price: 95 + (index % 4) * 20,
    });
  });

  mealNames.forEach((name, index) => {
    products.push({
      id: `meal-${index + 1}`,
      categoryId: "meals",
      name,
      image: makeImage(`meal-${index + 1}`),
      price: 215 + (index % 5) * 22,
      options: mealOptions,
      addOnGroups: mealAddOns,
    });
  });

  return products;
};

export const PRODUCTS = buildProducts();
