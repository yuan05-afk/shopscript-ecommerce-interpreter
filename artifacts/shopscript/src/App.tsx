import { useState, useRef, useCallback, useEffect } from "react";
import {
  interpret,
  INVENTORY,
  type InterpreterResult,
  type Token,
  type ClassDefinition,
  type ObjectInstance,
} from "./shopscript-interpreter";
import { EditorThemeToggle, ShopScriptCodeEditor, type EditorTheme } from "./components/shopscript-code-editor";
import { InventoryPage } from "./components/inventory-page";
import { NotificationCenter, type AppNotification, type NotificationType } from "./components/notification-center";
import { DEFAULT_PRODUCTS, INVENTORY_STORAGE_KEY, loadInventory, type InventoryProduct } from "./inventory-data";
import { downloadReceiptPdf } from "./receipt-pdf";

// â”€â”€â”€ Sample programs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

const SAMPLE_PRICE_OVERRIDE = `// Manual Price Override Sample
let user = "Ava";
let cart = [];

// Use override only when the sale price is intentional.
add "Smartphone X" 1 @ 200.00 override;
add "Wireless Earbuds" 1 @ 199.00;

apply coupon "SAVE10";
set shipping = 40.00;

checkout;`;
const SAMPLE_LANGUAGE_FEATURES = `// Types, Scope, and Control Flow
string user = "Ava";
let cart = [];
int qty = 0;
float unitPrice = 29.00;
bool ready = true;

while (qty < 2) {
  qty = qty + 1;
}

if (ready && qty == 2) {
  add "Phone Case" qty @ unitPrice;
}

checkout;`;

