import { useState, useRef, useCallback, useEffect } from "react";
import {
  interpret,
  INVENTORY,
  type InterpreterResult,
  type Token,
  type ClassDefinition,
  type ObjectInstance,
} from "./shopscript-interpreter";

// ─── Sample programs ──────────────────────────────────────────────────────────
const SAMPLE_VALID = `// ShopScript Sample Program
let user = "Ava";
let budget = 1200.00;
let cart = [];

add "Smartphone X" 1 @ 599.00;
add "Wireless Earbuds" 1 @ 199.00;
add "Phone Case" 2 @ 29.00;

apply coupon "SAVE10";
set shipping = 40.00;

checkout;`;

const SAMPLE_SYNTAX_ERROR = `// Syntax Error Sample
let user = "Bob"
let budget = 500.00;

add Smartphone X 1 @ 599.00;
apply coupon SAVE10;

checkout;`;

const SAMPLE_SEMANTIC_ERROR = `// Semantic Error Sample
let user = "Carol";
let budget = 300.00;
let cart = [];

add "Hoverboard" 1 @ 250.00;
add "Phone Case" 0 @ 29.00;

apply coupon "BLACKFRIDAY";
set shipping = 40.00;

checkout;`;

const SAMPLE_OOP = `// ShopScript OOP Demo — class & new
let user = "Dev";
let cart = [];

class Product {
  name = "Unknown";
  price = 0.00;
  stock = true;
}

class PremiumProduct {
  name = "Premium Item";
  price = 499.00;
  warranty = 2;
  stock = true;
}

let phone = new Product;
let headset = new PremiumProduct;

set phone.name = "Pixel 9 Pro";
set phone.price = 849.00;

set headset.name = "Studio Headset";
set headset.price = 349.00;

add phone 1;
add headset 2;

apply coupon "STUDENT10";
set shipping = 20.00;

checkout;`;

// ─── Product data with real Unsplash images ───────────────────────────────────
const PRODUCTS = [
  {
    name: "Smartphone X",
    price: 599.0,
    inStock: true,
    img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop&auto=format",
    imgSm: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=60&h=60&fit=crop&auto=format",
  },
  {
    name: "Wireless Earbuds",
    price: 199.0,
    inStock: true,
    img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop&auto=format",
    imgSm: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=60&h=60&fit=crop&auto=format",
  },
  {
    name: "Phone Case",
    price: 29.0,
    inStock: true,
    img: "https://images.unsplash.com/photo-1601593346740-925612772716?w=200&h=200&fit=crop&auto=format",
    imgSm: "https://images.unsplash.com/photo-1601593346740-925612772716?w=60&h=60&fit=crop&auto=format",
  },
  {
    name: "Urban Backpack",
    price: 49.0,
    inStock: true,
    img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop&auto=format",
    imgSm: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=60&h=60&fit=crop&auto=format",
  },
];

// ─── Fallback images for OOP / custom products ────────────────────────────────
const OOP_IMG = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop&auto=format";
const OOP_IMG_SM = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&h=60&fit=crop&auto=format";

function getProductImg(name: string, small = false): string {
  const p = PRODUCTS.find(p => p.name === name);
  if (p) return small ? p.imgSm : p.img;
  return small ? OOP_IMG_SM : OOP_IMG;
}

