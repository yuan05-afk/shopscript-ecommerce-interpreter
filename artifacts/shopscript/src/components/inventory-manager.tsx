import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { InventoryProduct } from "../inventory-data";
import type { NotificationType } from "./notification-center";

interface InventoryPageProps {
  products: InventoryProduct[];
  onSave: (product: InventoryProduct) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
  onNotify: (type: NotificationType, title: string, message: string) => void;
  onOpenCoupons?: () => void;
  initialSearch?: string;
}

type ProductDraft = Omit<InventoryProduct, "id" | "imgSm">;
type ProductStatus = "all" | "active" | "low" | "out";
type PriceRange = "all" | "under50" | "mid" | "premium";
type SortMode = "name" | "category" | "stock-low" | "price-low" | "price-high";

const EMPTY_DRAFT: ProductDraft = { sku: "", name: "", category: "General", price: 0, stock: 0, inStock: true, img: "" };

const icon = (path: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>
);

function getProductStatus(product: InventoryProduct): { key: Exclude<ProductStatus, "all">; label: string; helper: string } {
  if (!product.inStock || product.stock === 0) return { key: "out", label: "Unavailable", helper: "Cannot be added" };
  if (product.stock <= 5) return { key: "low", label: "Low stock", helper: "Needs attention" };
  return { key: "active", label: "Active", helper: "Healthy stock" };
}

function matchesPriceRange(product: InventoryProduct, range: PriceRange) {
  if (range === "under50") return product.price < 50;
  if (range === "mid") return product.price >= 50 && product.price < 300;
  if (range === "premium") return product.price >= 300;
  return true;
}

