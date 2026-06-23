export interface InventoryProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  inStock: boolean;
  img: string;
  imgSm: string;
}

export const INVENTORY_STORAGE_KEY = "shopscript.inventory.v1";

export const DEFAULT_PRODUCTS: InventoryProduct[] = [
  { id: "smartphone-x", sku: "ELEC-001", name: "Smartphone X", category: "Electronics", price: 599, stock: 12, inStock: true, img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop&auto=format", imgSm: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=60&h=60&fit=crop&auto=format" },
  { id: "wireless-earbuds", sku: "ELEC-002", name: "Wireless Earbuds", category: "Audio", price: 199, stock: 8, inStock: true, img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop&auto=format", imgSm: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=60&h=60&fit=crop&auto=format" },
  { id: "phone-case", sku: "ACC-001", name: "Phone Case", category: "Accessories", price: 29, stock: 24, inStock: true, img: "https://images.unsplash.com/photo-1601593346740-925612772716?w=200&h=200&fit=crop&auto=format", imgSm: "https://images.unsplash.com/photo-1601593346740-925612772716?w=60&h=60&fit=crop&auto=format" },
  { id: "urban-backpack", sku: "BAG-001", name: "Urban Backpack", category: "Bags", price: 49, stock: 5, inStock: true, img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop&auto=format", imgSm: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=60&h=60&fit=crop&auto=format" },
  { id: "laptop", sku: "COMP-001", name: "Laptop", category: "Computers", price: 999, stock: 4, inStock: true, img: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop&auto=format", imgSm: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=60&h=60&fit=crop&auto=format" },
  { id: "smart-watch", sku: "ELEC-003", name: "Smart Watch", category: "Wearables", price: 299, stock: 10, inStock: true, img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop&auto=format", imgSm: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&h=60&fit=crop&auto=format" },
];

export function loadInventory(): InventoryProduct[] {
  try {
    const stored = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!stored) return DEFAULT_PRODUCTS;
    const products = JSON.parse(stored) as InventoryProduct[];
    return Array.isArray(products) ? products : DEFAULT_PRODUCTS;
  } catch {
    return DEFAULT_PRODUCTS;
  }
}
