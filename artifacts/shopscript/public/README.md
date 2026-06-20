# ShopScript: Mini Programming Language for E-commerce Simulation

> A Programming Languages final project demonstrating lexical analysis, syntax analysis, semantic analysis, and interpretation through an interactive e-commerce simulation.

---

## What is ShopScript?

ShopScript is a mini programming language interpreter built entirely in the browser. Users write simple scripts to simulate e-commerce actions — adding products to a cart, applying coupons, setting shipping, and checking out — and see results instantly through an interactive simulation panel.

This project demonstrates core Programming Languages concepts applied to a real, visual use case.

---

## How to Run

1. Open the project in Replit
2. The ShopScript editor loads with a default sample program
3. Click **Run Program** to execute
4. Modify the code and run again — results update instantly
5. Use **Load Sample** to try valid, syntax-error, and semantic-error examples

**No installation required** — everything runs in the browser.

---

## Supported ShopScript Commands

| Command | Syntax | Example |
|---------|--------|---------|
| Declare variable | `let <name> = <value>;` | `let user = "Ava";` |
| Declare number | `let <name> = <number>;` | `let budget = 1200.00;` |
| Declare empty list | `let <name> = [];` | `let cart = [];` |
| Add to cart | `add "<Product>" <qty> @ <price>;` | `add "Smartphone X" 1 @ 599.00;` |
| Apply coupon | `apply coupon "<CODE>";` | `apply coupon "SAVE10";` |
| Set shipping | `set shipping = <amount>;` | `set shipping = 40.00;` |
| Checkout | `checkout;` | `checkout;` |

### Supported Coupons

| Code | Discount |
|------|----------|
| `SAVE10` | 10% off |
| `STUDENT10` | 10% off |
| `NONE` | 0% (no discount) |

### Available Products (Inventory)

| Product | Price |
|---------|-------|
| Smartphone X | $599.00 |
| Wireless Earbuds | $199.00 |
| Phone Case | $29.00 |
| Urban Backpack | $49.00 |
| Laptop | $999.00 |
| Smart Watch | $299.00 |

---

## Features Implemented

### 1. Lexical Analysis
- Tokenizes input into: Keywords, Identifiers, String literals, Number literals, Operators, Symbols, At-sign (`@`), Semicolons, Assignment (`=`), Brackets
- Detects unterminated string literals and unexpected characters
- Displays tokens as color-coded chips in the Tokens panel

### 2. Syntax Analysis
- Validates statement structure for all supported commands
- Checks: missing semicolons, unquoted product names, missing `@` in add commands, invalid let/set/apply formats, balanced brackets in empty list literals
- Reports line numbers for all syntax errors

### 3. Semantic Analysis
- Verifies product names exist in inventory
- Ensures quantity > 0
- Ensures price ≥ 0
- Validates coupon codes against the known coupon table
- Checks that checkout is not called with an empty cart

### 4. Variables / Scope
- `let` declarations store variables in a symbol table
- Variable table displays name, type, and current value in real time
- Variables are scoped to the current program execution

### 5. Data Types
- **string** — quoted text (e.g., `"Ava"`, `"SAVE10"`)
- **number** — integer or float (e.g., `599.00`, `1`)
- **list** — empty array literal (`[]`) for cart initialization
- **boolean** — `true` / `false` (reserved keywords)

### 6. Control Flow (Demonstration)
- `if`, `else`, `for`, `while` are recognized as reserved keywords by the lexer
- Demonstrates the language's reserved keyword set even where full execution is not yet supported

### 7. OOP (Demonstration)
- `class` and `new` are recognized as reserved keywords
- Shows the language's extensibility toward object-oriented constructs

---

## Architecture

```
User Input (source code)
    ↓
[Lexer] → Token stream + lex errors
    ↓
[Syntax Checker] → Syntax errors (statement-level validation)
    ↓
[Interpreter / Executor] → Semantic errors + execution side effects
    ↓
UI State Update (cart, variables, logs, receipt, summary)
```

All three phases run sequentially. If lex or syntax errors are present, execution is halted. Only clean programs update the simulation panel.

---

## Limitations

- **Simulated e-commerce only** — no real products, no real transactions
- **No real payments** — checkout is purely visual
- **No database** — all state lives in browser memory; page refresh resets everything
- **No login system** — user identity is set via `let user = "...";` in code
- **No multi-line expressions** — each statement must be on its own line
- **No conditionals execution** — `if/else/for/while` are lexically recognized but not yet executed
- **No OOP execution** — `class/new` are reserved keywords but class definitions are not yet executed

---

## File Structure

```
src/
├── App.tsx                    — Main UI component (editor + simulation panel)
├── shopscript-interpreter.ts  — Lexer, syntax checker, and interpreter
├── index.css                  — All styles (orange/white theme)
└── main.tsx                   — React entry point
public/
└── README.md                  — This file
```

---

## Tech Stack

- React + TypeScript (UI layer)
- Vite (build tooling)
- Pure TypeScript interpreter (no external parsing libraries)
- Tailwind CSS + custom CSS (styling)

---

*ShopScript v0.2.0 — Programming Languages Final Project*
