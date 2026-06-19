import { useState, useRef, useCallback, useEffect } from "react";
import { interpret, INVENTORY, type InterpreterResult, type Token } from "./shopscript-interpreter";

// ─── Default sample code ─────────────────────────────────────────────────────
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

// ─── Product inventory constant ───────────────────────────────────────────────
const PRODUCTS = [
  { name: "Smartphone X", price: 599.0, emoji: "📱", inStock: true },
  { name: "Wireless Earbuds", price: 199.0, emoji: "🎧", inStock: true },
  { name: "Phone Case", price: 29.0, emoji: "🛡️", inStock: true },
  { name: "Urban Backpack", price: 49.0, emoji: "🎒", inStock: true },
];

// ─── Token color map ──────────────────────────────────────────────────────────
function getTokenChipClass(type: string): string {
  const map: Record<string, string> = {
    keyword: "keyword", string: "string", number: "number",
    operator: "operator", at: "at", semicolon: "semicolon",
    identifier: "identifier", boolean: "boolean", assign: "assign",
    symbol: "symbol", lbracket: "lbracket", rbracket: "rbracket",
  };
  return map[type] ?? "identifier";
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [code, setCode] = useState(SAMPLE_VALID);
  const [result, setResult] = useState<InterpreterResult | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [activeNav, setActiveNav] = useState("Home");
  const [isDark] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Count lines for line-number gutter
  const lines = code.split("\n");

  const runProgram = useCallback(() => {
    const r = interpret(code);
    setResult(r);
    setHasRun(true);
  }, [code]);

  const clearEditor = () => {
    setCode("");
    setResult(null);
    setHasRun(false);
  };

  const loadSample = (type: "valid" | "syntax" | "semantic") => {
    if (type === "valid") setCode(SAMPLE_VALID);
    if (type === "syntax") setCode(SAMPLE_SYNTAX_ERROR);
    if (type === "semantic") setCode(SAMPLE_SEMANTIC_ERROR);
    setResult(null);
    setHasRun(false);
  };

  // Auto-run on mount
  useEffect(() => { runProgram(); }, []); // eslint-disable-line

  const cursorInfo = `Lines ${lines.length}, Col 1`;

  // Derived values
  const cart = result?.cart ?? [];
  const subtotal = result?.subtotal ?? 0;
  const discountAmt = subtotal * (result?.discount ?? 0);
  const shipping = result?.shipping ?? 0;
  const total = result?.total ?? 0;
  const user = result?.user ?? "Guest";
  const coupon = result?.coupon ?? null;
  const discount = result?.discount ?? 0;
  const hasErrors =
    (result?.lexErrors.length ?? 0) > 0 ||
    (result?.syntaxErrors.length ?? 0) > 0 ||
    (result?.semanticErrors.length ?? 0) > 0;
  const didCheckout = result?.didCheckout ?? false;

  const orderDate = new Date();
  const orderId = `#SS-${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}${String(orderDate.getDate()).padStart(2, "0")}-001`;

  return (
    <div className={isDark ? "dark" : ""} style={{ minHeight: "100vh", background: "hsl(36 33% 97%)" }}>
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header style={{
        background: "white",
        borderBottom: "1px solid hsl(30 20% 90%)",
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 8px hsl(0 0% 0% / 0.06)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "hsl(25 95% 53%)",
            borderRadius: 8,
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 16,
            fontWeight: 700,
          }}>{"</>"}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "hsl(25 95% 48%)", lineHeight: 1.1 }}>ShopScript</div>
            <div style={{ fontSize: 10, color: "hsl(220 10% 55%)", lineHeight: 1 }}>Code. Simulate. Sell.</div>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <span style={{ fontSize: 14 }}>🔍</span>
          <span style={{ fontSize: 13, color: "hsl(220 10% 60%)" }}>Search docs, examples, or commands...</span>
          <span style={{ marginLeft: "auto", fontSize: 11, background: "hsl(30 20% 90%)", padding: "1px 6px", borderRadius: 4, color: "hsl(220 10% 55%)" }}>⌘K</span>
        </div>

        {/* Nav */}
        <nav className="nav-links" style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {["Home", "Docs", "Examples", "Playground", "About"].map(n => (
            <span
              key={n}
              className={`nav-link${activeNav === n ? " active" : ""}`}
              onClick={() => setActiveNav(n)}
            >{n}</span>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn-orange" style={{ fontSize: 13, padding: "7px 14px" }} onClick={runProgram}>
            New Program <span style={{ fontWeight: 400 }}>+</span>
          </button>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "hsl(25 95% 53%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
            position: "relative",
            cursor: "pointer",
          }}>
            SS
            <span style={{
              position: "absolute",
              bottom: 1,
              right: 1,
              width: 9,
              height: 9,
              background: "#22c55e",
              borderRadius: "50%",
              border: "2px solid white",
            }} />
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <div className="hero-gradient" style={{ padding: "36px 32px 28px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "white",
              border: "1px solid hsl(25 95% 53% / 0.2)",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: 12,
              color: "hsl(25 95% 53%)",
              fontWeight: 600,
              marginBottom: 12,
            }}>
              👋 Welcome to ShopScript
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "hsl(220 20% 12%)", lineHeight: 1.2, margin: "0 0 8px", maxWidth: 480 }}>
              Mini Programming Language<br />
              <span style={{ color: "hsl(25 95% 53%)" }}>for E-commerce Simulation</span>
            </h1>
            <p style={{ color: "hsl(220 10% 45%)", fontSize: 15, margin: "0 0 20px" }}>
              Write simple scripts. Simulate carts. See results instantly.
            </p>
            {/* Feature badges */}
            <div className="hero-badges" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { icon: "⚡", label: "Lexical" },
                { icon: "🔤", label: "Syntax" },
                { icon: "🧠", label: "Semantic" },
                { icon: "🎯", label: "Scope" },
                { icon: "🏷️", label: "Data Types" },
                { icon: "🔀", label: "Control Flow" },
                { icon: "🧬", label: "OOP" },
              ].map(b => (
                <span key={b.label} className="feature-badge">
                  <span>{b.icon}</span>{b.label}
                </span>
              ))}
            </div>
          </div>
          {/* Decorative illustration */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            fontSize: 48,
            opacity: 0.85,
            flexShrink: 0,
          }}>
            <div style={{
              background: "white",
              borderRadius: 16,
              padding: "12px 20px",
              boxShadow: "0 8px 32px hsl(25 95% 53% / 0.2)",
              border: "1px solid hsl(25 95% 53% / 0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}>
              <span style={{ fontSize: 52 }}>🛒</span>
              <div style={{
                background: "hsl(25 95% 53%)",
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 10px",
                borderRadius: 999,
              }}>
                {cart.length > 0 ? `${cart.reduce((s, i) => s + i.quantity, 0)} items` : "Ready"}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: "📱", color: "#dbeafe", label: "%" },
                { icon: "🎧", color: "#dcfce7", label: "🏷️" },
                { icon: "🤖", color: "#fef9c3", label: "✨" },
              ].map(d => (
                <div key={d.icon} style={{
                  background: d.color,
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 22,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  border: "1px solid white",
                  boxShadow: "0 2px 8px hsl(0 0% 0% / 0.08)",
                }}>
                  {d.icon}<span style={{ fontSize: 12 }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: "24px auto", padding: "0 20px 40px" }}>
        <div
          className="workspace-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}
        >
          {/* ── LEFT: Editor ─────────────────────────────────────────────── */}
          <div>
            <div className="ss-card" style={{ overflow: "hidden" }}>
              {/* Editor header */}
              <div style={{
                background: "#12121c",
                padding: "10px 14px 0",
                borderRadius: "12px 12px 0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#89b4fa", fontFamily: "var(--app-font-mono)" }}>
                    {"</>"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#cdd6f4" }}>ShopScript Editor</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-orange" style={{ padding: "6px 14px", fontSize: 12 }} onClick={runProgram}>
                    ▶ Run Program
                  </button>
                  <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 12, background: "transparent", color: "#6c7086", border: "1px solid #3a3a4a" }} onClick={clearEditor}>
                    ✕ Clear
                  </button>
                  <div style={{ position: "relative" }}>
                    <select
                      onChange={(e) => {
                        loadSample(e.target.value as "valid" | "syntax" | "semantic");
                        e.target.value = "";
                      }}
                      defaultValue=""
                      style={{
                        background: "transparent",
                        border: "1px solid #3a3a4a",
                        color: "#6c7086",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                        appearance: "none",
                        paddingRight: 24,
                      }}
                    >
                      <option value="" disabled>Load Sample</option>
                      <option value="valid">✅ Valid Sample</option>
                      <option value="syntax">❌ Syntax Error</option>
                      <option value="semantic">⚠️ Semantic Error</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* File tab */}
              <div style={{ background: "#12121c", padding: "0 14px" }}>
                <div style={{
                  display: "inline-block",
                  background: "#1e1e2e",
                  color: "#89b4fa",
                  fontFamily: "var(--app-font-mono)",
                  fontSize: 12,
                  padding: "6px 16px 0",
                  borderRadius: "6px 6px 0 0",
                  border: "1px solid #2a2a3a",
                  borderBottom: "2px solid hsl(25 95% 53%)",
                }}>
                  main.shop
                </div>
              </div>
              {/* Code area */}
              <div style={{ display: "flex", background: "#1e1e2e" }}>
                <div className="line-numbers">
                  {lines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  className="code-editor"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const start = e.currentTarget.selectionStart;
                      const end = e.currentTarget.selectionEnd;
                      const newVal = code.substring(0, start) + "  " + code.substring(end);
                      setCode(newVal);
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart = start + 2;
                          textareaRef.current.selectionEnd = start + 2;
                        }
                      }, 0);
                    }
                  }}
                />
              </div>
              {/* Status bar */}
              <div className="status-bar">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: hasErrors && hasRun ? "#f38ba8" : "#a6e3a1",
                    display: "inline-block",
                  }} />
                  <span style={{ color: hasErrors && hasRun ? "#f38ba8" : "#a6e3a1" }}>
                    {hasErrors && hasRun ? "Error" : "Ready"}
                  </span>
                </div>
                <span>{cursorInfo}</span>
                <span>ShopScript v0.1.0</span>
              </div>
            </div>

            {/* ── ANALYZER SECTION ──────────────────────────────────────── */}
            <div style={{ marginTop: 20 }}>
              {/* Tokens */}
              <div className="ss-card" style={{ padding: 16, marginBottom: 14 }}>
                <div className="section-title" style={{ marginBottom: 10 }}>
                  <span>⚡</span>
                  <span>Tokens</span>
                  {result && (
                    <span style={{
                      marginLeft: "auto",
                      background: "hsl(25 95% 53%)",
                      color: "white",
                      borderRadius: "999px",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 8px",
                    }}>
                      {result.tokens.length}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 120, overflowY: "auto" }}>
                  {hasRun && result?.tokens.length ? (
                    result.tokens.map((t: Token, i: number) => (
                      <span key={i} className={`token-chip ${getTokenChipClass(t.type)}`}>
                        {t.type === "string" ? `"${t.value}"` : t.value}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "hsl(220 10% 60%)", fontSize: 13 }}>Run program to see tokens...</span>
                  )}
                </div>
              </div>

              {/* Syntax & Semantic errors side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {/* Syntax Errors */}
                <div className="ss-card" style={{ padding: 14 }}>
                  <div className="section-title" style={{ marginBottom: 10, fontSize: 13 }}>
                    <span>🔤</span>Syntax Errors
                  </div>
                  {!hasRun ? (
                    <div style={{ color: "hsl(220 10% 60%)", fontSize: 12 }}>Not run yet</div>
                  ) : result?.syntaxErrors.length === 0 && result?.lexErrors.length === 0 ? (
                    <div className="success-box">
                      <span>✅</span> No syntax errors
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {[...(result?.lexErrors ?? []), ...(result?.syntaxErrors ?? [])].map((e, i) => (
                        <div key={i} className="error-box" style={{ fontSize: 11, padding: "5px 10px" }}>
                          <span>❌</span> Line {e.line}: {e.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Semantic Errors */}
                <div className="ss-card" style={{ padding: 14 }}>
                  <div className="section-title" style={{ marginBottom: 10, fontSize: 13 }}>
                    <span>🧠</span>Semantic Errors
                  </div>
                  {!hasRun ? (
                    <div style={{ color: "hsl(220 10% 60%)", fontSize: 12 }}>Not run yet</div>
                  ) : result?.semanticErrors.length === 0 ? (
                    <div className="success-box">
                      <span>✅</span> No semantic errors
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {result?.semanticErrors.map((e, i) => (
                        <div key={i} className="error-box" style={{ fontSize: 11, padding: "5px 10px" }}>
                          <span>⚠️</span> Line {e.line}: {e.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Variable Table + Output Logs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Variable Table */}
                <div className="ss-card" style={{ padding: 14 }}>
                  <div className="section-title" style={{ marginBottom: 10, fontSize: 13 }}>
                    <span>📊</span>Variable Table
                    {result && (
                      <span style={{
                        marginLeft: "auto",
                        background: "hsl(220 20% 90%)",
                        color: "hsl(220 20% 40%)",
                        borderRadius: "999px",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "1px 8px",
                      }}>
                        {result.variables.length}
                      </span>
                    )}
                  </div>
                  {result?.variables.length ? (
                    <div style={{ overflowX: "auto" }}>
                      <table className="var-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.variables.map((v, i) => (
                            <tr key={i}>
                              <td style={{ fontFamily: "var(--app-font-mono)", color: "#7c3aed" }}>{v.name}</td>
                              <td style={{ color: "hsl(220 10% 50%)" }}>{v.type}</td>
                              <td style={{ fontFamily: "var(--app-font-mono)", color: "#15803d" }}>{v.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ color: "hsl(220 10% 60%)", fontSize: 12 }}>No variables declared</div>
                  )}
                </div>

                {/* Output Logs */}
                <div className="ss-card" style={{ padding: 14 }}>
                  <div className="section-title" style={{ marginBottom: 10, fontSize: 13 }}>
                    <span>📋</span>Output Logs
                    {result && (
                      <span style={{
                        marginLeft: "auto",
                        background: "hsl(142 76% 36% / 0.15)",
                        color: "hsl(142 76% 30%)",
                        borderRadius: "999px",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "1px 8px",
                      }}>
                        {result.logs.length}
                      </span>
                    )}
                  </div>
                  <div style={{ maxHeight: 130, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    {result?.logs.length ? (
                      result.logs.map((log, i) => (
                        <div key={i} className="log-item">
                          <div className="log-dot" style={{ background: i === 0 ? "#89b4fa" : i === result.logs.length - 1 && didCheckout ? "#a6e3a1" : "hsl(25 95% 53%)" }} />
                          <span style={{ fontFamily: "var(--app-font-mono)", fontSize: 11, color: "hsl(220 15% 35%)" }}>{log}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "hsl(220 10% 60%)", fontSize: 12 }}>No logs yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Simulation Panel ───────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 2,
            }}>
              <span style={{ fontSize: 16 }}>🛒</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: "hsl(220 20% 15%)" }}>Simulation Panel</span>
            </div>

            {/* Product Inventory */}
            <div className="ss-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="section-title">
                  <span>📦</span>Product Inventory
                </div>
                <span style={{ fontSize: 12, color: "hsl(25 95% 53%)", fontWeight: 600, cursor: "pointer" }}>View all →</span>
              </div>
              <div
                className="products-grid"
                style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}
              >
                {PRODUCTS.map(p => {
                  const inCart = cart.find(c => c.name === p.name);
                  return (
                    <div key={p.name} className="product-card">
                      <div style={{
                        fontSize: 32,
                        marginBottom: 6,
                        background: "hsl(36 33% 97%)",
                        borderRadius: 8,
                        padding: "8px 0",
                        position: "relative",
                      }}>
                        {p.emoji}
                        {inCart && (
                          <span style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            background: "hsl(25 95% 53%)",
                            color: "white",
                            fontSize: 9,
                            fontWeight: 700,
                            borderRadius: "999px",
                            padding: "1px 5px",
                          }}>{inCart.quantity}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "hsl(220 20% 20%)", marginBottom: 2, lineHeight: 1.2 }}>{p.name}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "hsl(25 95% 53%)" }}>${p.price.toFixed(2)}</div>
                      <div style={{ fontSize: 10, color: "#22c55e", display: "flex", alignItems: "center", gap: 3, justifyContent: "center", marginTop: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                        In Stock
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shopping Cart */}
            <div className="ss-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="section-title">
                  <span>🛍️</span>Shopping Cart
                </div>
                {cart.length > 0 && (
                  <span style={{
                    background: "hsl(25 95% 53%)",
                    color: "white",
                    borderRadius: "999px",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 9px",
                  }}>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
                )}
              </div>

              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "hsl(220 10% 60%)", fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>🛒</div>
                  Cart is empty — run a program to add items
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {cart.map((item, i) => {
                    const inv = INVENTORY[item.name];
                    return (
                      <div key={i} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: i < cart.length - 1 ? "1px solid hsl(30 20% 93%)" : "none",
                      }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          background: "hsl(36 33% 96%)",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                          border: "1px solid hsl(30 20% 90%)",
                        }}>
                          {inv?.emoji ?? "📦"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(220 20% 20%)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: "hsl(25 95% 53%)", fontWeight: 600 }}>${item.price.toFixed(2)}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button className="qty-btn">−</button>
                          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                          <button className="qty-btn">+</button>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "hsl(220 20% 20%)", minWidth: 60, textAlign: "right" }}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(0 84% 70%)", fontSize: 16, padding: 2 }}>✕</button>
                      </div>
                    );
                  })}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0 0",
                    borderTop: "1px solid hsl(30 20% 88%)",
                    fontSize: 13,
                  }}>
                    <span style={{ color: "hsl(220 10% 50%)" }}>Subtotal ({cart.length} item{cart.length !== 1 ? "s" : ""})</span>
                    <span style={{ fontWeight: 700, color: "hsl(25 95% 53%)" }}>${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Discount + Checkout Summary side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Discount Status */}
              <div className="ss-card" style={{ padding: 14 }}>
                <div className="section-title" style={{ fontSize: 13, marginBottom: 12 }}>
                  <span>🏷️</span>Discount Status
                </div>
                {coupon ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "hsl(220 10% 50%)" }}>Coupon Applied</span>
                      <span className="coupon-badge">{coupon}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "hsl(220 10% 50%)" }}>Discount</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>{(discount * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{
                      background: "hsl(142 76% 36% / 0.08)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      <span style={{ fontSize: 12, color: "#15803d", fontWeight: 500 }}>You saved</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#15803d" }}>−${discountAmt.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "hsl(220 10% 60%)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>
                    No coupon applied
                  </div>
                )}
              </div>

              {/* Checkout Summary */}
              <div className="ss-card" style={{ padding: 14 }}>
                <div className="section-title" style={{ fontSize: 13, marginBottom: 12 }}>
                  <span>🧾</span>Checkout Summary
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {[
                    { label: "Subtotal", value: `$${subtotal.toFixed(2)}`, color: "inherit" },
                    ...(coupon ? [{ label: "Discount", value: `−$${discountAmt.toFixed(2)}`, color: "#15803d" }] : []),
                    { label: "Shipping", value: `$${shipping.toFixed(2)}`, color: "inherit" },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "hsl(220 10% 50%)" }}>{row.label}</span>
                      <span style={{ fontWeight: 600, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{
                    borderTop: "1px solid hsl(30 20% 88%)",
                    paddingTop: 7,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                  }}>
                    <span style={{ fontWeight: 700 }}>Total</span>
                    <span style={{ fontWeight: 800, color: "hsl(25 95% 53%)" }}>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Preview */}
            <div className="ss-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="section-title">
                  <span>🧾</span>Receipt Preview
                </div>
                {didCheckout && (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: "4px 10px" }}
                    onClick={() => {
                      const text = `ShopScript Receipt\n${"=".repeat(30)}\nThank you, ${user}!\nOrder ID: ${orderId}\nDate: ${orderDate.toLocaleDateString()}\n${"-".repeat(30)}\n${cart.map(i => `${i.name} x${i.quantity}\t$${(i.price * i.quantity).toFixed(2)}`).join("\n")}\n${"-".repeat(30)}\nSubtotal: $${subtotal.toFixed(2)}\n${coupon ? `Discount (${coupon}): -$${discountAmt.toFixed(2)}\n` : ""}Shipping: $${shipping.toFixed(2)}\nTotal: $${total.toFixed(2)}\n${"=".repeat(30)}\nOrder placed successfully.`;
                      const blob = new Blob([text], { type: "text/plain" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "shopscript-receipt.txt";
                      a.click();
                    }}
                  >
                    ⬇ Download
                  </button>
                )}
              </div>

              {didCheckout && !hasErrors ? (
                <div className="receipt">
                  <div style={{ textAlign: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, color: "hsl(25 95% 48%)", fontSize: 14 }}>ShopScript</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "hsl(220 20% 15%)", marginTop: 4 }}>Thank you, {user}! 🎉</div>
                    <div style={{ fontSize: 11, color: "#22c55e", marginTop: 2 }}>Order placed successfully.</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, color: "hsl(220 10% 55%)" }}>
                    <span>Order ID</span><span style={{ fontWeight: 600, color: "hsl(220 20% 20%)" }}>{orderId}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 11, color: "hsl(220 10% 55%)" }}>
                    <span>Order Date</span><span style={{ fontWeight: 600, color: "hsl(220 20% 20%)" }}>{orderDate.toLocaleDateString()}</span>
                  </div>
                  <div style={{ borderTop: "1px dashed hsl(30 20% 80%)", paddingTop: 8, marginBottom: 8 }}>
                    {cart.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span>{item.name} x{item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px dashed hsl(30 20% 80%)", paddingTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                      <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                    </div>
                    {coupon && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#15803d", marginBottom: 2 }}>
                        <span>Discount ({coupon})</span><span>−${discountAmt.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                      <span>Shipping</span><span>${shipping.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: "hsl(25 95% 48%)" }}>
                      <span>Total Paid</span><span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "16px 0", color: "hsl(220 10% 55%)", fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🧾</div>
                  {hasErrors ? "Fix errors to generate receipt" : "Run a program with 'checkout;' to generate receipt"}
                </div>
              )}
            </div>

            {/* Checkout CTA */}
            {didCheckout && !hasErrors ? (
              <div className="checkout-cta">
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>✅ Order Confirmed!</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 12 }}>Your simulation completed successfully.</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 13 }}>
                  <span style={{ opacity: 0.85 }}>Total Paid</span>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>${total.toFixed(2)}</span>
                </div>
                <button
                  style={{
                    width: "100%",
                    background: "white",
                    color: "hsl(25 95% 48%)",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 0",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                  onClick={runProgram}
                >
                  🛒 Run Again
                </button>
              </div>
            ) : (
              <div className="checkout-cta" style={{ opacity: hasRun && !hasErrors ? 1 : 0.65 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Ready to Checkout?</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 10 }}>
                  {hasErrors ? "Fix errors in your program first." : "Add 'checkout;' to your program and run it."}
                </div>
                <button
                  style={{
                    width: "100%",
                    background: "white",
                    color: "hsl(25 95% 48%)",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 0",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  onClick={runProgram}
                >
                  🛒 Run Program
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{
        background: "white",
        borderTop: "1px solid hsl(30 20% 90%)",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 12,
        color: "hsl(220 10% 55%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "hsl(25 95% 53%)", fontWeight: 700 }}>ShopScript</span>
          <span>—</span>
          <span>Programming Languages Final Project</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { icon: "⭐", label: "Light & Clean" },
            { icon: "😊", label: "Friendly" },
            { icon: "⚡", label: "Fast & Intuitive" },
            { icon: "👨‍💻", label: "Built for Developers" },
          ].map(f => (
            <span key={f.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {f.icon} {f.label}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
