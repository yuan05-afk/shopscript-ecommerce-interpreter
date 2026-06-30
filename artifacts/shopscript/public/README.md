# ShopScript: Mini Programming Language for E-commerce Simulation

> A browser-based educational programming language interpreter that demonstrates lexical analysis, syntax analysis, semantic analysis, scoped execution, control flow, and object-oriented features through an interactive e-commerce simulation.

**Live deployed version:** <https://shopscript-ecommerce.vercel.app/>

---

<img width="1920" height="1876" alt="image" src="https://github.com/user-attachments/assets/3ac04b11-2d13-46c9-bd99-35d1738594cd" />

## Overview

**ShopScript** is a mini programming language interpreter built for a Programming Languages final project. Users write ShopScript code to simulate common e-commerce actions such as declaring variables, adding products to a cart, applying coupons, setting shipping fees, checking out, and generating a receipt.

The project is not a real online store. Its goal is to make programming language concepts visible: source code becomes tokens, syntax diagnostics, semantic checks, variables, class/object state, cart updates, totals, logs, and receipt output.

## Project Team

ShopScript was built as a focused academic project with clear responsibilities across planning, implementation, and documentation.

| Role | Member | Responsibilities |
| --- | --- | --- |
| Project Lead | Fitz Tobias | Academic direction, project scope, demo planning, and requirements alignment |
| Lead Developer | Yuan Mariano | Interpreter pipeline, React application, UI behavior, responsive polish, and deployment setup |
| Documentation Lead | Dwayne Mongaya | Syntax documentation, examples, learning explanations, and presentation support |

## Key Features

* Shared syntax-highlighted ShopScript editor on Home and Playground
* Autocomplete suggestions, synchronized line numbers, Tab indentation, cursor tracking, and Ctrl/Cmd+Enter execution
* Light and dark editor modes plus four app interface themes
* Lexical analyzer with token display
* Syntax checker with line-based error reporting
* Semantic checker for product, coupon, quantity, price, stock, object, and checkout validation
* Scoped variables, explicit types, expressions, `if`/`else`, `while`, and `for`
* Basic OOP with classes, public/private fields, methods, parameters, `this`, and object-backed products
* Script-backed inventory, cart quantity/removal, checkout controls, and receipt preview
* Persistent Inventory page with product CRUD, stock levels, search, filters, sorting, and responsive toolbar layout
* Coupon manager with create/edit/disable/delete/reset support through browser localStorage
* Popup notifications, inline IDE diagnostics, analyzer panels, and output logs
* Responsive receipt preview and PDF receipt download
* Searchable Docs, filterable Examples, focused Playground, Inventory manager, and About page
* Vercel-ready static deployment configuration

## System Architecture

```text
React UI
  |-- Home editor and simulator
  |-- Docs, Examples, Playground, Inventory, About
  |-- Theme, notifications, receipt PDF, responsive layout
  |
  v
ShopScript source code
  |
  v
Lexer -> Syntax Checker -> Semantic Analyzer -> Executor
  |          |                 |                  |
  |          |                 |                  v
  |          |                 |            Cart, totals, receipt,
  |          |                 |            logs, variables, OOP state
  |          |                 v
  |          |          Product, coupon, stock,
  |          |          type, scope, object rules
  |          v
  |   Line-based syntax errors
  v
Positioned tokens
```

### Main Runtime Flow

1. The editor sends source code to `interpret(source)`.
2. The lexer converts source text into positioned tokens.
3. The syntax checker validates statement structure and block shape.
4. The semantic analyzer validates names, types, inventory, coupons, stock, privacy, and checkout rules.
5. The executor updates variables, classes, instances, cart items, totals, logs, and receipt state.
6. React renders the simulator, analyzer panels, OOP cards, and receipt preview from the interpreter result.

## Repository Layout

```text
.
|-- README.md
|-- vercel.json
|-- docs/
|   `-- SHOPSCRIPT_LANGUAGE_SPEC.md
|-- artifacts/
|   |-- shopscript/
|   |   |-- public/README.md
|   |   |-- src/
|   |   |   |-- App.tsx
|   |   |   |-- shopscript-interpreter.ts
|   |   |   |-- inventory.css
|   |   |   |-- index.css
|   |   |   `-- main.tsx
|   |   |-- scripts/interpreter-tests.mjs
|   |   `-- vite.config.ts
|   `-- api-server/
|-- lib/
|   |-- api-client-react/
|   |-- api-spec/
|   |-- api-zod/
|   `-- db/
`-- scripts/
```