// ─── Token chip class map ─────────────────────────────────────────────────────
function tokenClass(type: string) {
  const m: Record<string, string> = {
    keyword:"keyword", string:"string", number:"number", operator:"operator",
    at:"at", semicolon:"semicolon", identifier:"identifier", boolean:"boolean",
    assign:"assign", symbol:"symbol", lbracket:"lbracket", rbracket:"rbracket",
    lbrace:"symbol", rbrace:"symbol", dot:"operator",
  };
  return m[type] ?? "identifier";
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Ico = {
  code: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  cart: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  box: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  tag: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  receipt: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  clipboard: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  zap: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  table: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  check: (s=14,c="#16a34a") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  alert: (s=14,c="#dc2626") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  dna: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="M2 9c6.667-6 13.333 0 20-6"/></svg>,
  sun: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  plus: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  x: (s=12,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  down: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  chevron: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  play: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  bag: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  menu: (s=20,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
};

// ─── OOP sub-cards ────────────────────────────────────────────────────────────
function ClassCard({ def }: { def: ClassDefinition }) {
  return (
    <div style={{ background:"hsl(220 30% 98%)", border:"1px solid hsl(220 20% 88%)", borderRadius:10, padding:12, fontFamily:"var(--app-font-mono)", fontSize:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <span style={{ background:"hsl(25 95% 53%)", color:"white", fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:4 }}>class</span>
        <span style={{ fontWeight:800, color:"hsl(220 20% 15%)", fontSize:13 }}>{def.name}</span>
        <span style={{ marginLeft:"auto", fontSize:10, color:"hsl(220 10% 55%)" }}>{Object.keys(def.fields).length} fields</span>
      </div>
      {Object.entries(def.fields).map(([k,v]) => (
        <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"3px 8px", background:"white", borderRadius:6, border:"1px solid hsl(220 20% 93%)", marginBottom:3 }}>
          <span style={{ color:"#7c3aed" }}>{k}</span>
          <span style={{ color:"hsl(220 10% 50%)" }}>: {v.type}</span>
          <span style={{ color: v.type==="string"?"#15803d":"#c2410c" }}>{v.type==="string"?`"${v.value}"`:v.value}</span>
        </div>
      ))}
    </div>
  );
}
function InstanceCard({ name, inst }: { name:string; inst:ObjectInstance }) {
  return (
    <div style={{ background:"hsl(36 33% 97%)", border:"1px solid hsl(25 95% 53% / 0.25)", borderRadius:10, padding:12, fontFamily:"var(--app-font-mono)", fontSize:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <span style={{ background:"hsl(220 60% 55%)", color:"white", fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:4 }}>new</span>
        <span style={{ fontWeight:800, color:"hsl(220 20% 15%)", fontSize:13 }}>{name}</span>
        <span style={{ marginLeft:"auto", fontSize:10, color:"hsl(25 95% 53%)", fontWeight:600 }}>: {inst.className}</span>
      </div>
      {Object.entries(inst.fields).map(([k,v]) => (
        <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"3px 8px", background:"white", borderRadius:6, border:"1px solid hsl(30 20% 90%)", marginBottom:3 }}>
          <span style={{ color:"#7c3aed" }}>{k}</span>
          <span style={{ color:"hsl(220 10% 50%)" }}>: {v.type}</span>
          <span style={{ color: v.type==="string"?"#15803d":"#c2410c" }}>{v.type==="string"?`"${v.value}"`:v.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [code, setCode]       = useState(SAMPLE_VALID);
  const [result, setResult]   = useState<InterpreterResult | null>(null);
  const [hasRun, setHasRun]   = useState(false);
  const [activeNav, setNav]   = useState("Home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = code.split("\n");

  const runProgram = useCallback(() => { setResult(interpret(code)); setHasRun(true); }, [code]);
  const clearEditor = () => { setCode(""); setResult(null); setHasRun(false); };
  const loadSample = (t: "valid"|"syntax"|"semantic"|"oop") => {
    const m = { valid:SAMPLE_VALID, syntax:SAMPLE_SYNTAX_ERROR, semantic:SAMPLE_SEMANTIC_ERROR, oop:SAMPLE_OOP };
    setCode(m[t]); setResult(null); setHasRun(false);
  };

  useEffect(() => { runProgram(); }, []); // eslint-disable-line

  const cart        = result?.cart ?? [];
  const subtotal    = result?.subtotal ?? 0;
  const discountAmt = subtotal * (result?.discount ?? 0);
  const shipping    = result?.shipping ?? 0;
  const total       = result?.total ?? 0;
  const user        = result?.user ?? "Guest";
  const coupon      = result?.coupon ?? null;
  const discount    = result?.discount ?? 0;
  const classes     = result?.classes ?? [];
  const instances   = result?.instances ?? {};
  const hasErrors   = (result?.lexErrors.length ?? 0) + (result?.syntaxErrors.length ?? 0) + (result?.semanticErrors.length ?? 0) > 0;
  const didCheckout = result?.didCheckout ?? false;
  const hasOOP      = classes.length > 0 || Object.keys(instances).length > 0;

  const orderDate = new Date();
  const orderId   = `#SS-${orderDate.getFullYear()}-${String(orderDate.getMonth()+1).padStart(2,"0")}${String(orderDate.getDate()).padStart(2,"0")}-001`;

  return (
    <div style={{ minHeight:"100vh", background:"hsl(36 33% 97%)" }}>

      {/* ━━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header style={{ background:"white", borderBottom:"1px solid hsl(30 20% 90%)", position:"sticky", top:0, zIndex:200, boxShadow:"0 1px 6px hsl(0 0% 0% / 0.05)" }}>
        <div className="header-inner" style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px", height:56, display:"flex", alignItems:"center", gap:16 }}>
          {/* Logo — always visible */}
          <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0, textDecoration:"none" }}>
            <div style={{ background:"hsl(25 95% 53%)", borderRadius:8, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", color:"white", flexShrink:0 }}>
              {Ico.code(16,"white")}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:"hsl(25 95% 48%)", lineHeight:1.1 }}>ShopScript</div>
              <div style={{ fontSize:9.5, color:"hsl(220 10% 55%)", lineHeight:1 }}>Code. Simulate. Sell.</div>
            </div>
          </div>

          {/* Search — hidden on mobile */}
          <div className="header-search" style={{ alignItems:"center", gap:8, background:"hsl(30 20% 97%)", border:"1px solid hsl(30 20% 88%)", borderRadius:8, padding:"6px 11px", flexShrink:0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(220 10% 55%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span style={{ fontSize:12.5, color:"hsl(220 10% 60%)", flex:1, whiteSpace:"nowrap", overflow:"hidden" }}>Search docs, examples...</span>
            <span style={{ fontSize:10.5, background:"hsl(30 20% 90%)", padding:"1px 5px", borderRadius:3, color:"hsl(220 10% 55%)", flexShrink:0 }}>⌘K</span>
          </div>

          {/* Nav — hidden on mobile */}
          <nav className="header-nav" style={{ flex:1 }}>
            {["Home","Docs","Examples","Playground","About"].map(n => (
              <span key={n} className={`nav-link${activeNav===n?" active":""}`} onClick={() => setNav(n)}>{n}</span>
            ))}
          </nav>

          {/* Right actions */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginLeft:"auto", flexShrink:0 }}>
            {/* Theme — hidden on small mobile */}
            <button style={{ background:"none", border:"none", cursor:"pointer", color:"hsl(220 10% 50%)", display:"flex", alignItems:"center", padding:4 }}>
              {Ico.sun(17,"hsl(220 10% 55%)")}
            </button>

            <button className="btn-orange" style={{ fontSize:12.5, padding:"7px 13px" }} onClick={runProgram}>
              New Program {Ico.plus(13,"white")}
            </button>

            {/* Avatar */}
            <div style={{ width:33, height:33, borderRadius:"50%", background:"hsl(25 95% 53%)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, position:"relative", cursor:"pointer", flexShrink:0 }}>
              SS
              <span style={{ position:"absolute", bottom:1, right:1, width:8, height:8, background:"#22c55e", borderRadius:"50%", border:"2px solid white" }} />
            </div>
            {Ico.chevron(13,"hsl(220 10% 50%)")}

            {/* Hamburger — visible on mobile only */}
            <button
              onClick={() => setMobileMenu(m => !m)}
              style={{ background:"none", border:"none", cursor:"pointer", display:"none", alignItems:"center", padding:4 }}
              className="mobile-menu-btn"
            >
              {Ico.menu()}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenu && (
          <div style={{ background:"white", borderTop:"1px solid hsl(30 20% 90%)", padding:"12px 20px", display:"flex", flexDirection:"column", gap:16 }}>
            {["Home","Docs","Examples","Playground","About"].map(n => (
              <span key={n} className={`nav-link${activeNav===n?" active":""}`} onClick={() => { setNav(n); setMobileMenu(false); }}>{n}</span>
            ))}
          </div>
        )}
      </header>

      {/* ━━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="hero-gradient" style={{ padding:"34px 28px 26px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", gap:20 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"white", border:"1px solid hsl(25 95% 53% / 0.22)", borderRadius:999, padding:"4px 12px", fontSize:12, color:"hsl(25 95% 53%)", fontWeight:600, marginBottom:14 }}>
              Welcome to ShopScript 👋
            </div>
            <h1 style={{ fontSize:"clamp(22px, 3vw, 34px)", fontWeight:900, color:"hsl(220 20% 12%)", lineHeight:1.2, margin:"0 0 10px" }}>
              Mini Programming Language<br />
              <span style={{ color:"hsl(25 95% 53%)" }}>for E-commerce Simulation</span>
            </h1>
            <p style={{ color:"hsl(220 10% 45%)", fontSize:"clamp(13px, 1.5vw, 15px)", margin:"0 0 18px" }}>
              Write simple scripts. Simulate carts. See results instantly.
            </p>
            <div className="hero-badges" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[
                { icon:Ico.zap(12), label:"Lexical" }, { icon:Ico.code(12), label:"Syntax" },
                { icon:Ico.table(12), label:"Semantic" }, { icon:Ico.clipboard(12), label:"Scope" },
                { icon:Ico.tag(12), label:"Data Types" }, { icon:Ico.zap(12), label:"Control Flow" },
                { icon:Ico.dna(12), label:"OOP" },
              ].map(b => (
                <span key={b.label} className="feature-badge">
                  <span style={{ display:"flex", alignItems:"center" }}>{b.icon}</span>{b.label}
                </span>
              ))}
            </div>
          </div>

          {/* Decorative illustration — hidden on tablets */}
          <div className="hero-illus" style={{ alignItems:"center", gap:12, flexShrink:0 }}>
            <div style={{ background:"white", borderRadius:18, padding:"16px 20px", boxShadow:"0 8px 32px hsl(25 95% 53% / 0.16)", border:"1px solid hsl(25 95% 53% / 0.1)", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:54 }}>🛒</span>
              <div style={{ background:"hsl(25 95% 53%)", color:"white", fontSize:11, fontWeight:700, padding:"2px 12px", borderRadius:999 }}>
                {cart.length > 0 ? `${cart.reduce((s,i) => s+i.quantity,0)} items` : "Ready"}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[{ e:"📱", bg:"#dbeafe" }, { e:"🎧", bg:"#dcfce7" }, { e: hasOOP ? "🧬" : "🤖", bg:"#fef9c3" }].map((d,i) => (
                <div key={i} style={{ background:d.bg, borderRadius:10, padding:"10px 14px", fontSize:24, border:"1px solid white", boxShadow:"0 2px 8px hsl(0 0% 0% / 0.07)" }}>{d.e}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━ WORKSPACE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="workspace-outer" style={{ maxWidth:1280, margin:"0 auto", padding:"20px 20px 0" }}>
        <div className="workspace-grid">

          {/* ── LEFT: Editor ─────────────────────────────────────────── */}
          <div className="ss-card" style={{ overflow:"hidden" }}>
            {/* Top bar */}
            <div style={{ background:"#12121c", padding:"10px 12px 0", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ display:"flex", color:"hsl(25 95% 60%)" }}>{Ico.code(15,"hsl(25 95% 60%)")}</span>
                <span style={{ fontSize:13, fontWeight:700, color:"#cdd6f4" }}>ShopScript Editor</span>
              </div>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                <button className="btn-orange" style={{ padding:"5px 12px", fontSize:12, gap:5 }} onClick={runProgram}>
                  {Ico.play()} Run Program
                </button>
                <button style={{ background:"transparent", border:"1px solid #3a3a4a", color:"#6c7086", borderRadius:8, padding:"5px 10px", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }} onClick={clearEditor}>
                  {Ico.x(10,"#6c7086")} Clear
                </button>
                <select
                  onChange={(e) => { loadSample(e.target.value as "valid"|"syntax"|"semantic"|"oop"); e.target.value=""; }}
                  defaultValue=""
                  style={{ background:"#1e1e2e", border:"1px solid #3a3a4a", color:"#89b4fa", borderRadius:8, padding:"5px 9px", fontSize:12, cursor:"pointer" }}
                >
                  <option value="" disabled>Load Sample</option>
                  <option value="valid">Valid Sample</option>
                  <option value="syntax">Syntax Error</option>
                  <option value="semantic">Semantic Error</option>
                  <option value="oop">OOP Demo</option>
                </select>
              </div>
            </div>
            {/* File tab */}
            <div style={{ background:"#12121c", padding:"0 12px" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#1e1e2e", color:"#89b4fa", fontFamily:"var(--app-font-mono)", fontSize:12, padding:"5px 14px 0", borderRadius:"6px 6px 0 0", border:"1px solid #2a2a3a", borderBottom:"2px solid hsl(25 95% 53%)" }}>
                main.shop
                <span style={{ background:"#3a3a4a", borderRadius:"50%", width:15, height:15, display:"flex", alignItems:"center", justifyContent:"center" }}>{Ico.plus(9,"#6c7086")}</span>
              </div>
            </div>
            {/* Code area */}
            <div style={{ display:"flex", background:"#1e1e2e" }}>
              <div className="line-numbers">
                {lines.map((_,i) => <div key={i}>{i+1}</div>)}
              </div>
              <textarea
                ref={textareaRef}
                className="code-editor"
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                onKeyDown={e => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const s = e.currentTarget.selectionStart, end = e.currentTarget.selectionEnd;
                    setCode(code.substring(0,s) + "  " + code.substring(end));
                    setTimeout(() => { if (textareaRef.current) { textareaRef.current.selectionStart = s+2; textareaRef.current.selectionEnd = s+2; } }, 0);
                  }
                }}
              />
            </div>
            {/* Status bar */}
            <div className="status-bar">
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background: hasErrors&&hasRun?"#f38ba8":"#a6e3a1", display:"inline-block" }} />
                <span style={{ color: hasErrors&&hasRun?"#f38ba8":"#a6e3a1" }}>{hasErrors&&hasRun ? "Error" : "Ready"}</span>
              </div>
              <span>Lines {lines.length}, Col 1</span>
              <span>ShopScript v0.2.0</span>
            </div>
          </div>

          {/* ── RIGHT: Simulation Panel ───────────────────────────────── */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:"hsl(25 95% 53%)", display:"flex" }}>{Ico.bag(16,"hsl(25 95% 53%)")}</span>
              <span style={{ fontWeight:800, fontSize:15, color:"hsl(220 20% 15%)" }}>Simulation Panel</span>
              {hasOOP && <span style={{ marginLeft:"auto", background:"hsl(25 95% 53% / 0.1)", color:"hsl(25 95% 45%)", border:"1px solid hsl(25 95% 53% / 0.25)", borderRadius:999, fontSize:11, fontWeight:700, padding:"2px 10px" }}>OOP Mode</span>}
            </div>

            {/* Row 1: Inventory + Cart */}
            <div className="sim-row1">
              {/* Product Inventory */}
              <div className="ss-card" style={{ padding:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ color:"hsl(25 95% 53%)", display:"flex" }}>{Ico.box(14,"hsl(25 95% 53%)")}</span>
                    <span style={{ fontWeight:700, fontSize:13, color:"hsl(220 20% 18%)" }}>Product Inventory</span>
                  </div>
                  <span style={{ fontSize:11.5, color:"hsl(25 95% 53%)", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>View all →</span>
                </div>

                <div className="products-grid">
                  {PRODUCTS.map(p => {
                    const inCart = cart.find(c => c.name === p.name);
                    return (
                      <div key={p.name} className="product-card">
                        <div style={{ position:"relative" }}>
                          <img
                            src={p.img}
                            alt={p.name}
                            className="product-img"
                            onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/200x200/f0f0f0/999?text=${encodeURIComponent(p.name)}`; }}
                          />
                          {inCart && (
                            <span style={{ position:"absolute", top:6, right:6, background:"hsl(25 95% 53%)", color:"white", fontSize:10, fontWeight:700, borderRadius:999, padding:"2px 7px", boxShadow:"0 1px 4px hsl(0 0% 0% / 0.2)" }}>
                              {inCart.quantity}
                            </span>
                          )}
                        </div>
                        <div style={{ padding:"8px 8px 10px", textAlign:"center" }}>
                          <div style={{ fontSize:11, fontWeight:600, color:"hsl(220 20% 20%)", marginBottom:2, lineHeight:1.3 }}>{p.name}</div>
                          <div style={{ fontSize:12.5, fontWeight:700, color:"hsl(25 95% 53%)", marginBottom:3 }}>${p.price.toFixed(2)}</div>
                          <div style={{ fontSize:10, color:"#16a34a", display:"flex", alignItems:"center", gap:3, justifyContent:"center" }}>
                            <span style={{ width:5, height:5, borderRadius:"50%", background:"#16a34a", display:"inline-block" }} /> In Stock
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* OOP-defined products */}
                {cart.filter(c => !PRODUCTS.find(p => p.name === c.name)).length > 0 && (
                  <div style={{ marginTop:10, borderTop:"1px dashed hsl(30 20% 85%)", paddingTop:10 }}>
                    <div style={{ fontSize:10, color:"hsl(220 10% 55%)", fontWeight:600, marginBottom:6 }}>OOP-defined products</div>
                    {cart.filter(c => !PRODUCTS.find(p => p.name === c.name)).map(c => (
                      <div key={c.name} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <img src={OOP_IMG_SM} alt={c.name} className="product-img-sm" onError={e => { (e.target as HTMLImageElement).src="https://placehold.co/60x60/f0f0f0/999?text=OOP"; }}/>
                        <div>
                          <div style={{ fontSize:11, fontWeight:600, color:"hsl(220 20% 20%)" }}>{c.name}</div>
                          <div style={{ fontSize:11, color:"hsl(25 95% 53%)", fontWeight:700 }}>${c.price.toFixed(2)}</div>
                        </div>
                        <span style={{ marginLeft:"auto", fontSize:9, background:"hsl(220 60% 55%)", color:"white", borderRadius:4, padding:"1px 5px", fontWeight:700 }}>OOP</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shopping Cart */}
              <div className="ss-card" style={{ padding:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ color:"hsl(25 95% 53%)", display:"flex" }}>{Ico.cart(14,"hsl(25 95% 53%)")}</span>
                    <span style={{ fontWeight:700, fontSize:13, color:"hsl(220 20% 18%)" }}>Shopping Cart</span>
                  </div>
                  {cart.length > 0 && <span style={{ background:"hsl(25 95% 53%)", color:"white", borderRadius:999, fontSize:11, fontWeight:700, padding:"1px 9px" }}>{cart.reduce((s,i)=>s+i.quantity,0)}</span>}
                </div>
                {cart.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"24px 0", color:"hsl(220 10% 60%)", fontSize:12 }}>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:8, opacity:0.35 }}>{Ico.cart(36,"hsl(220 10% 50%)")}</div>
                    Cart is empty — run a program to add items
                  </div>
                ) : (
                  <div>
                    {cart.map((item, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 0", borderBottom: i<cart.length-1?"1px solid hsl(30 20% 93%)":"none" }}>
                        <img
                          src={getProductImg(item.name, true)}
                          alt={item.name}
                          className="product-img-sm"
                          onError={e => { (e.target as HTMLImageElement).src=`https://placehold.co/60x60/f0f0f0/999?text=${encodeURIComponent(item.name[0])}`; }}
                        />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"hsl(220 20% 20%)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</div>
                          <div style={{ fontSize:11, color:"hsl(25 95% 53%)", fontWeight:600 }}>${item.price.toFixed(2)}</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <button className="qty-btn">−</button>
                          <span style={{ fontSize:12, fontWeight:700, minWidth:18, textAlign:"center" }}>{item.quantity}</span>
                          <button className="qty-btn">+</button>
                        </div>
                        <div style={{ fontSize:12, fontWeight:700, color:"hsl(220 20% 20%)", minWidth:50, textAlign:"right" }}>${(item.price*item.quantity).toFixed(2)}</div>
                        <button style={{ background:"none", border:"none", cursor:"pointer", display:"flex", padding:2 }}>{Ico.x(11,"hsl(0 84% 65%)")}</button>
                      </div>
                    ))}
                    <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0 0", borderTop:"1px solid hsl(30 20% 88%)", fontSize:12, marginTop:2 }}>
                      <span style={{ color:"hsl(220 10% 50%)" }}>Subtotal ({cart.length} item{cart.length!==1?"s":""})</span>
                      <span style={{ fontWeight:700, color:"hsl(25 95% 53%)" }}>${subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Discount + Checkout Summary + Receipt + CTA */}
            <div className="sim-row2">
              {/* Discount */}
              <div className="ss-card" style={{ padding:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                  <span style={{ color:"#16a34a", display:"flex" }}>{Ico.tag(13,"#16a34a")}</span>
                  <span style={{ fontWeight:700, fontSize:12.5, color:"hsl(220 20% 18%)" }}>Discount Status</span>
                </div>
                {coupon ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:4 }}>
                      <span style={{ fontSize:11, color:"hsl(220 10% 50%)" }}>Coupon Applied</span>
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <span className="coupon-badge">{coupon}</span>
                        {Ico.check(12)}
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
                      <span style={{ color:"hsl(220 10% 50%)" }}>Discount ({(discount*100).toFixed(0)}%)</span>
                      <span style={{ fontWeight:700, color:"#dc2626" }}>-${discountAmt.toFixed(2)}</span>
                    </div>
                    <div style={{ background:"hsl(142 76% 36% / 0.08)", borderRadius:6, padding:"5px 8px", display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:11, color:"#15803d", fontWeight:500 }}>You saved</span>
                      <span style={{ fontSize:12, fontWeight:800, color:"#15803d" }}>${discountAmt.toFixed(2)}</span>
                    </div>
                  </div>
                ) : <div style={{ color:"hsl(220 10% 58%)", fontSize:11, padding:"8px 0" }}>No coupon applied</div>}
              </div>

              {/* Checkout Summary */}
              <div className="ss-card" style={{ padding:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                  <span style={{ color:"hsl(25 95% 53%)", display:"flex" }}>{Ico.receipt(13,"hsl(25 95% 53%)")}</span>
                  <span style={{ fontWeight:700, fontSize:12.5, color:"hsl(220 20% 18%)" }}>Checkout Summary</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {[
                    { label:"Subtotal", value:`$${subtotal.toFixed(2)}`, color:"hsl(220 20% 20%)" },
                    ...(coupon ? [{ label:"Discount", value:`-$${discountAmt.toFixed(2)}`, color:"#dc2626" }] : []),
                    { label:"Shipping", value:`$${shipping.toFixed(2)}`, color:"hsl(220 20% 20%)" },
                  ].map(r => (
                    <div key={r.label} style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
                      <span style={{ color:"hsl(220 10% 50%)" }}>{r.label}</span>
                      <span style={{ fontWeight:600, color:r.color }}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ borderTop:"1px solid hsl(30 20% 88%)", paddingTop:5, display:"flex", justifyContent:"space-between", fontSize:13 }}>
                    <span style={{ fontWeight:700 }}>Total</span>
                    <span style={{ fontWeight:800, color:"hsl(25 95% 53%)" }}>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Preview */}
              <div className="ss-card" style={{ padding:12 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ color:"hsl(220 60% 55%)", display:"flex" }}>{Ico.clipboard(13,"hsl(220 60% 55%)")}</span>
                    <span style={{ fontWeight:700, fontSize:12.5, color:"hsl(220 20% 18%)" }}>Receipt Preview</span>
                  </div>
                  {didCheckout && (
                    <button className="btn-ghost" style={{ fontSize:10, padding:"3px 8px" }} onClick={() => {
                      const t = `ShopScript Receipt\n${"=".repeat(28)}\nThank you, ${user}!\nOrder: ${orderId}\n${"-".repeat(28)}\n${cart.map(i=>`${i.name} x${i.quantity}  $${(i.price*i.quantity).toFixed(2)}`).join("\n")}\n${"-".repeat(28)}\nSubtotal: $${subtotal.toFixed(2)}\n${coupon?`Discount: -$${discountAmt.toFixed(2)}\n`:""}Shipping: $${shipping.toFixed(2)}\nTotal: $${total.toFixed(2)}`;
                      const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([t],{type:"text/plain"})); a.download="receipt.txt"; a.click();
                    }}>
                      {Ico.down(11)} Download
                    </button>
                  )}
                </div>
                {didCheckout && !hasErrors ? (
                  <div className="receipt" style={{ fontSize:10.5, padding:10 }}>
                    <div style={{ textAlign:"center", marginBottom:8 }}>
                      <div style={{ fontWeight:800, color:"hsl(25 95% 48%)", fontSize:12 }}>ShopScript</div>
                      <div style={{ fontSize:12.5, fontWeight:700, color:"hsl(220 20% 15%)", marginTop:2 }}>Thank you, {user}! 🎉</div>
                      <div style={{ fontSize:10, color:"#22c55e" }}>Order placed successfully.</div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"hsl(220 10% 55%)", marginBottom:2 }}>
                      <span>Order ID</span><span style={{ fontWeight:600, color:"hsl(220 20% 20%)" }}>{orderId}</span>
                    </div>
                    <div style={{ borderTop:"1px dashed hsl(30 20% 80%)", paddingTop:5, marginTop:5, display:"flex", justifyContent:"space-between", fontSize:12, fontWeight:800, color:"hsl(25 95% 48%)" }}>
                      <span>Total Paid</span><span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign:"center", padding:"14px 0", color:"hsl(220 10% 60%)", fontSize:11 }}>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:6, opacity:0.3 }}>{Ico.clipboard(30,"hsl(220 10% 50%)")}</div>
                    {hasErrors ? "Fix errors first" : "Run checkout; to see receipt"}
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="checkout-cta" style={{ display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{didCheckout&&!hasErrors?"Order Confirmed!":"Ready to Checkout?"}</div>
                  <div style={{ fontSize:11, opacity:0.88, marginBottom:10 }}>
                    {hasErrors ? "Fix errors first." : didCheckout&&!hasErrors ? "Your simulation completed successfully." : "Review your items and complete your purchase simulation."}
                  </div>
                  {didCheckout && !hasErrors && (
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:10 }}>
                      <span style={{ opacity:0.85 }}>Total Paid</span>
                      <span style={{ fontWeight:800, fontSize:14 }}>${total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <button style={{ width:"100%", background:"white", color:"hsl(25 95% 48%)", border:"none", borderRadius:8, padding:"9px 0", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }} onClick={runProgram}>
                  {Ico.cart(14,"hsl(25 95% 48%)")} {didCheckout&&!hasErrors ? "Run Again" : "Checkout Now"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ━━━━ ANALYZER ROW (full-width 5 columns) ━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="analyzer-outer" style={{ padding:"16px 0 28px" }}>
          <div className="analyzer-grid">

            {/* Tokens */}
            <div className="ss-card" style={{ padding:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontWeight:700, fontSize:13, color:"hsl(220 20% 18%)" }}>Tokens</span>
                {result && <span style={{ background:"hsl(25 95% 53%)", color:"white", borderRadius:999, fontSize:11, fontWeight:700, padding:"1px 9px" }}>{result.tokens.length}</span>}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, maxHeight:120, overflowY:"auto" }}>
                {hasRun && result?.tokens.length ? (
                  result.tokens.map((t:Token,i) => (
                    <span key={i} className={`token-chip ${tokenClass(t.type)}`}>{t.type==="string"?`"${t.value}"`:t.value}</span>
                  ))
                ) : <span style={{ color:"hsl(220 10% 60%)", fontSize:12 }}>Run program to see tokens...</span>}
              </div>
            </div>

            {/* Syntax Errors */}
            <div className="ss-card" style={{ padding:14 }}>
              <div style={{ marginBottom:10 }}><span style={{ fontWeight:700, fontSize:13, color:"hsl(220 20% 18%)" }}>Syntax Errors</span></div>
              {!hasRun ? <div style={{ color:"hsl(220 10% 60%)", fontSize:12 }}>Not run yet</div>
                : result?.syntaxErrors.length===0 && result?.lexErrors.length===0 ? (
                  <div>
                    <div className="success-box" style={{ marginBottom:5 }}><span style={{ display:"flex" }}>{Ico.check(13)}</span> No syntax errors</div>
                    <div style={{ fontSize:11, color:"hsl(220 10% 55%)" }}>Your code is syntactically correct.</div>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {[...(result?.lexErrors??[]),...(result?.syntaxErrors??[])].map((e,i) => (
                      <div key={i} className="error-box"><span style={{ display:"flex",flexShrink:0 }}>{Ico.alert(12)}</span>Line {e.line}: {e.message}</div>
                    ))}
                  </div>
                )}
            </div>

            {/* Semantic Errors */}
            <div className="ss-card" style={{ padding:14 }}>
              <div style={{ marginBottom:10 }}><span style={{ fontWeight:700, fontSize:13, color:"hsl(220 20% 18%)" }}>Semantic Errors</span></div>
              {!hasRun ? <div style={{ color:"hsl(220 10% 60%)", fontSize:12 }}>Not run yet</div>
                : result?.semanticErrors.length===0 ? (
                  <div>
                    <div className="success-box" style={{ marginBottom:5 }}><span style={{ display:"flex" }}>{Ico.check(13)}</span> No semantic errors</div>
                    <div style={{ fontSize:11, color:"hsl(220 10% 55%)" }}>All variables and operations are valid.</div>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {result?.semanticErrors.map((e,i) => (
                      <div key={i} className="error-box"><span style={{ display:"flex",flexShrink:0 }}>{Ico.alert(12)}</span>Line {e.line}: {e.message}</div>
                    ))}
                  </div>
                )}
            </div>

            {/* Variable Table */}
            <div className="ss-card" style={{ padding:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontWeight:700, fontSize:13, color:"hsl(220 20% 18%)" }}>Variable Table</span>
                {result && <span style={{ background:"hsl(220 20% 88%)", color:"hsl(220 20% 40%)", borderRadius:999, fontSize:11, fontWeight:700, padding:"1px 9px" }}>{result.variables.length}</span>}
              </div>
              {result?.variables.length ? (
                <table className="var-table">
                  <thead><tr><th>Name</th><th>Type</th><th>Value</th></tr></thead>
                  <tbody>
                    {result.variables.map((v,i) => (
                      <tr key={i}>
                        <td style={{ fontFamily:"var(--app-font-mono)", color:"#7c3aed" }}>{v.name}</td>
                        <td style={{ color:"hsl(220 10% 50%)" }}>{v.type}</td>
                        <td style={{ fontFamily:"var(--app-font-mono)", color:"#15803d", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div style={{ color:"hsl(220 10% 60%)", fontSize:12 }}>No variables declared</div>}
            </div>

            {/* Output Logs */}
            <div className="ss-card" style={{ padding:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontWeight:700, fontSize:13, color:"hsl(220 20% 18%)" }}>Output Logs</span>
                {result && <span style={{ background:"hsl(142 76% 36% / 0.14)", color:"hsl(142 76% 28%)", borderRadius:999, fontSize:11, fontWeight:700, padding:"1px 9px" }}>{result.logs.length}</span>}
              </div>
              <div style={{ maxHeight:150, overflowY:"auto", display:"flex", flexDirection:"column", gap:2 }}>
                {result?.logs.length ? (
                  result.logs.map((log,i) => (
                    <div key={i} className="log-item">
                      <div className="log-dot" style={{ background: i===0?"#89b4fa": i===result.logs.length-1&&didCheckout?"#a6e3a1":"#22c55e" }} />
                      <span style={{ fontFamily:"var(--app-font-mono)", fontSize:10.5, color:"hsl(220 15% 35%)" }}>{log}</span>
                    </div>
                  ))
                ) : <div style={{ color:"hsl(220 10% 60%)", fontSize:12 }}>No logs yet</div>}
              </div>
            </div>
          </div>
        </div>

        {/* OOP panel */}
        {hasRun && hasOOP && (
          <div className="ss-card" style={{ padding:18, marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <span style={{ color:"hsl(25 95% 53%)", display:"flex" }}>{Ico.dna(17,"hsl(25 95% 53%)")}</span>
              <span style={{ fontWeight:800, fontSize:15, color:"hsl(220 20% 15%)" }}>OOP — Classes &amp; Instances</span>
              <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                {classes.length>0 && <span style={{ background:"hsl(25 95% 53% / 0.1)", color:"hsl(25 95% 45%)", border:"1px solid hsl(25 95% 53% / 0.25)", borderRadius:999, fontSize:11, fontWeight:700, padding:"2px 10px" }}>{classes.length} class{classes.length!==1?"es":""}</span>}
                {Object.keys(instances).length>0 && <span style={{ background:"hsl(220 60% 55% / 0.1)", color:"hsl(220 60% 45%)", border:"1px solid hsl(220 60% 55% / 0.25)", borderRadius:999, fontSize:11, fontWeight:700, padding:"2px 10px" }}>{Object.keys(instances).length} instance{Object.keys(instances).length!==1?"s":""}</span>}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12 }}>
              {classes.map(def => <ClassCard key={def.name} def={def}/>)}
              {Object.entries(instances).map(([n,inst]) => <InstanceCard key={n} name={n} inst={inst}/>)}
            </div>
            <div style={{ marginTop:14, background:"#12121c", borderRadius:8, padding:"10px 14px", fontFamily:"var(--app-font-mono)", fontSize:11 }}>
              <div style={{ color:"#6c7086", marginBottom:6, fontFamily:"sans-serif", fontSize:11 }}>OOP Syntax Reference</div>
              {[
                { c:'class Product { name = "?"; price = 0.00; }', m:"// Define" },
                { c:'let item = new Product;', m:"// Instantiate" },
                { c:'set item.name = "Phone"; set item.price = 299.00;', m:"// Mutate" },
                { c:'add item 1;', m:"// Add to cart" },
              ].map((r,i) => (
                <div key={i} style={{ display:"flex", gap:12, marginBottom:3 }}>
                  <span style={{ color:"#cdd6f4" }}>{r.c}</span>
                  <span style={{ color:"#4a4a6a" }}>{r.m}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ━━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer style={{ background:"white", borderTop:"1px solid hsl(30 20% 90%)" }}>
        <div className="footer-inner" style={{ maxWidth:1280, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, color:"hsl(220 10% 55%)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:"hsl(25 95% 53%)", fontWeight:700 }}>ShopScript</span>
            <span>—</span>
            <span>Programming Languages Final Project · v0.2.0</span>
          </div>
          <div className="footer-right" style={{ display:"flex", gap:20 }}>
            {[
              { icon:Ico.sun(13,"hsl(45 90% 50%)"), label:"Light & Clean" },
              { icon:"😊", label:"Friendly" },
              { icon:Ico.zap(13,"hsl(25 95% 53%)"), label:"Fast & Intuitive" },
              { icon:Ico.code(13,"hsl(220 60% 55%)"), label:"Built for Developers" },
            ].map(f => (
              <span key={f.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ display:"flex", alignItems:"center" }}>{f.icon}</span> {f.label}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