const SAMPLE_OOP_METHODS = `// Methods and Encapsulation
let cart = [];

class Product {
  public string name = "Phone Case";
  public float price = 29.00;
  private float cost = 10.00;

  public method discount(float rate) {
    set this.price = this.price * rate;
  }
}

let item = new Product;
item.discount(0.5);

for (int i = 0; i < 2; i = i + 1) {
  add item 1;
}

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

type ExampleCategory = "Starter" | "E-commerce" | "Language" | "Errors" | "OOP";

interface ShopScriptExample {
  id: string;
  title: string;
  category: ExampleCategory;
  summary: string;
  code: string;
  concepts: string[];
  expected: string;
  isError?: boolean;
}

const EXAMPLE_LIBRARY: ShopScriptExample[] = [
  {
    id: "variables",
    title: "Variables and literals",
    category: "Starter",
    summary: "Declare the value types currently recognized by ShopScript.",
    code: [
      "// Variables and Literals",
      'let user = "Mika";',
      "let budget = 1500.00;",
      "let inStock = true;",
      "let cart = [];",
    ].join("\n"),
    concepts: ["let", "string", "number", "boolean", "list"],
    expected: "Four entries appear in the Variable Table with inferred runtime types.",
  },
  {
    id: "basic-cart",
    title: "Basic shopping cart",
    category: "E-commerce",
    summary: "Add known inventory products and complete a simple checkout.",
    code: [
      "// Basic Shopping Cart",
      'let user = "Noah";',
      "let cart = [];",
      "",
      'add "Urban Backpack" 1 @ 49.00;',
      'add "Phone Case" 2 @ 29.00;',
      "",
      "checkout;",
    ].join("\n"),
    concepts: ["inventory", "quantity", "cart", "checkout"],
    expected: "The cart contains three items and checkout completes with a $107.00 total.",
  },
  {
    id: "discount-checkout",
    title: "Discounted checkout",
    category: "E-commerce",
    summary: "Run the complete cart, coupon, shipping, and receipt flow.",
    code: SAMPLE_VALID,
    concepts: ["cart", "coupon", "shipping", "receipt"],
    expected: "SAVE10 applies 10% off before shipping and produces a completed receipt.",
  },
  {
    id: "price-override",
    title: "Manual sale price override",
    category: "E-commerce",
    summary: "Use the override keyword when a script intentionally uses a sale/manual price instead of the catalog price.",
    code: SAMPLE_PRICE_OVERRIDE,
    concepts: ["inventory", "price", "override", "semantic"],
    expected: "The Smartphone X is accepted at $200.00 because the add command explicitly ends with override.",
  },
  {
    id: "typed-control-flow",
    title: "Types, scope, and control flow",
    category: "Language",
    summary: "Use explicit types, a while loop, an if block, boolean logic, and expression-based add commands.",
    code: SAMPLE_LANGUAGE_FEATURES,
    concepts: ["int", "float", "bool", "scope", "while", "if"],
    expected: "qty is updated by the loop, the if block adds two Phone Case units, and checkout totals $58.00.",
  },
  {
    id: "methods-encapsulation",
    title: "Methods and encapsulation",
    category: "OOP",
    summary: "Define public/private fields, execute a public method, and add the object inside a for loop.",
    code: SAMPLE_OOP_METHODS,
    concepts: ["public", "private", "method", "this", "for"],
    expected: "The method discounts the public price to $14.50, then the for loop adds two units.",
  },
  {
    id: "syntax-debugging",
    title: "Syntax-error debugging",
    category: "Errors",
    summary: "Inspect missing semicolons, unquoted values, and malformed commands.",
    code: SAMPLE_SYNTAX_ERROR,
    concepts: ["syntax", "semicolons", "strings", "error lines"],
    expected: "Execution stops and the Syntax Errors panel identifies malformed statements.",
    isError: true,
  },
  {
    id: "semantic-validation",
    title: "Semantic validation",
    category: "Errors",
    summary: "See logical validation for inventory, quantity, and coupon rules.",
    code: SAMPLE_SEMANTIC_ERROR,
    concepts: ["semantic", "inventory", "quantity", "coupon"],
    expected: "The Semantic Errors panel reports an unknown product, zero quantity, and invalid coupon.",
    isError: true,
  },
  {
    id: "oop-products",
    title: "Custom products with OOP",
    category: "OOP",
    summary: "Define classes, create instances, assign fields, and add objects to the cart.",
    code: SAMPLE_OOP,
    concepts: ["class", "new", "fields", "instances"],
    expected: "Class and instance cards appear, then both custom products are added and checked out.",
  },
];
// â”€â”€â”€ Fallback images for OOP / custom products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const OOP_IMG = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop&auto=format";
const OOP_IMG_SM = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&h=60&fit=crop&auto=format";

function getProductImg(name: string, products: InventoryProduct[], small = false): string {
  const p = products.find(p => p.name === name);
  if (p) return small ? p.imgSm : p.img;
  return small ? OOP_IMG_SM : OOP_IMG;
}

// â”€â”€â”€ Token chip class map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function tokenClass(type: string) {
  const m: Record<string, string> = {
    keyword:"keyword", string:"string", number:"number", operator:"operator",
    at:"at", semicolon:"semicolon", identifier:"identifier", boolean:"boolean",
    assign:"assign", symbol:"symbol", lbracket:"lbracket", rbracket:"rbracket",
    lbrace:"symbol", rbrace:"symbol", dot:"operator",
  };
  return m[type] ?? "identifier";
}

// â”€â”€â”€ App metadata and navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const APP_VERSION = "0.3.0";
const NAV_ITEMS = ["Home", "Docs", "Examples", "Playground", "Inventory", "About"] as const;
type NavItem = typeof NAV_ITEMS[number];

// â”€â”€â”€ SVG Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    { id: "editor", title: "Mini IDE", keywords: "editor syntax highlighting light dark theme tab keyboard ctrl enter" },
    { id: "commands", title: "E-commerce commands", keywords: "add coupon shipping checkout inventory cart price override sale" },
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
                <div><strong>Type-system status</strong><span>Explicit int, float, bool, and string declarations are implemented in the structured runtime and shown in the variable table.</span></div>
              </div>
            </article>
          )}


          {visibleIds.has("editor") && (
            <article id="docs-editor" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">05</span>
                <div><span className="docs-kicker">Interface reference</span><h2>Syntax-highlighted mini IDE</h2></div>
                <span className="docs-status implemented">Implemented</span>
              </div>
              <p>Home and Playground use the same ShopScript editor, code state, and display theme. The default theme is Light; use the toolbar toggle to switch both editors to Dark.</p>
              <div className="docs-feature-grid">
                <div><strong>Syntax colors</strong><span>Keywords, strings, numbers, booleans, operators, punctuation, identifiers, and comments are visually distinguished.</span></div>
                <div><strong>Line numbers</strong><span>The gutter stays synchronized while the source code scrolls.</span></div>
                <div><strong>Tab key</strong><span>Inserts two spaces at the current cursor position.</span></div>
                <div><strong>Run shortcut</strong><span>Press Ctrl+Enter on Windows/Linux or Command+Enter on macOS.</span></div>
              </div>
              <div className="docs-callout">
                {Ico.alert(17, "hsl(25 95% 45%)")}
                <div><strong>Immediate feedback</strong><span>Runs and interface actions show popup notifications. Error lines are marked in the editor, and the first diagnostic appears directly below it. Full lexical, syntax, and semantic details remain available in the analyzer panels.</span></div>
              </div>
            </article>
          )}
          {visibleIds.has("commands") && (
            <article id="docs-commands" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">06</span>
                <div><span className="docs-kicker">Language reference</span><h2>E-commerce commands</h2></div>
                <span className="docs-status implemented">Implemented</span>
              </div>
              <div className="docs-table-wrap">
                <table className="docs-table command-table">
                  <thead><tr><th>Action</th><th>Syntax</th><th>Effect</th></tr></thead>
                  <tbody>
                    <tr><td>Add product</td><td><code>{'add "Smartphone X" 1 @ 599.00;'}</code></td><td>Adds a known product and quantity.</td></tr>
                    <tr><td>Override price</td><td><code>{'add "Smartphone X" 1 @ 200.00 override;'}</code></td><td>Uses an intentional manual or sale price.</td></tr>
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
              <div className="docs-callout neutral">
                {Ico.cart(17, "hsl(220 60% 50%)")}
                <div><strong>Interactive Home controls</strong><span>Clicking a product, changing its quantity, or removing it updates the matching add statement in the editor and runs the source again. Stock limits and manual price overrides are validated by the interpreter.</span></div>
              </div>
            </article>
          )}

          {visibleIds.has("oop") && (
            <article id="docs-oop" className="docs-section ss-card">
              <div className="docs-section-heading">
                <span className="docs-step">07</span>
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
                <span className="docs-step">08</span>
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
                <span className="docs-step">09</span>
                <div><span className="docs-kicker">Roadmap alignment</span><h2>Current implementation status</h2></div>
                <span className="docs-status progress">In progress</span>
              </div>
              <p>The website now demonstrates the main academic language requirements. Remaining work is mostly polish, final documentation, and broader test coverage.</p>
              <div className="docs-status-columns">
                <div>
                  <h3>{Ico.check(15)} Available now</h3>
                  <ul>
                    <li>Lexer and token display</li>
                    <li>Current-statement syntax checks</li>
                    <li>E-commerce semantic validation</li>
                    <li>Cart, discount, checkout, and receipt</li>
                    <li>Variables and basic classes/instances</li>
                    <li>Shared syntax-highlighted Light/Dark editor</li>
                    <li>Script-backed inventory and cart controls</li>
                    <li>Expression grammar, nested scopes, if/else, while, and for</li>
                    <li>Explicit int, float, bool, and string declarations</li>
                    <li>Public/private fields and public method execution</li>
                    <li>Automated interpreter tests</li>
                  </ul>
                </div>
                <div>
                  <h3>{Ico.alert(15, "hsl(25 95% 48%)")} Remaining polish</h3>
                  <ul>
                    <li>Formal AST and scope visualization in the analyzer</li>
                    <li>More edge-case tests for invalid expressions and loops</li>
                    <li>Final language-spec documentation before submission</li>
                  </ul>
                </div>
              </div>
              <div className="docs-next-card">
                <div><span className="page-eyebrow">Next project milestone</span><strong>Final language documentation</strong><p>The main required runtime features are implemented. The next roadmap work is documenting the final grammar and expanding edge-case tests.</p></div>
                <button className="btn-orange" onClick={() => onNavigate("Playground")}>Open Playground {Ico.chevron(13, "white")}</button>
              </div>
            </article>
          )}
        </div>
      </div>
    </main>
  );
}


function ExamplesPage({ onOpenExample, onNavigate }: { onOpenExample: (code: string) => void; onNavigate: (page: NavItem) => void }) {
  const [filter, setFilter] = useState<"All" | ExampleCategory>("All");
  const [query, setQuery] = useState("");
  const filters: Array<"All" | ExampleCategory> = ["All", "Starter", "E-commerce", "Language", "Errors", "OOP"];
  const normalizedQuery = query.trim().toLowerCase();
  const visibleExamples = EXAMPLE_LIBRARY.filter(example => {
    const matchesFilter = filter === "All" || example.category === filter;
    const searchText = [example.title, example.summary, example.category, ...example.concepts].join(" ").toLowerCase();
    return matchesFilter && (!normalizedQuery || searchText.includes(normalizedQuery));
  });

  return (
    <main className="examples-page">
      <section className="examples-hero">
        <div>
          <span className="page-eyebrow">Runnable ShopScript programs</span>
          <h1>Examples</h1>
          <p>Explore programs that demonstrate the interpreter as it works today. Open any example to load it into Home and immediately inspect its tokens, validation, simulation, and logs.</p>
        </div>
        <div className="examples-count"><strong>{EXAMPLE_LIBRARY.length}</strong><span>working examples</span></div>
      </section>

      <section className="examples-toolbar" aria-label="Filter examples">
        <div className="example-filters">
          {filters.map(item => (
            <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
              {item}
              <span>{item === "All" ? EXAMPLE_LIBRARY.length : EXAMPLE_LIBRARY.filter(example => example.category === item).length}</span>
            </button>
          ))}
        </div>
        <div className="examples-search-wrap">
          {Ico.code(15, "hsl(25 95% 53%)")}
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search examples..." aria-label="Search examples" />
          {query && <button onClick={() => setQuery("")} aria-label="Clear examples search">{Ico.x(11)}</button>}
        </div>
      </section>

      <div className="examples-result-line">
        <span>Showing {visibleExamples.length} of {EXAMPLE_LIBRARY.length}</span>
        <span>All examples match ShopScript v{APP_VERSION}</span>
      </div>

      {visibleExamples.length > 0 ? (
        <section className="examples-grid">
          {visibleExamples.map((example, index) => (
            <article key={example.id} className="example-card ss-card">
              <div className="example-card-top">
                <div className="example-number">{String(index + 1).padStart(2, "0")}</div>
                <div className="example-badges">
                  <span className={"example-category " + example.category.toLowerCase().replace("-", "")}>{example.category}</span>
                  <span className={"example-result " + (example.isError ? "error" : "valid")}>{example.isError ? "Intentional errors" : "Valid program"}</span>
                </div>
              </div>
              <h2>{example.title}</h2>
              <p className="example-summary">{example.summary}</p>
              <pre className="example-code"><code>{example.code}</code></pre>
              <div className="example-concepts">
                {example.concepts.map(concept => <span key={concept}>{concept}</span>)}
              </div>
              <div className="example-expected">
                <span>{example.isError ? Ico.alert(15, "hsl(0 72% 48%)") : Ico.check(15)}</span>
                <div><strong>Expected behavior</strong><p>{example.expected}</p></div>
              </div>
              <button className="btn-orange example-open" onClick={() => onOpenExample(example.code)}>
                {Ico.play()} Open and run in interpreter
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="examples-empty ss-card">
          <div className="page-icon">{Ico.code(22, "hsl(25 95% 53%)")}</div>
          <h2>No matching examples</h2>
          <p>Change the category or clear your search.</p>
          <button className="btn-ghost" onClick={() => { setFilter("All"); setQuery(""); }}>Reset filters</button>
        </section>
      )}

      <section className="examples-next">
        <div>
          <span className="page-eyebrow">Next website section</span>
          <h2>Dedicated Playground</h2>
          <p>The next step separates the focused coding experience from the Home dashboard.</p>
        </div>
        <button className="btn-orange" onClick={() => onNavigate("Playground")}>View Playground status {Ico.chevron(13, "white")}</button>
      </section>
    </main>
  );
}


type PlaygroundTab = "Output" | "Tokens" | "Errors" | "Variables";

interface PlaygroundPageProps {
  code: string;
  result: InterpreterResult | null;
  hasRun: boolean;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onClear: () => void;
  onLoadExample: (code: string) => void;
  onNavigate: (page: NavItem) => void;
  theme: EditorTheme;
  onToggleTheme: () => void;
}

function PlaygroundPage({ code, result, hasRun, onCodeChange, onRun, onClear, onLoadExample, onNavigate, theme, onToggleTheme }: PlaygroundPageProps) {
  const [activeTab, setActiveTab] = useState<PlaygroundTab>("Output");
  const lines = code.split("\n");
  const totalErrors = (result?.lexErrors.length ?? 0) + (result?.syntaxErrors.length ?? 0) + (result?.semanticErrors.length ?? 0);
  const errorGroups: Array<{ label: string; items: Array<{ message: string; line: number }> }> = [
    { label: "Lexical", items: result?.lexErrors ?? [] },
    { label: "Syntax", items: result?.syntaxErrors ?? [] },
    { label: "Semantic", items: result?.semanticErrors ?? [] },
  ];
  const playgroundErrors = errorGroups.flatMap(group => group.items.map(error => ({ ...error, category: group.label })));
  const playgroundErrorLines = [...new Set(playgroundErrors.map(error => error.line))];
  const primaryPlaygroundError = playgroundErrors[0];
  const tabs: Array<{ name: PlaygroundTab; count?: number }> = [
    { name: "Output", count: result?.logs.length },
    { name: "Tokens", count: result?.tokens.length },
    { name: "Errors", count: totalErrors },
    { name: "Variables", count: result?.variables.length },
  ];

  return (
    <main className="playground-page">
      <section className="playground-hero">
        <div>
          <span className="page-eyebrow">Focused coding workspace</span>
          <h1>Playground</h1>
          <p>Write and run ShopScript while inspecting execution results without the full storefront dashboard.</p>
        </div>
        <div className="playground-hero-actions">
          <button className="btn-ghost" onClick={() => onNavigate("Home")}>{Ico.cart(14)} Open Home dashboard</button>
          <button className="btn-orange" onClick={() => { onRun(); setActiveTab("Output"); }}>{Ico.play()} Run program</button>
        </div>
      </section>

      <section className="playground-status-strip">
        <div><span className={"playground-dot " + (!hasRun ? "idle" : totalErrors > 0 ? "error" : "success")} /><strong>{!hasRun ? "Ready to run" : totalErrors > 0 ? "Needs attention" : "Execution successful"}</strong></div>
        <div><span>Lines</span><strong>{lines.length}</strong></div>
        <div><span>Tokens</span><strong>{result?.tokens.length ?? 0}</strong></div>
        <div><span>Errors</span><strong>{totalErrors}</strong></div>
        <div><span>Total</span><strong>{"$"}{(result?.total ?? 0).toFixed(2)}</strong></div>
      </section>

      <div className="playground-layout">
        <section className="playground-editor ss-card">
          <div className="playground-panel-bar">
            <div className="playground-panel-title">{Ico.code(16, "hsl(25 95% 53%)")}<div><strong>main.shop</strong><span>ShopScript source</span></div></div>
            <div className="playground-editor-actions">
              <select
                defaultValue=""
                onChange={event => {
                  const example = EXAMPLE_LIBRARY.find(item => item.id === event.target.value);
                  if (example) onLoadExample(example.code);
                  event.target.value = "";
                }}
                aria-label="Load a ShopScript example"
              >
                <option value="" disabled>Load example</option>
                {EXAMPLE_LIBRARY.map(example => <option key={example.id} value={example.id}>{example.title}</option>)}
              </select>
              <EditorThemeToggle theme={theme} onToggle={onToggleTheme} />
              <button className="btn-ghost" onClick={onClear}>{Ico.x(11)} Clear</button>
              <button className="btn-orange" onClick={() => { onRun(); setActiveTab("Output"); }}>{Ico.play()} Run</button>
            </div>
          </div>
          <ShopScriptCodeEditor
            code={code}
            onCodeChange={onCodeChange}
            onRun={() => { onRun(); setActiveTab("Output"); }}
            theme={theme}
            className="playground-ide"
            ariaLabel="ShopScript playground editor"
            errorLines={hasRun ? playgroundErrorLines : []}
          />
          {hasRun && primaryPlaygroundError && (
            <div className="editor-diagnostic playground-diagnostic" role="alert">
              <strong>{primaryPlaygroundError.category} error · Line {primaryPlaygroundError.line}</strong>
              <span>{primaryPlaygroundError.message}{playgroundErrors.length > 1 ? " · " + (playgroundErrors.length - 1) + " more error(s) below" : ""}</span>
            </div>
          )}
          <div className="playground-editor-footer">
            <span className={!hasRun ? "idle" : totalErrors > 0 ? "error" : "success"}>{!hasRun ? "Ready" : totalErrors > 0 ? "Error" : "Ready"}</span>
            <span>Lines {lines.length}, Col 1</span>
            <span>ShopScript v{APP_VERSION}</span>
          </div>
        </section>

        <section className="playground-results ss-card">
          <div className="playground-tabs" role="tablist" aria-label="Playground results">
            {tabs.map(tab => (
              <button
                key={tab.name}
                role="tab"
                aria-selected={activeTab === tab.name}
                className={activeTab === tab.name ? "active" : ""}
                onClick={() => setActiveTab(tab.name)}
              >
                {tab.name}
                {tab.count !== undefined && <span>{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="playground-tab-content">
            {activeTab === "Output" && (
              <div className="playground-output">
                {!hasRun || !result ? (
                  <div className="playground-empty">
                    <div className="page-icon">{Ico.play()}</div>
                    <h2>Run your program</h2>
                    <p>Execution logs, cart state, and totals will appear here.</p>
                  </div>
                ) : (
                  <>
                    <div className="playground-output-summary">
                      <div><span>Cart items</span><strong>{result.cart.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
                      <div><span>Subtotal</span><strong>{"$"}{result.subtotal.toFixed(2)}</strong></div>
                      <div><span>Discount</span><strong>{(result.discount * 100).toFixed(0)}%</strong></div>
                      <div><span>Total</span><strong>{"$"}{result.total.toFixed(2)}</strong></div>
                    </div>
                    {result.cart.length > 0 && (
                      <div className="playground-cart-list">
                        <h3>Cart</h3>
                        {result.cart.map(item => (
                          <div key={item.name}><span>{item.name}<small> × {item.quantity}</small></span><strong>{"$"}{(item.price * item.quantity).toFixed(2)}</strong></div>
                        ))}
                      </div>
                    )}
                    <div className="playground-log-list">
                      <h3>Execution log</h3>
                      {result.logs.map((log, index) => <div key={index}><span className="log-dot" /><code>{log}</code></div>)}
                    </div>
                    {result.didCheckout && totalErrors === 0 && (
                      <div className="playground-success">{Ico.check(18)}<div><strong>Checkout completed</strong><span>Final simulated total: {"$"}{result.total.toFixed(2)}</span></div></div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "Tokens" && (
              <div className="playground-token-panel">
                {!result?.tokens.length ? <div className="playground-empty"><h2>No tokens yet</h2><p>Run a program to inspect lexical output.</p></div> : (
                  <>
                    <div className="playground-panel-note">Token type, lexeme, and source position</div>
                    <div className="playground-token-list">
                      {result.tokens.map((token, index) => (
                        <div key={index}><span className={"token-chip " + tokenClass(token.type)}>{token.value || token.type}</span><small>{token.type} · L{token.line}:C{token.col}</small></div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "Errors" && (
              <div className="playground-error-panel">
                {!hasRun ? <div className="playground-empty"><h2>No analysis yet</h2><p>Run a program to check lexical, syntax, and semantic errors.</p></div> : totalErrors === 0 ? (
                  <div className="playground-no-errors">{Ico.check(22)}<strong>No errors found</strong><span>The program passed all currently implemented checks.</span></div>
                ) : (
                  errorGroups.map(group => group.items.length > 0 && (
                    <section key={group.label}>
                      <h3>{group.label} errors <span>{group.items.length}</span></h3>
                      {group.items.map((error, index) => <div className="playground-error-row" key={index}>{Ico.alert(14)}<div><strong>Line {error.line}</strong><span>{error.message}</span></div></div>)}
                    </section>
                  ))
                )}
              </div>
            )}

            {activeTab === "Variables" && (
              <div className="playground-variable-panel">
                {!result?.variables.length ? <div className="playground-empty"><h2>No variables yet</h2><p>Declare values and run the program to populate the table.</p></div> : (
                  <>
                    <table className="docs-table">
                      <thead><tr><th>Name</th><th>Type</th><th>Value</th></tr></thead>
                      <tbody>{result.variables.map(variable => <tr key={variable.name}><td><code>{variable.name}</code></td><td>{variable.type}</td><td>{variable.value}</td></tr>)}</tbody>
                    </table>
                    {(result.classes.length > 0 || Object.keys(result.instances).length > 0) && (
                      <div className="playground-oop-summary">
                        <h3>OOP state</h3>
                        <span>{result.classes.length} classes</span><span>{Object.keys(result.instances).length} instances</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
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
// â”€â”€â”€ OOP sub-cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Main App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  const [code, setCode]       = useState(SAMPLE_VALID);
  const [result, setResult]   = useState<InterpreterResult | null>(null);
  const [hasRun, setHasRun]   = useState(false);
  const [activeNav, setNav]   = useState<NavItem>("Home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [editorTheme, setEditorTheme] = useState<EditorTheme>("light");
  const [showAllInventory, setShowAllInventory] = useState(false);
  const [products, setProducts] = useState<InventoryProduct[]>(loadInventory);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notificationIdRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = code.split("\n");

  const dismissNotification = useCallback((id: number) => {
    setNotifications(current => current.filter(notice => notice.id !== id));
  }, []);
  const pushNotification = useCallback((type: NotificationType, title: string, message: string) => {
    notificationIdRef.current += 1;
    const notice = { id: notificationIdRef.current, type, title, message };
    setNotifications(current => [...current.slice(-3), notice]);
  }, []);
  const notifyInterpreterResult = useCallback((nextResult: InterpreterResult, successTitle = "Program executed", successMessage = "The ShopScript program completed without errors.") => {
    const groups = [
      { category: "Lexical", errors: nextResult.lexErrors },
      { category: "Syntax", errors: nextResult.syntaxErrors },
      { category: "Semantic", errors: nextResult.semanticErrors },
    ];
    const firstGroup = groups.find(group => group.errors.length > 0);
    if (firstGroup) {
      const first = firstGroup.errors[0];
      const total = groups.reduce((sum, group) => sum + group.errors.length, 0);
      const remaining = total > 1 ? " " + (total - 1) + " more error(s) are listed below the editor." : "";
      pushNotification("error", firstGroup.category + " error", "Line " + first.line + ": " + first.message + remaining);
      return;
    }
    if (nextResult.didCheckout) pushNotification("success", "Checkout completed", "The simulated order was validated and the receipt is ready.");
    else pushNotification("success", successTitle, successMessage);
  }, [pushNotification]);

  const runProgram = useCallback(() => {
    const nextResult = interpret(code, products);
    setResult(nextResult);
    setHasRun(true);
    notifyInterpreterResult(nextResult);
  }, [code, products, notifyInterpreterResult]);
  const executeCode = useCallback((nextCode: string, successTitle = "Cart updated", successMessage = "The source and simulation are synchronized.") => {
    const nextResult = interpret(nextCode, products);
    setCode(nextCode);
    setResult(nextResult);
    setHasRun(true);
    notifyInterpreterResult(nextResult, successTitle, successMessage);
  }, [products, notifyInterpreterResult]);
  const toggleEditorTheme = useCallback(() => {
    setEditorTheme(current => current === "light" ? "dark" : "light");
  }, [products]);
  const clearEditor = () => { setCode(""); setResult(null); setHasRun(false); pushNotification("info", "Editor cleared", "Start a new ShopScript program or load a sample."); };
  const loadSample = (t: "valid"|"syntax"|"semantic"|"oop") => {
    const m = { valid:SAMPLE_VALID, syntax:SAMPLE_SYNTAX_ERROR, semantic:SAMPLE_SEMANTIC_ERROR, oop:SAMPLE_OOP };
    setCode(m[t]); setResult(null); setHasRun(false); pushNotification("info", "Sample loaded", "Run the program to validate and simulate this sample.");
  };
  const navigate = useCallback((destination: NavItem) => {
    setNav(destination);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [products]);
  const openDocsSearch = useCallback(() => {
    navigate("Docs");
    window.setTimeout(() => document.getElementById("docs-search")?.focus(), 0);
  }, [navigate, products]);
  const openExample = useCallback((exampleCode: string) => {
    const nextResult = interpret(exampleCode, products);
    setCode(exampleCode);
    setResult(nextResult);
    setHasRun(true);
    notifyInterpreterResult(nextResult, "Example loaded", "The example is open and its simulation is ready.");
    navigate("Home");
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }, [navigate, products, notifyInterpreterResult]);
  const updatePlaygroundCode = useCallback((nextCode: string) => {
    setCode(nextCode);
    setResult(null);
    setHasRun(false);
  }, [products]);
  const loadExampleInPlayground = useCallback((exampleCode: string) => {
    setCode(exampleCode);
    setResult(null);
    setHasRun(false);
    navigate("Playground");
  }, [navigate, products]);
  const startNewProgram = () => {
    setCode("");
    setResult(null);
    setHasRun(false);
    pushNotification("info", "New program", "The editor is ready for a new ShopScript program.");
    navigate("Home");
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  useEffect(() => {
    setResult(interpret(SAMPLE_VALID, products));
    setHasRun(true);
  }, []); // eslint-disable-line
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

  useEffect(() => {
    try {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(products));
    } catch {
      pushNotification("warning", "Inventory not persisted", "The browser could not save inventory changes locally.");
    }
  }, [products, pushNotification]);

  const saveInventoryProduct = useCallback((product: InventoryProduct) => {
    const isEditing = products.some(item => item.id === product.id);
    setProducts(current => isEditing
      ? current.map(item => item.id === product.id ? product : item)
      : [...current, product]);
    pushNotification("success", isEditing ? "Product updated" : "Product created", product.name + " is now synchronized with Home and ShopScript validation.");
  }, [products, pushNotification]);
  const deleteInventoryProduct = useCallback((id: string) => {
    const product = products.find(item => item.id === id);
    setProducts(current => current.filter(item => item.id !== id));
    pushNotification("success", "Product deleted", (product?.name ?? "The product") + " was removed from the shared catalog.");
  }, [products, pushNotification]);
  const resetInventory = useCallback(() => {
    if (window.confirm("Reset the inventory to the six default products?")) {
      setProducts(DEFAULT_PRODUCTS);
      pushNotification("success", "Inventory reset", "The six default ShopScript products were restored.");
    }
  }, [pushNotification]);

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
  const interpreterErrors = [
    ...(result?.lexErrors ?? []).map(error => ({ ...error, category: "Lexical" })),
    ...(result?.syntaxErrors ?? []).map(error => ({ ...error, category: "Syntax" })),
    ...(result?.semanticErrors ?? []).map(error => ({ ...error, category: "Semantic" })),
  ];
  const errorLines = [...new Set(interpreterErrors.map(error => error.line))];
  const primaryError = interpreterErrors[0];
  const availableProducts = products.filter(product => product.inStock && product.stock > 0);
  const visibleProducts = showAllInventory ? availableProducts : availableProducts.slice(0, 4);

  const setCartItemQuantity = useCallback((productName: string, nextQuantity: number, price: number) => {
    const inventoryProduct = products.find(product => product.name === productName);
    const instanceEntry = Object.entries(instances).find(([, instance]) => instance.fields["name"]?.value === productName);
    const instanceName = instanceEntry?.[0];

    if (!inventoryProduct && !instanceName) {
      pushNotification("error", "Item not registered", productName + " is not present in the shared inventory.");
      return;
    }
    if (inventoryProduct && (!inventoryProduct.inStock || inventoryProduct.stock === 0)) {
      pushNotification("warning", "Product unavailable", productName + " is inactive or out of stock.");
      return;
    }
    if (inventoryProduct && nextQuantity > inventoryProduct.stock) {
      pushNotification("error", "Stock limit exceeded", productName + " has only " + inventoryProduct.stock + " unit(s) available. The cart was not changed.");
      return;
    }

    const isTargetLine = (line: string) => {
      const trimmed = line.trim();
      return inventoryProduct
        ? trimmed.startsWith('add "' + productName + '" ')
        : trimmed.startsWith("add " + instanceName + " ");
    };

    const sourceLines = code.split("\n");
    const firstTargetIndex = sourceLines.findIndex(isTargetLine);
    const nextLines = sourceLines.filter(line => !isTargetLine(line));

    if (nextQuantity > 0) {
      const statement = inventoryProduct
        ? 'add "' + productName + '" ' + nextQuantity + " @ " + price.toFixed(2) + (inventoryProduct && Math.abs(price - inventoryProduct.price) > 0.005 ? " override" : "") + ";"
        : "add " + instanceName + " " + nextQuantity + ";";
      let insertionIndex = firstTargetIndex >= 0 ? Math.min(firstTargetIndex, nextLines.length) : nextLines.findIndex(line => line.trim() === "checkout;");
      if (insertionIndex < 0) insertionIndex = nextLines.length;
      nextLines.splice(insertionIndex, 0, statement);
    }

    executeCode(nextLines.join("\n").replace(/\n{3,}/g, "\n\n"), nextQuantity <= 0 ? "Item removed" : "Cart updated", nextQuantity <= 0 ? productName + " was removed from the cart." : productName + " quantity is now " + nextQuantity + ".");
  }, [code, executeCode, instances, products, pushNotification]);

  const addInventoryProduct = useCallback((productName: string, price: number) => {
    const currentQuantity = cart.find(item => item.name === productName)?.quantity ?? 0;
    setCartItemQuantity(productName, currentQuantity + 1, price);
  }, [cart, setCartItemQuantity]);

  const orderDate = new Date();
  const orderId   = `#SS-${orderDate.getFullYear()}-${String(orderDate.getMonth()+1).padStart(2,"0")}${String(orderDate.getDate()).padStart(2,"0")}-001`;

  const downloadReceipt = () => {
    if (!didCheckout || hasErrors) {
      pushNotification("error", "Receipt unavailable", "Complete checkout without errors before downloading the receipt.");
      return;
    }
    try {
      downloadReceiptPdf({ user: user ?? "Guest", orderId, items: cart, subtotal, coupon, discount: discountAmt, shipping, total });
      pushNotification("success", "PDF downloaded", "Your ShopScript receipt was saved as a PDF file.");
    } catch {
      pushNotification("error", "Download failed", "The receipt PDF could not be generated. Please try again.");
    }
  };

  return (
    <div className="app-shell" style={{ background:"hsl(36 33% 97%)" }}>
      <NotificationCenter notices={notifications} onDismiss={dismissNotification} />

      {/* â”â”â”â” HEADER â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */}
      <header className="app-header">
        <div className="header-inner" style={{ maxWidth:"var(--app-content-max)", margin:"0 auto", padding:"0 24px", height:56, display:"flex", alignItems:"center", gap:16 }}>
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
            <span className="header-search-label">Search docs, examples, or commands...</span>
            <span style={{ fontSize:10.5, background:"hsl(30 20% 90%)", padding:"1px 5px", borderRadius:3, color:"hsl(220 10% 55%)", flexShrink:0 }}>Ctrl K</span>
          </button>

          {/* Nav — hidden on mobile */}
          <nav className="header-nav" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => (
              <button type="button" key={item} className={`nav-link${activeNav===item?" active":""}`} onClick={() => navigate(item)} aria-current={activeNav===item ? "page" : undefined}>{item}</button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="header-actions">
            <button type="button" className="btn-orange" style={{ fontSize:12.5, padding:"7px 13px" }} onClick={startNewProgram}>
              <span className="new-program-label">New Program</span> {Ico.plus(13,"white")}
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
          <div className="mobile-nav-panel">
            {NAV_ITEMS.map((item) => (
              <button type="button" key={item} className={`nav-link${activeNav===item?" active":""}`} onClick={() => navigate(item)} aria-current={activeNav===item ? "page" : undefined}>{item}</button>
            ))}
          </div>
        )}
      </header>

      {activeNav === "Home" ? (<>
      {/* â”â”â”â” HERO â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */}
      <div className="hero-gradient" style={{ padding:"34px 28px 26px" }}>
        <div className="hero-inner" style={{ maxWidth:"var(--app-content-max)", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", gap:20 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"white", border:"1px solid hsl(25 95% 53% / 0.22)", borderRadius:999, padding:"4px 12px", fontSize:12, color:"hsl(25 95% 53%)", fontWeight:600, marginBottom:14 }}>
              Welcome to ShopScript ðŸ‘‹
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
              <span style={{ fontSize:54 }}>ðŸ›’</span>
              <div style={{ background:"hsl(25 95% 53%)", color:"white", fontSize:11, fontWeight:700, padding:"2px 12px", borderRadius:999 }}>
                {cart.length > 0 ? `${cart.reduce((s,i) => s+i.quantity,0)} items` : "Ready"}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[{ e:"ðŸ“±", bg:"#dbeafe" }, { e:"ðŸŽ§", bg:"#dcfce7" }, { e: hasOOP ? "ðŸ§¬" : "ðŸ¤–", bg:"#fef9c3" }].map((d,i) => (
                <div key={i} style={{ background:d.bg, borderRadius:10, padding:"10px 14px", fontSize:24, border:"1px solid white", boxShadow:"0 2px 8px hsl(0 0% 0% / 0.07)" }}>{d.e}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* â”â”â”â” WORKSPACE â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */}
      <div className="workspace-outer" style={{ maxWidth:"var(--app-content-max)", margin:"0 auto", padding:"20px 20px 0" }}>
        <div className="workspace-grid">

          {/* â”€â”€ LEFT: Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="ss-card editor-card" style={{ overflow:"hidden" }}>
            {/* Top bar — light theme */}
            <div style={{ background:"white", padding:"10px 12px 0", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap", borderBottom:"1px solid hsl(30 20% 90%)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ display:"flex", color:"hsl(25 95% 53%)" }}>{Ico.code(15,"hsl(25 95% 53%)")}</span>
                <span style={{ fontSize:13, fontWeight:700, color:"hsl(220 20% 18%)" }}>ShopScript Editor</span>
              </div>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", paddingBottom:10 }}>
                <EditorThemeToggle theme={editorTheme} onToggle={toggleEditorTheme} />
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
                <span style={{ color:"hsl(142 76% 32%)", fontSize:9, fontFamily:"var(--app-font-sans)", fontWeight:700 }}>Highlighted</span>
              </div>
            </div>
            {/* Shared syntax-highlighted editor */}
            <ShopScriptCodeEditor
              code={code}
              onCodeChange={updatePlaygroundCode}
              onRun={runProgram}
              theme={editorTheme}
              editorRef={textareaRef}
              className="home-ide"
              ariaLabel="ShopScript Home editor"
              errorLines={errorLines}
            />
            {hasRun && primaryError && (
              <div className="editor-diagnostic" role="alert"><strong>{primaryError.category} error · Line {primaryError.line}</strong><span>{primaryError.message}{interpreterErrors.length > 1 ? " · " + (interpreterErrors.length - 1) + " more error(s) below" : ""}</span></div>
            )}
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

          {/* â”€â”€ RIGHT: Simulation Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  <div className="receipt-title">
                    <span style={{ color:"hsl(25 95% 53%)", display:"flex" }}>{Ico.box(14,"hsl(25 95% 53%)")}</span>
                    <span style={{ fontWeight:700, fontSize:13, color:"hsl(220 20% 18%)" }}>Product Inventory</span>
                  </div>
                  <button type="button" className="inventory-toggle" onClick={() => setShowAllInventory(value => !value)}>{showAllInventory ? "Show featured" : "View all " + availableProducts.length} {Ico.chevron(11)}</button>
                </div>

                <div className="products-grid">
                  {visibleProducts.map(p => {
                    const inCart = cart.find(c => c.name === p.name);
                    return (
                      <button
                        type="button"
                        key={p.name}
                        className="product-card"
                        onClick={() => addInventoryProduct(p.name, p.price)}
                        aria-label={"Add " + p.name + " to the ShopScript cart"}
                        title={"Add " + p.name + " · " + p.stock + " in stock"}
                      >
                        <div style={{ position:"relative" }}>
                          <img
                            src={p.img}
                            alt=""
                            className="product-img-thumb"
                            onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/200x80/f0f0f0/999?text=" + encodeURIComponent(p.name); }}
                          />
                          {inCart && (
                            <span style={{ position:"absolute", top:4, right:4, background:"hsl(25 95% 53%)", color:"white", fontSize:9, fontWeight:700, borderRadius:999, padding:"1px 5px", boxShadow:"0 1px 4px hsl(0 0% 0% / 0.2)" }}>
                              {inCart.quantity}
                            </span>
                          )}
                        </div>
                        <span className="product-card-body">
                          <strong>{p.name}</strong>
                          <span className="product-price">{"$"}{p.price.toFixed(2)}</span>
                          <span className="product-availability"><i /> {p.stock} in stock · click to add</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* OOP-defined products */}
                {cart.filter(c => !products.find(p => p.name === c.name)).length > 0 && (
                  <div style={{ marginTop:10, borderTop:"1px dashed hsl(30 20% 85%)", paddingTop:10 }}>
                    <div style={{ fontSize:10, color:"hsl(220 10% 55%)", fontWeight:600, marginBottom:6 }}>OOP-defined products</div>
                    {cart.filter(c => !products.find(p => p.name === c.name)).map(c => (
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
                  <div className="receipt-title">
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
                          src={getProductImg(item.name, products, true)}
                          alt={item.name}
                          className="product-img-sm"
                          onError={e => { (e.target as HTMLImageElement).src=`https://placehold.co/60x60/f0f0f0/999?text=${encodeURIComponent(item.name[0])}`; }}
                        />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"hsl(220 20% 20%)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</div>
                          <div style={{ fontSize:11, color:"hsl(25 95% 53%)", fontWeight:600 }}>${item.price.toFixed(2)}</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <button type="button" className="qty-btn" onClick={() => setCartItemQuantity(item.name, item.quantity - 1, item.price)} aria-label={"Decrease " + item.name + " quantity"}>âˆ’</button>
                          <span style={{ fontSize:12, fontWeight:700, minWidth:18, textAlign:"center" }}>{item.quantity}</span>
                          <button type="button" className="qty-btn" onClick={() => setCartItemQuantity(item.name, item.quantity + 1, item.price)} aria-label={"Increase " + item.name + " quantity"}>+</button>
                        </div>
                        <div style={{ fontSize:12, fontWeight:700, color:"hsl(220 20% 20%)", minWidth:50, textAlign:"right" }}>${(item.price*item.quantity).toFixed(2)}</div>
                        <button type="button" className="cart-remove" onClick={() => setCartItemQuantity(item.name, 0, item.price)} aria-label={"Remove " + item.name + " from cart"}>{Ico.x(11,"hsl(0 84% 65%)")}</button>
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
              <div className="ss-card receipt-card">
                <div className="receipt-header">
                  <div className="receipt-title">
                    <span style={{ color:"hsl(220 60% 55%)", display:"flex" }}>{Ico.clipboard(13,"hsl(220 60% 55%)")}</span>
                    <span style={{ fontWeight:700, fontSize:12.5, color:"hsl(220 20% 18%)" }}>Receipt Preview</span>
                  </div>
                  {didCheckout && !hasErrors && (
                    <button className="btn-ghost receipt-download" onClick={downloadReceipt}>
                      {Ico.down(11)} Download PDF
                    </button>
                  )}
                </div>
                {didCheckout && !hasErrors ? (
                  <div className="receipt" style={{ fontSize:10.5, padding:10 }}>
                    <div style={{ textAlign:"center", marginBottom:8 }}>
                      <div style={{ fontWeight:800, color:"hsl(25 95% 48%)", fontSize:12 }}>ShopScript</div>
                      <div style={{ fontSize:12.5, fontWeight:700, color:"hsl(220 20% 15%)", marginTop:2 }}>Thank you, {user}! ðŸŽ‰</div>
                      <div style={{ fontSize:10, color:"#22c55e" }}>Order placed successfully.</div>
                    </div>
                    <div className="receipt-detail-row">
                      <span>Order ID</span><span style={{ fontWeight:600, color:"hsl(220 20% 20%)" }}>{orderId}</span>
                    </div>
                    <div className="receipt-total-row">
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

        {/* â”â”â”â” ANALYZER ROW (full-width 5 columns) â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */}
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
      ) : activeNav === "Examples" ? (
        <ExamplesPage onOpenExample={openExample} onNavigate={navigate} />
      ) : activeNav === "Inventory" ? (
        <InventoryPage products={products} onSave={saveInventoryProduct} onDelete={deleteInventoryProduct} onReset={resetInventory} onNotify={pushNotification} />
      ) : activeNav === "Playground" ? (
        <PlaygroundPage
          code={code}
          result={result}
          hasRun={hasRun}
          onCodeChange={updatePlaygroundCode}
          onRun={runProgram}
          onClear={clearEditor}
          onLoadExample={loadExampleInPlayground}
          onNavigate={navigate}
          theme={editorTheme}
          onToggleTheme={toggleEditorTheme}
        />
      ) : (
        <AboutPage onNavigate={navigate} />
      )}

      {/* â”â”â”â” FOOTER â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */}
      <footer className="app-footer" style={{ background:"white", borderTop:"1px solid hsl(30 20% 90%)" }}>
        <div className="footer-inner" style={{ maxWidth:"var(--app-content-max)", margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, color:"hsl(220 10% 55%)" }}>
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
