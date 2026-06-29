import { useMemo, useState, type FormEvent } from "react";
import type { InventoryProduct } from "../inventory-data";
import type { NotificationType } from "./notification-center";

interface InventoryPageProps {
  products: InventoryProduct[];
  onSave: (product: InventoryProduct) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
  onNotify: (type: NotificationType, title: string, message: string) => void;
  onOpenCoupons?: () => void;
}

type ProductDraft = Omit<InventoryProduct, "id" | "imgSm">;
const EMPTY_DRAFT: ProductDraft = { sku: "", name: "", category: "General", price: 0, stock: 0, inStock: true, img: "" };

const icon = (path: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>
);

export function InventoryPage({ products, onSave, onDelete, onReset, onNotify, onOpenCoupons }: InventoryPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "low" | "out">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter(product => {
      const matchesSearch = !term || [product.name, product.sku, product.category].some(value => value.toLowerCase().includes(term));
      const matchesStatus = status === "all"
        || (status === "active" && product.inStock && product.stock > 0)
        || (status === "low" && product.inStock && product.stock > 0 && product.stock <= 5)
        || (status === "out" && (!product.inStock || product.stock === 0));
      return matchesSearch && matchesStatus;
    });
  }, [products, query, status]);

  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStock = products.filter(product => product.inStock && product.stock > 0 && product.stock <= 5).length;
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
          <button className="btn-ghost inventory-add-btn" type="button" onClick={onOpenCoupons}>{icon("M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z")} Coupons</button>
          <button className="btn-orange inventory-add-btn" type="button" onClick={openCreate}>{icon("M12 5v14M5 12h14")} Add Product</button>
        </div>
      </section>

      <section className="inventory-stats" aria-label="Inventory summary">
        <div><span>Products</span><strong>{products.length}</strong><small>{products.filter(product => product.inStock).length} active</small></div>
        <div><span>Total units</span><strong>{totalUnits}</strong><small>Across all products</small></div>
        <div><span>Low stock</span><strong>{lowStock}</strong><small>Five units or fewer</small></div>
        <div><span>Inventory value</span><strong>${inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>Price × stock</small></div>
      </section>

      {formOpen && (
        <section className="inventory-form-card ss-card" aria-label={editingId ? "Edit product" : "Add product"}>
          <div className="inventory-section-heading"><div><span className="page-eyebrow">{editingId ? "Update catalog entry" : "New catalog entry"}</span><h2>{editingId ? "Edit product" : "Add product"}</h2></div><button type="button" className="inventory-icon-btn" onClick={closeForm} aria-label="Close product form">x</button></div>
          <form onSubmit={submit} className="inventory-form">
            <label><span>Product name *</span><input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Mechanical Keyboard" /></label>
            <label><span>SKU *</span><input value={draft.sku} onChange={event => setDraft({ ...draft, sku: event.target.value })} placeholder="e.g. ACC-004" /></label>
            <label><span>Category</span><input value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })} placeholder="Accessories" /></label>
            <label><span>Price</span><input type="number" min="0" step="0.01" value={draft.price} onChange={event => setDraft({ ...draft, price: Number(event.target.value) })} /></label>
            <label><span>Stock quantity</span><input type="number" min="0" step="1" value={draft.stock} onChange={event => setDraft({ ...draft, stock: Number(event.target.value) })} /></label>
            <label className="inventory-image-field"><span>Image URL</span><input type="url" value={draft.img} onChange={event => setDraft({ ...draft, img: event.target.value })} placeholder="https://..." /></label>
            <label className="inventory-checkbox"><input type="checkbox" checked={draft.inStock} onChange={event => setDraft({ ...draft, inStock: event.target.checked })} /><span>Product is active and available to ShopScript</span></label>
            {error && <p className="inventory-form-error" role="alert">{error}</p>}
            <div className="inventory-form-actions"><button type="button" className="btn-ghost" onClick={closeForm}>Cancel</button><button type="submit" className="btn-orange">{editingId ? "Save Changes" : "Create Product"}</button></div>
          </form>
        </section>
      )}

      <section className="inventory-catalog ss-card">
        <div className="inventory-toolbar">
          <label className="inventory-search">{icon("M21 21l-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z")}<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, SKU, or category..." aria-label="Search inventory" /></label>
          <div className="inventory-filters" aria-label="Filter products">{(["all", "active", "low", "out"] as const).map(filter => <button type="button" key={filter} className={status === filter ? "active" : ""} onClick={() => setStatus(filter)}>{filter === "all" ? "All" : filter === "active" ? "Active" : filter === "low" ? "Low stock" : "Unavailable"}</button>)}</div>
          <button type="button" className="btn-ghost inventory-reset" onClick={onReset}>Reset defaults</button>
        </div>

        <div className="inventory-table-wrap" data-lenis-prevent>
          <table className="inventory-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{filteredProducts.map(product => (
              <tr key={product.id}>
                <td><div className="inventory-product-cell"><img src={product.imgSm || product.img} alt="" onError={event => { event.currentTarget.src = "https://placehold.co/80x80/f7ede5/f97316?text=SS"; }} /><div><strong>{product.name}</strong><small>{product.stock <= 5 && product.stock > 0 ? "Needs attention" : "Catalog product"}</small></div></div></td>
                <td><code>{product.sku}</code></td><td>{product.category}</td><td><strong>${product.price.toFixed(2)}</strong></td>
                <td><span className={product.stock <= 5 ? "stock-count low" : "stock-count"}>{product.stock}</span></td>
                <td><span className={product.inStock && product.stock > 0 ? "inventory-status active" : "inventory-status unavailable"}><i />{product.inStock && product.stock > 0 ? "Active" : "Unavailable"}</span></td>
                <td><div className="inventory-row-actions"><button type="button" onClick={() => openEdit(product)} aria-label={`Edit ${product.name}`}>{icon("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z")}</button><button type="button" className="danger" onClick={() => remove(product)} aria-label={`Delete ${product.name}`}>{icon("M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5")}</button></div></td>
              </tr>
            ))}</tbody>
          </table>
          {filteredProducts.length === 0 && <div className="inventory-empty"><strong>No matching products</strong><span>Change the search or status filter.</span></div>}
        </div>
      </section>
    </main>
  );
}
