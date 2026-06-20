# ShopScript: Mini Programming Language for E-commerce Simulation

> A browser-based mini programming language interpreter that demonstrates lexical analysis, syntax analysis, semantic analysis, and program execution through an interactive e-commerce simulation.

---

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

* Browser-based ShopScript code editor
* Lexical analyzer with token display
* Syntax checker with line-based error reporting
* Semantic checker for product, coupon, quantity, and checkout validation
* Variable table for declared values
* Interactive cart and checkout simulation
* Receipt preview and output logs
* Shopee-inspired orange-and-white user interface
* Responsive layout for desktop, tablet, and mobile viewing

---

## How ShopScript Works

```text
User Input
    ↓
Lexical Analysis
    ↓
Syntax Analysis
    ↓
Semantic Analysis
    ↓
Interpreter / Executor
    ↓
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

```bash
npm install
npm run dev
```

Then open the local development URL shown in the terminal.

---

## Supported ShopScript Commands

| Command            | Syntax                             | Example                          |
| ------------------ | ---------------------------------- | -------------------------------- |
| Declare variable   | `let <name> = <value>;`            | `let user = "Ava";`              |
| Declare number     | `let <name> = <number>;`           | `let budget = 1200.00;`          |
| Declare empty list | `let <name> = [];`                 | `let cart = [];`                 |
| Add to cart        | `add "<Product>" <qty> @ <price>;` | `add "Smartphone X" 1 @ 599.00;` |
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
* Coupon codes are supported
* Checkout is not performed with an empty cart
* Declared variables are stored correctly in the symbol table

### 4. Variables and Scope

ShopScript supports `let` declarations. Declared values are stored in a symbol table and displayed in the variable table.

Current supported value types include:

* String
* Number
* List
* Boolean keywords

Variables are scoped to the current program execution.

### 5. Data Types

| Type    | Example         | Use                                   |
| ------- | --------------- | ------------------------------------- |
| String  | `"Ava"`         | Names, products, coupon codes         |
| Number  | `599.00`        | Prices, quantities, shipping fees     |
| List    | `[]`            | Cart initialization                   |
| Boolean | `true`, `false` | Reserved values for future conditions |

### 6. Control Flow Demonstration

ShopScript recognizes control flow keywords such as:

* `if`
* `else`
* `for`
* `while`

These keywords demonstrate the language’s reserved keyword set and future extensibility for executable conditional and loop behavior.

### 7. Object-Oriented Programming Demonstration

ShopScript recognizes object-oriented keywords such as:

* `class`
* `new`

These reserved keywords demonstrate how the language can be extended to support object-oriented structures such as `Product`, `Cart`, and `Order` classes.

---

## File Structure

```text
src/
├── App.tsx                    # Main UI component
├── shopscript-interpreter.ts  # Lexer, syntax checker, semantic checker, and executor
├── index.css                  # Main styling and orange/white theme
└── main.tsx                   # React entry point

public/
└── assets/                    # Optional images or design assets

README.md                      # Project documentation
```

---

## Tech Stack

- React + TypeScript (UI layer)
- Vite (build tooling)
- Pure TypeScript interpreter (no external parsing libraries)
- Tailwind CSS + custom CSS (styling)

---

*ShopScript v0.1.0 — Programming Languages Final Project*
