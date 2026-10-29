export const business = {
  name: "Marvel’s Kitchen",
  tagline: "Cooked with Love, Inspired by Tradition",
  phone: "08119000048",
  email: "Marvelousufelix@gmail.com",
  whatsapp: "2348157727770",
  address: "Address to be supplied — update this placeholder",
} as const;

export const categories = [
  "All",
  "Rice Dishes",
  "Soups and Swallows",
  "Proteins and Sides",
  "Snacks",
  "Drinks",
] as const;

export type MenuCategory = (typeof categories)[number];
