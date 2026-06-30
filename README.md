# ShopScript: Mini Programming Language for E-commerce Simulation

> A browser-based mini programming language interpreter that demonstrates lexical analysis, syntax analysis, semantic analysis, and program execution through an interactive e-commerce simulation.

---

<img width="1920" height="1861" alt="image" src="https://github.com/user-attachments/assets/8ae7e8fd-65e1-4416-9622-07aef3170cf2" />

## Overview

**ShopScript** is a mini programming language interpreter built for a Programming Languages final project. It allows users to write simple scripts that simulate common e-commerce operations such as adding products to a cart, applying coupons, setting shipping fees, checking out, and generating a receipt.

The project combines programming language concepts with a visual and user-friendly e-commerce interface. Instead of building a real online store, ShopScript focuses on how source code is analyzed, validated, and executed by an interpreter.

---

## Project Team

| Role               | Member         |
| ------------------ | -------------- |
| Project Lead       | Fitz Tobias    |
| Lead Developer     | Yuan Mariano   |
| Documentation Lead | Dwayne Mongaya |

---

## Key Features

* Shared syntax-highlighted ShopScript editor on Home and Playground
* Light and dark editor themes (Light by default), synchronized line numbers, Tab indentation, and Ctrl/Cmd+Enter execution
* Lexical analyzer with token display
* Syntax checker with line-based error reporting
* Semantic checker for product, coupon, quantity, and checkout validation
* Variable table for declared values
* Script-backed inventory, cart quantity/removal, and checkout controls
* Persistent Inventory page with product CRUD, stock levels, search, and status filters
* Popup notifications and inline IDE diagnostics for execution, stock, catalog, cart, checkout, and CRUD outcomes
* Responsive receipt preview, PDF receipt downloads, and output logs
* Shopee-inspired orange-and-white user interface
* Responsive layout for desktop, tablet, and mobile viewing
* Searchable in-app documentation and project About page
* Filterable runnable examples that open directly in the interpreter
* Dedicated Playground with shared code, result tabs, and keyboard execution

---

## How ShopScript Works

```text
User Input
    v
Lexical Analysis
    v
Syntax Analysis
    v
Semantic Analysis
    v
Interpreter / Executor
    v
Visual E-commerce Simulation
```

The interpreter processes the source code step by step. If lexical or syntax errors are detected, execution stops. If the code passes validation, the simulation panel updates the cart, discount status, checkout summary, receipt, variable table, and output logs.

---

## How to Run

### Run in Replit

1. Open the project in Replit.
2. Click the **Run** button.
3. The ShopScript interface will open in the web preview.
4. Click **Run Program** inside the website to execute the default sample code.
5. Modify the code or load sample programs to test valid, syntax-error, and semantic-error examples.

### Run Locally

#### Prerequisites