## Tech Stack

| Area | Technology | Purpose |
| --- | --- | --- |
| Frontend | React + TypeScript | Single-page educational interpreter UI |
| Build tool | Vite | Local development and static production builds |
| Styling | Custom CSS + Tailwind CSS pipeline | Themes, responsive layout, editor styling, and visual polish |
| Interpreter | Pure TypeScript | Lexer, syntax checker, semantic analyzer, executor, scoped runtime, control flow, and OOP |
| Storage | Browser localStorage | Demo persistence for Inventory and Coupons |
| Testing | TypeScript compiler + interpreter regression script | Type safety and language behavior checks |
| Deployment | Vercel static hosting | Production deployment for the ShopScript app |
| Workspace | pnpm + Corepack | Monorepo package management with a pinned pnpm version |

## How to Run

### Use the Live Version

Open the deployed app:

<https://shopscript-ecommerce.vercel.app/>

### Run Locally

#### Prerequisites

Install [Node.js](https://nodejs.org/) 22 or newer. Corepack is recommended so the project can use the pinned pnpm version from `packageManager`.

```powershell
node --version
corepack --version
corepack enable
```

This repository is a pnpm workspace. The root configuration intentionally rejects `npm install` to prevent npm and pnpm lockfiles from being mixed.

#### Windows PowerShell

```powershell
corepack pnpm install
corepack pnpm --filter @workspace/shopscript run dev
```

Open <http://localhost:5173/>. Keep the terminal running while using the website. Press `Ctrl+C` to stop the development server. `PORT` and `BASE_PATH` are optional local overrides.

#### macOS or Linux

```bash
corepack pnpm install
corepack pnpm --filter @workspace/shopscript run dev
```

Then open <http://localhost:5173/>.

### Verify the Project

```powershell
corepack pnpm --filter @workspace/shopscript run typecheck
corepack pnpm --filter @workspace/shopscript run test:interpreter
corepack pnpm --filter @workspace/shopscript run build
```

### Deploy to Vercel

The repository includes `vercel.json` for the primary ShopScript app. Import the repository in Vercel and keep the project root at the repository root (`./`). Vercel will use:

```text
Install Command: corepack enable && pnpm install --frozen-lockfile
Build Command: pnpm --filter @workspace/shopscript run build
Output Directory: artifacts/shopscript/dist/public
```

No Vercel environment variables are required for the static in-browser interpreter. `PORT` and `BASE_PATH` remain optional local overrides only.

### Troubleshooting

* **`Use pnpm instead`** - run `corepack pnpm install`, not `npm install`.
* **`Missing script: dev`** - the root package has no `dev` script; use the filtered command shown above.
* **Install pauses at the esbuild postinstall step** - allow it a short time to download the platform binary. If it remains stuck, press `Ctrl+C`, check the network connection, and run `corepack pnpm install` again.

## Supported ShopScript Commands

| Command | Syntax | Example |
| --- | --- | --- |
| Declare variable | `let <name> = <value>;` | `let user = "Ava";` |
| Declare explicit type | `<type> <name> = <value>;` | `int qty = 2;` |
| Declare empty list | `let <name> = [];` | `let cart = [];` |
| Register runtime product | `product "<Product>" @ <price> stock <qty>;` | `product "Hoverboard" @ 250.00 stock 2;` |
| Add to cart | `add "<Product>" <qty> @ <price>;` | `add "Smartphone X" 1 @ 599.00;` |
| Override price | `add "<Product>" <qty> @ <price> override;` | `add "Smartphone X" 1 @ 200.00 override;` |
| Create runtime coupon | `coupon "<CODE>" <percent>%;` | `coupon "FLASH25" 25%;` |
| Apply coupon | `apply coupon "<CODE>";` | `apply coupon "SAVE10";` |
| Set shipping | `set shipping = <amount>;` | `set shipping = 40.00;` |
| Checkout | `checkout;` | `checkout;` |

## Sample Program

```shopscript
let user = "Ava";
let budget = 1200.00;
let cart = [];

add "Smartphone X" 1 @ 599.00;
add "Wireless Earbuds" 1 @ 199.00;
add "Phone Case" 2 @ 29.00;

apply coupon "SAVE10";
set shipping = 40.00;

checkout;
```

## Programming Language Concepts Demonstrated

### Lexical Analysis

ShopScript scans source code and converts it into tokens such as keywords, identifiers, strings, numbers, booleans, operators, symbols, assignment signs, semicolons, brackets, and at-signs. Tokens are displayed in the analyzer panel.

### Syntax Analysis

The syntax checker validates statement structure, semicolons, block braces, declarations, add commands, coupon commands, shipping commands, checkout statements, classes, methods, and control-flow statements. Errors include line numbers.

### Semantic Analysis

The semantic checker validates product existence, stock limits, positive quantities, price mismatches, coupon support, empty checkout, duplicate declarations, undeclared variables, type mismatches, object misuse, and private field/method access.

### Variables, Scope, and Types

ShopScript supports inferred `let` declarations and explicit `int`, `float`, `string`, and `bool` declarations. Blocks create nested scopes, duplicate declarations in the same scope are rejected, and assignments resolve through enclosing scopes.

| Type | Example | Use |
| --- | --- | --- |
| `int` | `int qty = 2;` | Whole-number quantities and loops |
| `float` | `float price = 29.00;` | Prices, totals, shipping fees |
| `string` | `string user = "Ava";` | Names and labels |
| `bool` | `bool ready = true;` | Conditions and boolean logic |
| `let` | `let cart = [];` | Inferred values and object references |

### Control Flow

Executable `if`/`else`, `while`, and `for` blocks are supported by the structured runtime. Loops have a 100-iteration safety limit.

```shopscript
int qty = 0;
while (qty < 2) {
  qty = qty + 1;
}

if (qty == 2) {
  add "Phone Case" qty @ 29.00;
}
```

### Object-Oriented Programming

ShopScript supports classes, object creation, public/private fields, public methods, method parameters, `this` field assignment inside methods, and adding object products that expose public `name` and `price` fields.

```shopscript
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
add item 2;
checkout;
```

## Inventory and Coupons

### Runtime Product Registration

Use `product` when a script needs a temporary product that is not in the persistent Inventory page catalog:

```shopscript
product "Hoverboard" @ 250.00 stock 2;
add "Hoverboard" 1 @ 250.00;
checkout;
```

Runtime products exist for the current program run only. They do not permanently change the Inventory CRUD page.

### Manual Price Override

ShopScript validates catalog prices by default. If a script intentionally uses a sale/manual price, add `override` after the price:

```shopscript
add "Smartphone X" 1 @ 200.00 override;
```

Without `override`, a price different from the current Inventory page catalog price is reported as a semantic error.

### Supported Default Coupons

| Coupon Code | Discount |
| --- | --- |
| `SAVE10` | 10% off |
| `STUDENT10` | 10% off |
| `NONE` | 0% discount |

The Inventory > Coupons view lets users create, edit, disable, delete, and reset reusable discount codes. Managed coupons are saved in browser localStorage and are passed into the interpreter during validation.

Scripts can also create temporary runtime coupons:

```shopscript
coupon "FLASH25" 25%;
apply coupon "FLASH25";
```

Runtime coupons exist only for the current program run and do not overwrite the saved coupon catalog.

### Default Inventory

| Product | Price |
| --- | ---: |
| Smartphone X | $599.00 |
| Wireless Earbuds | $199.00 |
| Phone Case | $29.00 |
| Urban Backpack | $49.00 |
| Laptop | $999.00 |
| Smart Watch | $299.00 |

## Project Scope

ShopScript is designed as an educational programming language interpreter, not a production e-commerce platform.

### Included

* Code editor
* Token analysis
* Syntax validation
* Semantic validation
* Scoped variables, explicit types, expressions, and control flow
* Basic OOP with fields, methods, privacy checks, and object-backed products
* Inventory and coupon management
* Cart simulation
* Coupon simulation
* Checkout summary
* Receipt preview and PDF download
* Output logs

### Not Included

* Real payment processing
* Real customer accounts
* Database-backed production storage
* Authentication system
* Real product orders
* Production checkout flow

## Current Limitations

* E-commerce actions are simulated only.
* Page refresh resets the current program state.
* Inventory and coupon persistence is browser-local demo storage, not a production database.
* Constructors, return values, imports, and production checkout/payment features are outside the current required subset.
* The supported syntax is the canonical ShopScript syntax documented in `docs/SHOPSCRIPT_LANGUAGE_SPEC.md`; early `cart.add(...)` PDF-style examples are not implemented as a parallel dialect.

## Version

**ShopScript v0.3.0**  
Programming Languages Final Project