export function InventoryPage({ products, onSave, onDelete, onReset, onNotify, onOpenCoupons, initialSearch = "" }: InventoryPageProps) {
  const [query, setQuery] = useState(initialSearch);
  const [status, setStatus] = useState<ProductStatus>("all");
  const [category, setCategory] = useState("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(initialSearch);
    if (initialSearch) {
      setStatus("all");
      setCategory("all");
      setPriceRange("all");
    }
  }, [initialSearch]);

  const categories = useMemo(() => Array.from(new Set(products.map(product => product.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [products]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const nextProducts = products.filter(product => {
      const productStatus = getProductStatus(product);
      const searchText = [product.name, product.sku, product.category, productStatus.label].join(" ").toLowerCase();
      const matchesSearch = !term || searchText.includes(term);
      const matchesStatus = status === "all" || productStatus.key === status;
      const matchesCategory = category === "all" || product.category === category;
      const matchesPrice = matchesPriceRange(product, priceRange);
      return matchesSearch && matchesStatus && matchesCategory && matchesPrice;
    });

    return [...nextProducts].sort((a, b) => {
      if (sortMode === "category") return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      if (sortMode === "stock-low") return a.stock - b.stock || a.name.localeCompare(b.name);
      if (sortMode === "price-low") return a.price - b.price || a.name.localeCompare(b.name);
      if (sortMode === "price-high") return b.price - a.price || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [products, query, status, category, priceRange, sortMode]);

  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStock = products.filter(product => getProductStatus(product).key === "low").length;
  const unavailable = products.filter(product => getProductStatus(product).key === "out").length;
  const inventoryValue = products.reduce((sum, product) => sum + product.price * product.stock, 0);

  const openCreate = () => { setEditingId(null); setDraft(EMPTY_DRAFT); setError(""); setFormOpen(true); };
  const openEdit = (product: InventoryProduct) => {
    const { id: _id, imgSm: _imgSm, ...nextDraft } = product;
    setEditingId(product.id); setDraft(nextDraft); setError(""); setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditingId(null); setError(""); };

  const fail = (message: string) => { setError(message); onNotify("error", "Product not saved", message); };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    const sku = draft.sku.trim().toUpperCase();
    if (!name || !sku) return fail("Product name and SKU are required.");
    if (draft.price < 0 || draft.stock < 0) return fail("Price and stock cannot be negative.");
    if (products.some(product => product.id !== editingId && product.name.toLowerCase() === name.toLowerCase())) return fail("Product names must be unique.");
    if (products.some(product => product.id !== editingId && product.sku.toLowerCase() === sku.toLowerCase())) return fail("SKU must be unique.");
    const id = editingId ?? (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36));
    const image = draft.img.trim() || "https://placehold.co/400x300/f7ede5/f97316?text=" + encodeURIComponent(name);
    onSave({ ...draft, id, name, sku, stock: Math.floor(draft.stock), img: image, imgSm: image });
    closeForm();
  };

  const remove = (product: InventoryProduct) => {
    if (window.confirm(`Delete ${product.name} from the inventory?`)) onDelete(product.id);
  };

  return (
    <main className="inventory-page">
      <section className="inventory-hero">
        <div><span className="page-eyebrow">Shared product catalog</span><h1>Product Inventory</h1><p>Create and manage the products used by Home, the cart, and ShopScript semantic validation.</p></div>
        <div className="inventory-hero-actions">
          <button className="btn-ghost inventory-add-btn" type="button" onClick={onOpenCoupons} data-tooltip="Manage reusable coupon codes available to ShopScript programs.">{icon("M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z")} Coupons</button>
          <button className="btn-orange inventory-add-btn" type="button" onClick={openCreate} data-tooltip="Create a new product for the shared ShopScript catalog.">{icon("M12 5v14M5 12h14")} Add Product</button>
        </div>
      </section>

      <section className="inventory-stats" aria-label="Inventory summary">
        <div><span>Products</span><strong>{products.length}</strong><small>{products.filter(product => getProductStatus(product).key === "active").length} active</small></div>
        <div><span>Total units</span><strong>{totalUnits}</strong><small>Across all products</small></div>
        <div><span>Low stock</span><strong>{lowStock}</strong><small>Five units or fewer</small></div>
        <div><span>Unavailable</span><strong>{unavailable}</strong><small>Inactive or zero stock</small></div>
        <div><span>Inventory value</span><strong>${inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>Price x stock</small></div>
      </section>

      {formOpen && (
        <section className="inventory-form-card ss-card" aria-label={editingId ? "Edit product" : "Add product"}>
          <div className="inventory-section-heading"><div><span className="page-eyebrow">{editingId ? "Update catalog entry" : "New catalog entry"}</span><h2>{editingId ? "Edit product" : "Add product"}</h2></div><button type="button" className="inventory-icon-btn" onClick={closeForm} aria-label="Close product form" data-tooltip="Close the product form without saving.">x</button></div>
          <form onSubmit={submit} className="inventory-form">
            <label data-tooltip="Product name used by add statements and semantic validation."><span>Product name *</span><input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Mechanical Keyboard" /></label>
            <label data-tooltip="Unique catalog code for identifying this product in inventory management."><span>SKU *</span><input value={draft.sku} onChange={event => setDraft({ ...draft, sku: event.target.value })} placeholder="e.g. ACC-004" /></label>
            <label data-tooltip="Optional grouping label for organizing the product list."><span>Category</span><input value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })} placeholder="Accessories" /></label>
            <label data-tooltip="Catalog price used to validate ShopScript add statements."><span>Price</span><input type="number" min="0" step="0.01" value={draft.price} onChange={event => setDraft({ ...draft, price: Number(event.target.value) })} /></label>
            <label data-tooltip="Available units checked by the semantic validator."><span>Stock quantity</span><input type="number" min="0" step="1" value={draft.stock} onChange={event => setDraft({ ...draft, stock: Number(event.target.value) })} /></label>
            <label className="inventory-image-field" data-tooltip="Image shown in the Home inventory and cart views."><span>Image URL</span><input type="url" value={draft.img} onChange={event => setDraft({ ...draft, img: event.target.value })} placeholder="https://..." /></label>
            <label className="inventory-checkbox" data-tooltip="Inactive or zero-stock products cannot be added from the Home inventory."><input type="checkbox" checked={draft.inStock} onChange={event => setDraft({ ...draft, inStock: event.target.checked })} /><span>Product is active and available to ShopScript</span></label>
            {error && <p className="inventory-form-error" role="alert">{error}</p>}
            <div className="inventory-form-actions"><button type="button" className="btn-ghost" onClick={closeForm} data-tooltip="Discard product form changes.">Cancel</button><button type="submit" className="btn-orange" data-tooltip="Save this product to the shared catalog.">{editingId ? "Save Changes" : "Create Product"}</button></div>
          </form>
        </section>
      )}

      <section className="inventory-catalog ss-card">
        <div className="inventory-toolbar">
          <label className="inventory-search">{icon("M21 21l-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z")}<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, SKU, category, or status..." aria-label="Search inventory" data-tooltip="Search product records by name, SKU, category, or status." /></label>
          <div className="inventory-filters" aria-label="Filter products by status">{(["all", "active", "low", "out"] as const).map(filter => <button type="button" key={filter} className={status === filter ? "active" : ""} onClick={() => setStatus(filter)} data-tooltip={"Filter products by " + (filter === "all" ? "all statuses" : filter === "low" ? "low stock" : filter === "out" ? "unavailable status" : "active healthy stock") + "."}>{filter === "all" ? "All" : filter === "active" ? "Active" : filter === "low" ? "Low stock" : "Unavailable"}</button>)}</div>
          <div className="inventory-selects" aria-label="Additional inventory filters">
            <label><span>Category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span>Price</span><select value={priceRange} onChange={event => setPriceRange(event.target.value as PriceRange)}><option value="all">All prices</option><option value="under50">Under $50</option><option value="mid">$50-$299</option><option value="premium">$300+</option></select></label>
            <label><span>Sort</span><select value={sortMode} onChange={event => setSortMode(event.target.value as SortMode)}><option value="name">Name A-Z</option><option value="category">Category</option><option value="stock-low">Lowest stock</option><option value="price-low">Lowest price</option><option value="price-high">Highest price</option></select></label>
          </div>
          <button type="button" className="btn-ghost inventory-reset" onClick={onReset} data-tooltip="Restore the six default ShopScript products.">Reset defaults</button>
        </div>

        <div className="inventory-table-wrap" data-lenis-prevent>
          <table className="inventory-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{filteredProducts.map(product => {
              const productStatus = getProductStatus(product);
              const stockClass = productStatus.key === "out" ? "stock-count out" : productStatus.key === "low" ? "stock-count low" : "stock-count";
              return (
                <tr key={product.id}>
                  <td><div className="inventory-product-cell"><img src={product.imgSm || product.img} alt="" onError={event => { event.currentTarget.src = "https://placehold.co/80x80/f7ede5/f97316?text=SS"; }} /><div><strong>{product.name}</strong><small>{productStatus.helper}</small></div></div></td>
                  <td><code>{product.sku}</code></td><td>{product.category}</td><td><strong>${product.price.toFixed(2)}</strong></td>
                  <td><span className={stockClass}>{product.stock}</span></td>
                  <td><span className={"inventory-status " + productStatus.key}><i />{productStatus.label}</span></td>
                  <td><div className="inventory-row-actions"><button type="button" onClick={() => openEdit(product)} aria-label={`Edit ${product.name}`} data-tooltip={`Edit ${product.name} in the shared catalog.`}>{icon("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z")}</button><button type="button" className="danger" onClick={() => remove(product)} aria-label={`Delete ${product.name}`} data-tooltip={`Delete ${product.name} from the shared catalog.`}>{icon("M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5")}</button></div></td>
                </tr>
              );
            })}</tbody>
          </table>
          {filteredProducts.length === 0 && <div className="inventory-empty"><strong>No matching products</strong><span>Change the search, category, price, sort, or status filter.</span></div>}
        </div>
      </section>
    </main>
  );
}