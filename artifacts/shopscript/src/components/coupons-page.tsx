import { useMemo, useState } from "react";
import { DEFAULT_COUPONS, normalizeCouponCode, type CouponEntry } from "../coupon-data";
import "../inventory.css";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message: string) => void;
type Filter = "all" | "active" | "inactive";

function blankCoupon(): CouponEntry {
  return { id: "coupon-" + Date.now(), code: "", discount: 0.1, active: true, description: "" };
}

export function CouponsPage({ coupons, onSave, onDelete, onReset, onNotify, onBackToInventory }: { coupons: CouponEntry[]; onSave: (coupon: CouponEntry) => void; onDelete: (id: string) => void; onReset: () => void; onNotify: Notice; onBackToInventory?: () => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<CouponEntry | null>(null);
  const [draft, setDraft] = useState<CouponEntry>(blankCoupon);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCoupons = useMemo(() => coupons.filter(coupon => {
    const matchesQuery = !normalizedQuery || coupon.code.toLowerCase().includes(normalizedQuery) || coupon.description.toLowerCase().includes(normalizedQuery);
    const matchesFilter = filter === "all" || (filter === "active" ? coupon.active : !coupon.active);
    return matchesQuery && matchesFilter;
  }), [coupons, filter, normalizedQuery]);

  const openCreate = () => { setEditing(null); setDraft(blankCoupon()); };
  const openEdit = (coupon: CouponEntry) => { setEditing(coupon); setDraft({ ...coupon }); };
  const save = () => {
    const code = normalizeCouponCode(draft.code);
    if (!code) { onNotify("error", "Coupon code required", "Enter a coupon code before saving."); return; }
    if (!/^[A-Z0-9_ -]+$/.test(code)) { onNotify("error", "Invalid coupon code", "Use letters, numbers, spaces, hyphens, or underscores only."); return; }
    if (!Number.isFinite(draft.discount) || draft.discount < 0 || draft.discount > 0.95) { onNotify("error", "Invalid discount", "Discount must be from 0% to 95%."); return; }
    const duplicate = coupons.find(coupon => coupon.code === code && coupon.id !== draft.id);
    if (duplicate) { onNotify("error", "Duplicate coupon", code + " already exists."); return; }
    onSave({ ...draft, code, description: draft.description.trim() || "Custom ShopScript coupon." });
    setEditing(null);
    setDraft(blankCoupon());
  };

  return (
    <main className="inventory-page coupon-page">
      <section className="inventory-hero">
        <div>
          <span className="page-eyebrow">Discount catalog</span>
          <h1>Coupon Manager</h1>
          <p>Create reusable coupons for the interpreter. Scripts can also define temporary coupons with <code>coupon "CODE" 25%;</code>.</p>
        </div>
        <div className="inventory-hero-actions">
          {onBackToInventory && <button className="btn-ghost" onClick={onBackToInventory}>Back to products</button>}
          <button className="btn-ghost" onClick={onReset}>Reset defaults</button>
          <button className="btn-orange" onClick={openCreate}>New Coupon +</button>
        </div>
      </section>

      <section className="inventory-manager ss-card">
        <div className="inventory-toolbar">
          <div className="inventory-search"><span>Search</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search code or description..." /></div>
          <div className="inventory-filters" aria-label="Filter coupons">{(["all", "active", "inactive"] as const).map(item => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "All" : item === "active" ? "Active" : "Inactive"}</button>)}</div>
        </div>

        <div className="coupon-grid">
          <article className="coupon-form-card">
            <h2>{editing ? "Edit coupon" : "Create coupon"}</h2>
            <label>Code<input value={draft.code} onChange={event => setDraft(current => ({ ...current, code: event.target.value }))} placeholder="BLACKFRIDAY" /></label>
            <label>Discount %<input type="number" min="0" max="95" step="1" value={Math.round(draft.discount * 100)} onChange={event => setDraft(current => ({ ...current, discount: Number(event.target.value) / 100 }))} /></label>
            <label>Description<textarea data-lenis-prevent value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} placeholder="What this coupon is for" /></label>
            <label className="coupon-checkbox"><input type="checkbox" checked={draft.active} onChange={event => setDraft(current => ({ ...current, active: event.target.checked }))} /> Active coupon</label>
            <div className="coupon-form-actions"><button className="btn-orange" onClick={save}>{editing ? "Save changes" : "Create coupon"}</button><button className="btn-ghost" onClick={openCreate}>Clear</button></div>
          </article>

          <div className="coupon-list">
            {visibleCoupons.map(coupon => (
              <article className="coupon-card" key={coupon.id}>
                <div><strong>{coupon.code}</strong><span>{coupon.description}</span></div>
                <div className="coupon-card-meta"><b>{Math.round(coupon.discount * 100)}%</b><em className={coupon.active ? "active" : "inactive"}>{coupon.active ? "Active" : "Inactive"}</em></div>
                <div className="coupon-card-actions"><button onClick={() => openEdit(coupon)}>Edit</button><button onClick={() => onDelete(coupon.id)} disabled={DEFAULT_COUPONS.some(item => item.id === coupon.id)}>Delete</button></div>
              </article>
            ))}
            {visibleCoupons.length === 0 && <div className="coupon-empty">No coupons match the current search.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}