Install [Node.js](https://nodejs.org/) 22 or newer and pnpm. Confirm that both are available:

```powershell
node --version
pnpm --version
```

If `pnpm` is not recognized, install it globally and open a new terminal:

```powershell
npm install --global pnpm
```

This repository is a pnpm workspace. The root configuration intentionally rejects `npm install` to prevent npm and pnpm lockfiles from being mixed.

#### Windows PowerShell

From the repository root, install dependencies and start the ShopScript website:

```powershell
pnpm install
pnpm --filter @workspace/shopscript run dev
```

Open <http://localhost:5173/>. Keep the terminal running while using the website. Press `Ctrl+C` to stop the development server.

#### macOS or Linux

```bash
pnpm install
pnpm --filter @workspace/shopscript run dev
```

Then open <http://localhost:5173/>.

#### Verify the project

```powershell
pnpm --filter @workspace/shopscript run typecheck
pnpm --filter @workspace/shopscript run test:interpreter
pnpm --filter @workspace/shopscript run build
```

#### Deploy to Vercel

The repository includes `vercel.json` for the primary ShopScript app. Import the repository in Vercel and keep the project root at the repository root. Vercel will use:

```text
Install Command: corepack enable && pnpm install --frozen-lockfile
Build Command: pnpm --filter @workspace/shopscript run build
Output Directory: artifacts/shopscript/dist/public
```

No Vercel environment variables are required for the static in-browser interpreter. `PORT` and `BASE_PATH` still remain optional local overrides.

#### Troubleshooting

* **`Use pnpm instead`** - run `pnpm install`, not `npm install`.
* **`Missing script: dev`** - the root package has no `dev` script; use the filtered command shown above.
* **Install pauses at the esbuild postinstall step** - allow it a short time to download the Windows binary. If it remains stuck, press `Ctrl+C`, check the network connection, and run `pnpm install` again.

---

## Supported ShopScript Commands

| Command            | Syntax                             | Example                          |
| ------------------ | ---------------------------------- | -------------------------------- |
| Declare variable   | `let <name> = <value>;`            | `let user = "Ava";`              |
| Declare number     | `let <name> = <number>;`           | `let budget = 1200.00;`          |
| Declare empty list | `let <name> = [];`                 | `let cart = [];`                 |
| Register runtime product | `product "<Product>" @ <price> stock <qty>;` | `product "Hoverboard" @ 250.00 stock 2;` |
| Add to cart        | `add "<Product>" <qty> @ <price>;` | `add "Smartphone X" 1 @ 599.00;` |
| Override price     | `add "<Product>" <qty> @ <price> override;` | `add "Smartphone X" 1 @ 200.00 override;` |
| Create coupon     | `coupon "<CODE>" <percent>%;`     | `coupon "FLASH25" 25%;`          |
| Apply coupon       | `apply coupon "<CODE>";`           | `apply coupon "SAVE10";`         |
| Set shipping       | `set shipping = <amount>;`         | `set shipping = 40.00;`          |
| Checkout           | `checkout;`                        | `checkout;`                      |

---

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

---

## Runtime Product Registration

Use `product` when a script needs a temporary product that is not in the persistent Inventory page catalog:

```shopscript
product "Hoverboard" @ 250.00 stock 2;
add "Hoverboard" 1 @ 250.00;
checkout;
```

This product exists for the current program run only. It does not permanently change the Inventory CRUD page.

---
## Manual Price Override

ShopScript validates catalog prices by default. If a script intentionally uses a sale/manual price, add the `override` keyword after the price:

```shopscript
add "Smartphone X" 1 @ 200.00 override;
```

Without `override`, a price different from the current Inventory page catalog price is reported as a semantic error.

---
## Supported Coupons

| Coupon Code | Discount    |
| ----------- | ----------- |
| `SAVE10`    | 10% off     |
| `STUDENT10` | 10% off     |
| `NONE`      | 0% discount |

---

## Available Inventory

| Product          |   Price |
| ---------------- | ------: |
| Smartphone X     | $599.00 |
| Wireless Earbuds | $199.00 |
| Phone Case       |  $29.00 |
| Urban Backpack   |  $49.00 |
| Laptop           | $999.00 |
| Smart Watch      | $299.00 |

---

## Programming Language Concepts Demonstrated

### 1. Lexical Analysis

ShopScript scans the source code and converts it into tokens such as:

* Keywords
* Identifiers
* String literals
* Number literals
* Operators
* Symbols
* Assignment signs
* Semicolons
* Brackets
* At-signs

Tokens are displayed as color-coded chips in the analyzer panel.

### 2. Syntax Analysis

The syntax checker validates the structure of each statement. It checks for:

* Missing semicolons
* Unterminated strings
* Invalid variable declarations
* Invalid `add` command format
* Invalid coupon format
* Invalid shipping format
* Invalid checkout statement
* Incorrect or unsupported statement patterns

Errors are displayed with line numbers to help users identify where the problem occurs.

### 3. Semantic Analysis

The semantic checker verifies whether the code is logically valid. It checks if:

* Product names exist in the inventory
* Quantity values are greater than zero
* Prices are valid numbers
* Catalog price mismatches use `override` only when intentional
* Coupon codes are supported
* Checkout is not performed with an empty cart
* Declared variables are stored correctly in the symbol table

### 4. Variables and Scope

ShopScript supports inferred `let` declarations and explicit `int`, `float`, `string`, and `bool` declarations. Blocks create nested scopes, duplicate declarations in the same scope are rejected, and assignments resolve through enclosing scopes.

### 5. Data Types

| Type     | Example                 | Use                               |
| -------- | ----------------------- | --------------------------------- |
| `int`    | `int qty = 2;`          | Whole-number quantities and loops |
| `float`  | `float price = 29.00;`  | Prices, totals, shipping fees     |
| `string` | `string user = "Ava";` | Names and labels                  |
| `bool`   | `bool ready = true;`    | Conditions and boolean logic      |
| `let`    | `let cart = [];`        | Inferred values and object refs   |

### 6. Control Flow

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

### 7. Object-Oriented Programming

ShopScript supports classes, object creation, public/private fields, public methods, method parameters, and `this` field assignment inside methods.

```shopscript
class Product {
  public string name = "Phone Case";
  public float price = 29.00;
  private float cost = 10.00;

  public method discount(float rate) {
    set this.price = this.price * rate;
  }
}
```
---

## File Structure

```text
src/
|-- App.tsx                    # Main UI component
|-- shopscript-interpreter.ts  # Lexer, syntax checker, semantic checker, and executor
|-- index.css                  # Main styling and orange/white theme
`-- main.tsx                   # React entry point

public/
`-- assets/                    # Optional images or design assets

docs/
`-- SHOPSCRIPT_LANGUAGE_SPEC.md # Canonical ShopScript grammar and language rules

README.md                      # Project documentation
```

---

## Tech Stack

* **React** - user interface
* **TypeScript** - typed application logic
* **Vite** - development and build tool
* **Tailwind CSS** - utility-based styling
* **Custom CSS** - theme, layout, and visual polish
* **Pure TypeScript Interpreter** - lexer, syntax checker, semantic checker, executor, scoped runtime, control flow, and OOP support

---

## Project Scope

ShopScript is designed as an educational programming language interpreter, not a production e-commerce platform.

### Included

* Code editor
* Token analysis
* Syntax validation
* Semantic validation
* Cart simulation
* Coupon simulation
* Checkout summary
* Receipt preview
* Output logs

### Not Included

* Real payment processing
* Real customer accounts
* Database storage
* Authentication system
* Real product orders
* Production checkout flow

---

## Limitations

* E-commerce actions are simulated only.
* Page refresh resets the current program state.
* Inventory persistence is local/browser-based for the demo, not a production database.
* Constructors, return values, imports, and production checkout/payment features are outside the current required subset.
* The supported syntax is the canonical ShopScript syntax documented in `docs/SHOPSCRIPT_LANGUAGE_SPEC.md`; early `cart.add(...)` PDF-style examples are not implemented as a parallel dialect.

---

## Version

**ShopScript v0.3.0**
Programming Languages Final Project


## Coupon Manager

The Inventory > Coupons view lets users create, edit, disable, delete, and reset reusable discount codes. Managed coupons are saved in browser localStorage and are passed into the interpreter during validation. Scripts can also create temporary runtime coupons with:

```shopscript
coupon "FLASH25" 25%;
apply coupon "FLASH25";
```

Runtime coupons exist only for the current program run and do not overwrite the saved coupon catalog.
