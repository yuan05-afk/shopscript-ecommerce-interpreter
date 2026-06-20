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

// ─── App metadata and navigation ───────────────────────────────────────────────
const APP_VERSION = "0.2.0";
const NAV_ITEMS = ["Home", "Docs", "Examples", "Playground", "About"] as const;
type NavItem = typeof NAV_ITEMS[number];

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
  heart: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  book: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  users: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  menu: (s=20,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
};



function DocsPage({ onNavigate }: { onNavigate: (page: NavItem) => void }) {
  const [query, setQuery] = useState("");
  const sections = [
    { id: "overview", title: "Overview", keywords: "purpose educational ecommerce interpreter scope" },
    { id: "quick-start", title: "Quick start", keywords: "install pnpm localhost windows run setup" },
    { id: "pipeline", title: "Interpreter pipeline", keywords: "lexer lexical syntax semantic execution tokens" },
    { id: "syntax", title: "Language syntax", keywords: "let string number boolean list grammar semicolon comments" },
    { id: "commands", title: "E-commerce commands", keywords: "add coupon shipping checkout inventory cart price" },
    { id: "oop", title: "Object-oriented syntax", keywords: "class new instance field set object oop" },
    { id: "analyzer", title: "Analyzer output", keywords: "tokens errors variables logs receipt panels" },
    { id: "status", title: "Current status", keywords: "limitations planned control flow scope types methods tests" },
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSections = sections.filter(section =>
    !normalizedQuery || (section.title + " " + section.keywords).toLowerCase().includes(normalizedQuery)
  );
  const visibleIds = new Set(visibleSections.map(section => section.id));
  const jumpTo = (id: string) => document.getElementById("docs-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <main className="docs-page">
      <section className="docs-hero">
        <div>
          <span className="page-eyebrow">ShopScript v{APP_VERSION}</span>
          <h1>Documentation</h1>
          <p>Learn the syntax currently supported by the browser interpreter, understand each analysis stage, and distinguish implemented behavior from planned course requirements.</p>
        </div>
        <button className="btn-orange" onClick={() => onNavigate("Home")}>{Ico.play()} Open interpreter</button>
      </section>

      <div className="docs-search-wrap">
        <span aria-hidden="true">{Ico.book(17, "hsl(25 95% 53%)")}</span>
        <input
          id="docs-search"
          className="docs-search"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search documentation..."
          aria-label="Search ShopScript documentation"
        />
        {query && <button className="docs-search-clear" onClick={() => setQuery("")} aria-label="Clear documentation search">{Ico.x(12)}</button>}
      </div>

      <div className="docs-layout">
        <aside className="docs-sidebar" aria-label="Documentation sections">
          <div className="docs-sidebar-title">On this page</div>
          {sections.map(section => (
            <button
              key={section.id}
              className={visibleIds.has(section.id) ? "" : "filtered"}
              onClick={() => jumpTo(section.id)}
              disabled={!visibleIds.has(section.id)}
            >
              <span>{section.title}</span>
              {Ico.chevron(12)}
            </button>
          ))}
          <div className="docs-version-card">
            <strong>Version {APP_VERSION}</strong>
            <span>Implementation reference</span>
          </div>
        </aside>

        <div className="docs-content">
          {visibleSections.length === 0 && (
            <section className="docs-empty ss-card">
              <div className="page-icon">{Ico.book(22, "hsl(25 95% 53%)")}</div>
              <h2>No matching documentation</h2>
              <p>Try searching for syntax, coupon, OOP, errors, setup, or control flow.</p>
              <button className="btn-ghost" onClick={() => setQuery("")}>Clear search</button>
            </section>
          )}

          {visibleIds.has("overview") && (
            <article id="docs-overview" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">01</span>
                <div><span className="docs-kicker">Introduction</span><h2>Overview</h2></div>
                <span className="docs-status implemented">Implemented</span>
              </div>
              <p>ShopScript is a mini programming language that turns source code into a visual e-commerce simulation. It is designed to demonstrate programming-language concepts, not to operate as a real online store.</p>
              <div className="docs-callout">
                {Ico.alert(17, "hsl(25 95% 45%)")}
                <div><strong>Educational scope</strong><span>No real accounts, payments, database orders, or production checkout are performed.</span></div>
              </div>
              <div className="docs-feature-grid">
                {[
                  ["Lexer", "Converts source text into positioned tokens."],
                  ["Syntax checker", "Validates the structure of supported statements."],
                  ["Semantic checks", "Validates products, quantities, prices, coupons, objects, and checkout."],
                  ["Executor", "Updates the cart, totals, receipt, variables, and logs."],
                ].map(([title, description]) => <div key={title}><strong>{title}</strong><span>{description}</span></div>)}
              </div>
            </article>
          )}

          {visibleIds.has("quick-start") && (
            <article id="docs-quick-start" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">02</span>
                <div><span className="docs-kicker">Local development</span><h2>Quick start</h2></div>
                <span className="docs-status implemented">Verified</span>
              </div>
              <p>This is a pnpm workspace. Run commands from the repository root and do not use npm to install project dependencies.</p>
              <h3>Windows PowerShell</h3>
              <pre><code>{"pnpm install\n$env:PORT = \"5173\"\n$env:BASE_PATH = \"/\"\npnpm --filter @workspace/shopscript run dev"}</code></pre>
              <p>Open <strong>http://localhost:5173/</strong>. Keep the terminal running while using the website.</p>
              <h3>Verify changes</h3>
              <pre><code>{"pnpm --filter @workspace/shopscript run typecheck\n$env:PORT = \"5173\"\n$env:BASE_PATH = \"/\"\npnpm --filter @workspace/shopscript run build"}</code></pre>
            </article>
          )}

          {visibleIds.has("pipeline") && (
            <article id="docs-pipeline" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">03</span>
                <div><span className="docs-kicker">Processing model</span><h2>Interpreter pipeline</h2></div>
                <span className="docs-status implemented">Implemented</span>
              </div>
              <div className="docs-pipeline">
                {[
                  ["1", "Source", "Code entered in the editor"],
                  ["2", "Lexical", "Tokens with line and column"],
                  ["3", "Syntax", "Statement structure checks"],
                  ["4", "Semantic", "Meaning and business rules"],
                  ["5", "Execution", "Cart and variable updates"],
                  ["6", "Simulation", "Receipt, totals, and logs"],
                ].map(([number, title, detail]) => (
                  <div key={number}><span>{number}</span><strong>{title}</strong><small>{detail}</small></div>
                ))}
              </div>
              <p>Lexical or syntax errors stop execution. Semantic errors are reported separately so users can identify whether a problem is structural or logical.</p>
            </article>
          )}

          {visibleIds.has("syntax") && (
            <article id="docs-syntax" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">04</span>
                <div><span className="docs-kicker">Language reference</span><h2>Current language syntax</h2></div>
                <span className="docs-status implemented">Implemented subset</span>
              </div>
              <p>Each statement ends with a semicolon. Single-line comments begin with <code>//</code>.</p>
              <h3>Variables and literals</h3>
              <pre><code>{'let user = "Ava";\nlet budget = 1200.00;\nlet inStock = true;\nlet cart = [];'}</code></pre>
              <div className="docs-table-wrap">
                <table className="docs-table">
                  <thead><tr><th>Value</th><th>Example</th><th>Current runtime type</th></tr></thead>
                  <tbody>
                    <tr><td>String</td><td><code>"Ava"</code></td><td>string</td></tr>
                    <tr><td>Number</td><td><code>1200.00</code></td><td>number</td></tr>
                    <tr><td>Boolean</td><td><code>true</code></td><td>boolean</td></tr>
                    <tr><td>Empty list</td><td><code>[]</code></td><td>list</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="docs-callout neutral">
                {Ico.table(17, "hsl(220 60% 50%)")}
                <div><strong>Type-system status</strong><span>Explicit int, float, bool, and string declarations are required by the project plan but are not implemented yet.</span></div>
              </div>
            </article>
          )}

          {visibleIds.has("commands") && (
            <article id="docs-commands" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">05</span>
                <div><span className="docs-kicker">Language reference</span><h2>E-commerce commands</h2></div>
                <span className="docs-status implemented">Implemented</span>
              </div>
              <div className="docs-table-wrap">
                <table className="docs-table command-table">
                  <thead><tr><th>Action</th><th>Syntax</th><th>Effect</th></tr></thead>
                  <tbody>
                    <tr><td>Add product</td><td><code>{'add "Smartphone X" 1 @ 599.00;'}</code></td><td>Adds a known product and quantity.</td></tr>
                    <tr><td>Apply coupon</td><td><code>{'apply coupon "SAVE10";'}</code></td><td>Applies a supported discount.</td></tr>
                    <tr><td>Set shipping</td><td><code>set shipping = 40.00;</code></td><td>Sets a non-negative shipping fee.</td></tr>
                    <tr><td>Checkout</td><td><code>checkout;</code></td><td>Completes a non-empty simulated cart.</td></tr>
                  </tbody>
                </table>
              </div>
              <h3>Supported coupons</h3>
              <div className="docs-chip-row"><span>SAVE10 · 10%</span><span>STUDENT10 · 10%</span><span>NONE · 0%</span></div>
              <h3>Inventory</h3>
              <div className="docs-inventory-list">
                {[
                  ["Smartphone X", "$599.00"], ["Wireless Earbuds", "$199.00"], ["Phone Case", "$29.00"],
                  ["Urban Backpack", "$49.00"], ["Laptop", "$999.00"], ["Smart Watch", "$299.00"],
                ].map(([name, price]) => <div key={name}><span>{name}</span><strong>{price}</strong></div>)}
              </div>
            </article>
          )}

          {visibleIds.has("oop") && (
            <article id="docs-oop" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">06</span>
                <div><span className="docs-kicker">Object orientation</span><h2>Current OOP syntax</h2></div>
                <span className="docs-status progress">Partial</span>
              </div>
              <p>ShopScript currently supports classes with default fields, instance creation, field assignment, and adding an instance to the cart when it has name and price fields.</p>
              <pre><code>{'class Product {\n  name = "Unknown";\n  price = 0.00;\n  stock = true;\n}\n\nlet phone = new Product;\nset phone.name = "Pixel 9 Pro";\nset phone.price = 849.00;\nadd phone 1;\ncheckout;'}</code></pre>
              <div className="docs-callout neutral">
                {Ico.dna(17, "hsl(220 60% 50%)")}
                <div><strong>Still planned</strong><span>Typed fields, methods, parameters, this binding, public/private access, and encapsulation checks.</span></div>
              </div>
            </article>
          )}

          {visibleIds.has("analyzer") && (
            <article id="docs-analyzer" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">07</span>
                <div><span className="docs-kicker">Interface reference</span><h2>Analyzer output</h2></div>
                <span className="docs-status implemented">Implemented</span>
              </div>
              <div className="docs-analyzer-grid">
                {[
                  [Ico.code(17), "Tokens", "Token type, value, line, and column."],
                  [Ico.alert(17), "Lexical errors", "Unknown characters and malformed strings."],
                  [Ico.clipboard(17), "Syntax errors", "Unsupported or malformed statements."],
                  [Ico.check(17), "Semantic errors", "Invalid products, values, objects, coupons, and checkout."],
                  [Ico.table(17), "Variables", "Current names, inferred types, and display values."],
                  [Ico.receipt(17), "Output logs", "Execution events, checkout state, and totals."],
                ].map(([icon, title, detail]) => (
                  <div key={String(title)}><span>{icon}</span><strong>{title}</strong><small>{detail}</small></div>
                ))}
              </div>
            </article>
          )}

          {visibleIds.has("status") && (
            <article id="docs-status" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">08</span>
                <div><span className="docs-kicker">Roadmap alignment</span><h2>Current implementation status</h2></div>
                <span className="docs-status progress">In progress</span>
              </div>
              <p>The website is usable, but the complete academic specification is still under development.</p>
              <div className="docs-status-columns">
                <div>
                  <h3>{Ico.check(15)} Available now</h3>
                  <ul>
                    <li>Lexer and token display</li>
                    <li>Current-statement syntax checks</li>
                    <li>E-commerce semantic validation</li>
                    <li>Cart, discount, checkout, and receipt</li>
                    <li>Variables and basic classes/instances</li>
                  </ul>
                </div>
                <div>
                  <h3>{Ico.alert(15, "hsl(25 95% 48%)")} Required next</h3>
                  <ul>
                    <li>Canonical expression grammar and AST</li>
                    <li>Nested scope and declaration rules</li>
                    <li>if/else, for, and while execution</li>
                    <li>Explicit required data types</li>
                    <li>Methods and encapsulation</li>
                    <li>Automated interpreter tests</li>
                  </ul>
                </div>
              </div>
              <div className="docs-next-card">
                <div><span className="page-eyebrow">Next website section</span><strong>Examples</strong><p>Runnable examples will follow this documentation section.</p></div>
                <button className="btn-orange" onClick={() => onNavigate("Examples")}>View Examples status {Ico.chevron(13, "white")}</button>
              </div>
            </article>
          )}
        </div>
      </div>
    </main>
  );
}

function PlannedPage({ page, onNavigate }: { page: Exclude<NavItem, "Home" | "About" | "Docs">; onNavigate: (page: NavItem) => void }) {
  const details = {

    Examples: {
      icon: Ico.code(24, "hsl(25 95% 53%)"),
      title: "Examples are the next implementation step",
      description: "This section will provide runnable valid programs and focused lexical, syntax, semantic, control-flow, data-type, and OOP demonstrations.",
    },
    Playground: {
      icon: Ico.code(24, "hsl(25 95% 53%)"),
      title: "The dedicated playground follows examples",
      description: "The current interpreter remains available on Home. This section will later provide a focused editor and simulation workspace.",
    },
  }[page];

  return (
    <main className="content-page">
      <section className="placeholder-card ss-card" aria-labelledby="planned-page-title">
        <div className="page-icon">{details.icon}</div>
        <span className="page-eyebrow">Planned section</span>
        <h1 id="planned-page-title">{page}</h1>
        <h2>{details.title}</h2>
        <p>{details.description}</p>
        <div className="page-actions">
          <button className="btn-orange" onClick={() => onNavigate("Home")}>{Ico.code(14, "white")} Open current interpreter</button>
          <button className="btn-ghost" onClick={() => onNavigate("About")}>{Ico.users(14)} About the project</button>
        </div>
      </section>
    </main>
  );
}

function AboutPage({ onNavigate }: { onNavigate: (page: NavItem) => void }) {
  const team = [
    { role: "Project Lead", name: "Fitz Tobias" },
    { role: "Lead Developer", name: "Yuan Mariano" },
    { role: "Documentation Lead", name: "Dwayne Mongaya" },
  ];

  return (
    <main className="content-page about-page">
      <section className="about-hero">
        <div>
          <span className="page-eyebrow">About ShopScript</span>
          <h1>A mini programming language with an e-commerce simulation</h1>
          <p>
            ShopScript is a browser-based educational interpreter built for a Programming Languages final project.
            Users write small programs that are tokenized, checked, validated, and executed as visible cart,
            discount, checkout, receipt, variable, and output-log updates.
          </p>
          <div className="page-actions">
            <button className="btn-orange" onClick={() => onNavigate("Home")}>{Ico.play()} Try the interpreter</button>
            <button className="btn-ghost" onClick={() => onNavigate("Docs")}>{Ico.book(14)} Read documentation</button>
          </div>
        </div>
        <div className="about-mark" aria-hidden="true">{Ico.code(44, "white")}<span>v{APP_VERSION}</span></div>
      </section>

      <section className="about-grid">
        <article className="ss-card about-card">
          <div className="about-card-title">{Ico.zap(18, "hsl(25 95% 53%)")} Project purpose</div>
          <p>
            The project demonstrates lexical analysis, syntax analysis, semantic analysis, names and scope,
            data types, control flow, and object-oriented programming through an approachable online-store scenario.
          </p>
        </article>
        <article className="ss-card about-card">
          <div className="about-card-title">{Ico.cart(18, "hsl(25 95% 53%)")} Educational scope</div>
          <p>
            ShopScript simulates store behavior only. It does not process real payments, create customer accounts,
            store production orders, or operate as a commercial e-commerce platform.
          </p>
        </article>
        <article className="ss-card about-card">
          <div className="about-card-title">{Ico.table(18, "hsl(25 95% 53%)")} Interpreter pipeline</div>
          <div className="pipeline-list">
            {["Source code", "Lexical analysis", "Syntax analysis", "Semantic analysis", "Execution", "Visual simulation"].map((step, index) => (
              <div key={step}><span>{index + 1}</span>{step}</div>
            ))}
          </div>
        </article>
      </section>

      <section className="team-section ss-card">
        <div className="section-heading">
          <div className="page-icon small">{Ico.users(20, "hsl(25 95% 53%)")}</div>
          <div><span className="page-eyebrow">Project team</span><h2>Creators</h2></div>
        </div>
        <div className="team-grid">
          {team.map((member) => (
            <article key={member.role} className="team-card">
              <div className="team-avatar">{member.name.split(" ").map(part => part[0]).join("")}</div>
              <div><strong>{member.name}</strong><span>{member.role}</span></div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
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
  const [activeNav, setNav]   = useState<NavItem>("Home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = code.split("\n");

  const runProgram = useCallback(() => { setResult(interpret(code)); setHasRun(true); }, [code]);
  const clearEditor = () => { setCode(""); setResult(null); setHasRun(false); };
  const loadSample = (t: "valid"|"syntax"|"semantic"|"oop") => {
    const m = { valid:SAMPLE_VALID, syntax:SAMPLE_SYNTAX_ERROR, semantic:SAMPLE_SEMANTIC_ERROR, oop:SAMPLE_OOP };
    setCode(m[t]); setResult(null); setHasRun(false);
  };
  const navigate = useCallback((destination: NavItem) => {
    setNav(destination);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const openDocsSearch = useCallback(() => {
    navigate("Docs");
    window.setTimeout(() => document.getElementById("docs-search")?.focus(), 0);
  }, [navigate]);
  const startNewProgram = () => {
    setCode("");
    setResult(null);
    setHasRun(false);
    navigate("Home");
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  useEffect(() => { runProgram(); }, []); // eslint-disable-line
  useEffect(() => {
    const openDocs = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openDocsSearch();
      }
    };
    window.addEventListener("keydown", openDocs);
    return () => window.removeEventListener("keydown", openDocs);
  }, [openDocsSearch]);

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
          <button type="button" className="brand-button" onClick={() => navigate("Home")} aria-label="Open ShopScript home">
            <div style={{ background:"hsl(25 95% 53%)", borderRadius:8, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", color:"white", flexShrink:0 }}>
              {Ico.code(16,"white")}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:"hsl(25 95% 48%)", lineHeight:1.1 }}>ShopScript</div>
              <div style={{ fontSize:9.5, color:"hsl(220 10% 55%)", lineHeight:1 }}>Code. Simulate. Sell.</div>
            </div>
          </button>

          {/* Search — hidden on mobile */}
          <button type="button" className="header-search nav-search" onClick={openDocsSearch} aria-label="Open documentation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(220 10% 55%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span style={{ fontSize:12.5, color:"hsl(220 10% 60%)", flex:1, whiteSpace:"nowrap", overflow:"hidden" }}>Search docs, examples...</span>
            <span style={{ fontSize:10.5, background:"hsl(30 20% 90%)", padding:"1px 5px", borderRadius:3, color:"hsl(220 10% 55%)", flexShrink:0 }}>Ctrl K</span>
          </button>

          {/* Nav — hidden on mobile */}
          <nav className="header-nav" style={{ flex:1 }}>
            {NAV_ITEMS.map((item) => (
              <button type="button" key={item} className={`nav-link${activeNav===item?" active":""}`} onClick={() => navigate(item)} aria-current={activeNav===item ? "page" : undefined}>{item}</button>
            ))}
          </nav>

          {/* Right actions */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginLeft:"auto", flexShrink:0 }}>
            <button type="button" className="btn-orange" style={{ fontSize:12.5, padding:"7px 13px" }} onClick={startNewProgram}>
              New Program {Ico.plus(13,"white")}
            </button>

            <button type="button" className="account-button" onClick={() => navigate("About")} aria-label="Open About ShopScript">
              <span className="account-avatar">
                SS
                <span className="online-dot" />
              </span>
              {Ico.chevron(13,"hsl(220 10% 50%)")}
            </button>

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
            {NAV_ITEMS.map((item) => (
              <button type="button" key={item} className={`nav-link${activeNav===item?" active":""}`} onClick={() => navigate(item)} aria-current={activeNav===item ? "page" : undefined}>{item}</button>
            ))}
          </div>
        )}
      </header>

      {activeNav === "Home" ? (<>
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
          <div className="ss-card editor-card" style={{ overflow:"hidden" }}>
            {/* Top bar — light theme */}
            <div style={{ background:"white", padding:"10px 12px 0", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap", borderBottom:"1px solid hsl(30 20% 90%)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ display:"flex", color:"hsl(25 95% 53%)" }}>{Ico.code(15,"hsl(25 95% 53%)")}</span>
                <span style={{ fontSize:13, fontWeight:700, color:"hsl(220 20% 18%)" }}>ShopScript Editor</span>
              </div>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", paddingBottom:10 }}>
                <button className="btn-orange" style={{ padding:"5px 12px", fontSize:12, gap:5 }} onClick={runProgram}>
                  {Ico.play()} Run Program
                </button>
                <button className="btn-ghost" style={{ padding:"5px 10px", fontSize:12 }} onClick={clearEditor}>
                  {Ico.x(10,"hsl(220 10% 50%)")} Clear
                </button>
                <select
                  onChange={(e) => { loadSample(e.target.value as "valid"|"syntax"|"semantic"|"oop"); e.target.value=""; }}
                  defaultValue=""
                  style={{ background:"white", border:"1px solid hsl(30 20% 88%)", color:"hsl(220 20% 35%)", borderRadius:8, padding:"5px 9px", fontSize:12, cursor:"pointer" }}
                >
                  <option value="" disabled>Load Sample</option>
                  <option value="valid">Valid Sample</option>
                  <option value="syntax">Syntax Error</option>
                  <option value="semantic">Semantic Error</option>
                  <option value="oop">OOP Demo</option>
                </select>
              </div>
            </div>
            {/* File tab — light theme */}
            <div style={{ background:"hsl(30 20% 97%)", padding:"0 12px", borderBottom:"1px solid hsl(30 20% 90%)" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"white", color:"hsl(25 95% 53%)", fontFamily:"var(--app-font-mono)", fontSize:12, padding:"6px 14px 0", borderRadius:"6px 6px 0 0", border:"1px solid hsl(30 20% 90%)", borderBottom:"2px solid hsl(25 95% 53%)" }}>
                main.shop
                <span style={{ background:"hsl(30 20% 90%)", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>{Ico.plus(9,"hsl(220 10% 50%)")}</span>
              </div>
            </div>
            {/* Code area — light theme */}
            <div className="editor-body" style={{ background:"white" }}>
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
              <span>ShopScript v{APP_VERSION}</span>
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
                            className="product-img-thumb"
                            onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/200x80/f0f0f0/999?text=${encodeURIComponent(p.name)}`; }}
                          />
                          {inCart && (
                            <span style={{ position:"absolute", top:4, right:4, background:"hsl(25 95% 53%)", color:"white", fontSize:9, fontWeight:700, borderRadius:999, padding:"1px 5px", boxShadow:"0 1px 4px hsl(0 0% 0% / 0.2)" }}>
                              {inCart.quantity}
                            </span>
                          )}
                        </div>
                        <div style={{ padding:"6px 6px 8px", textAlign:"center" }}>
                          <div style={{ fontSize:10.5, fontWeight:600, color:"hsl(220 20% 20%)", marginBottom:2, lineHeight:1.2 }}>{p.name}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:"hsl(25 95% 53%)", marginBottom:2 }}>${p.price.toFixed(2)}</div>
                          <div style={{ fontSize:9.5, color:"#16a34a", display:"flex", alignItems:"center", gap:3, justifyContent:"center" }}>
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
      </>) : activeNav === "Docs" ? (
        <DocsPage onNavigate={navigate} />
      ) : activeNav === "About" ? (
        <AboutPage onNavigate={navigate} />
      ) : (
        <PlannedPage page={activeNav} onNavigate={navigate} />
      )}

      {/* ━━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer style={{ background:"white", borderTop:"1px solid hsl(30 20% 90%)" }}>
        <div className="footer-inner" style={{ maxWidth:1280, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, color:"hsl(220 10% 55%)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:"hsl(25 95% 53%)", fontWeight:700 }}>ShopScript</span>
            <span>—</span>
            <span>Programming Languages Final Project · v{APP_VERSION}</span>
          </div>
          <div className="footer-right" style={{ display:"flex", gap:20 }}>
            {[
              { icon:Ico.sun(13,"hsl(45 90% 50%)"), label:"Light & Clean" },
              { icon:Ico.heart(13,"hsl(340 75% 55%)"), label:"Friendly" },
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
