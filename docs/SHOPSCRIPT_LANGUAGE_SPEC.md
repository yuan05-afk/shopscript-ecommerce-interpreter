# ShopScript Language Specification

Version: ShopScript v0.3.0  
Status: canonical project language reference  
Last updated: June 24, 2026

## 1. Purpose

ShopScript is a mini programming language for an educational e-commerce simulation. A ShopScript program describes a small cart workflow: declare variables, add products, apply discounts, compute checkout totals, and inspect interpreter output through lexer, syntax, semantic, scope, object, and execution panels.

ShopScript is not a production commerce language. It does not process real payments, authenticate customers, persist real orders, or connect to a real database. Its purpose is to demonstrate programming-language concepts through a familiar shopping-cart domain.

## 2. Execution model

A program is executed through these stages:

1. Lexical analysis converts source text into tokens with line and column positions.
2. Syntax analysis checks whether statements follow ShopScript grammar.
3. Semantic analysis validates names, types, product inventory, coupons, stock, privacy, and checkout rules.
4. Execution updates the simulated runtime state.
5. Analyzer output displays tokens, errors, variables, classes, objects, cart state, logs, and receipt data.

Invalid programs should report errors and must not show a misleading successful checkout receipt.

## 3. Source format

ShopScript source is plain text. The normal file name used by the UI is:

```shopscript
main.shop
```

Statements normally end with a semicolon:

```shopscript
let user = "Ava";
checkout;
```

Block statements use braces:

```shopscript
if (qty > 0) {
  add "Phone Case" qty @ 29.00;
}
```

Single-line comments start with `//`:

```shopscript
// This is ignored by the interpreter.
let user = "Ava";
```

## 4. Lexical rules

### 4.1 Whitespace

Spaces, tabs, and newlines separate tokens. Newlines are preserved for line-based diagnostics.

### 4.2 Comments

```shopscript
// comment text
```

Everything from `//` to the end of the line is ignored.

### 4.3 Identifiers

Identifiers name variables, classes, fields, methods, and parameters.

```text
letter_or_underscore (letter_or_digit_or_underscore)*
```

Examples:

```shopscript
user
budget
Product
unitPrice
```

### 4.4 Keywords

Reserved words:

```text
let int float string bool void
add apply coupon set checkout override
class new public private method this
if else while for true false
```

### 4.5 Literals

String literal:

```shopscript
"Ava"
"Smartphone X"
```

Number literal:

```shopscript
10
29.00
1200.50
```

Boolean literal:

```shopscript
true
false
```

Empty list literal:

```shopscript
[]
```

String escaping is not part of the current required subset. Use simple quoted strings without embedded quote characters.

### 4.6 Operators and punctuation

Assignment and product-price marker:

```text
= @
```

Arithmetic:

```text
+ - * / %
```

Comparison:

```text
< <= > >= == !=
```

Boolean:

```text
&& || !
```

Grouping and structure:

```text
( ) { } [ ] . , ;
```

## 5. Program grammar

This grammar documents the current implementation target. It is intentionally small and statement-oriented.

```ebnf
program           ::= statement*

statement         ::= declaration
                    | assignment
                    | add_command
                    | coupon_command
                    | checkout_command
                    | if_statement
                    | while_statement
                    | for_statement
                    | class_declaration
                    | method_call

block             ::= "{" statement* "}"

declaration       ::= ("let" | type) identifier "=" expression ";"
type              ::= "int" | "float" | "string" | "bool"

assignment        ::= ["set"] assignment_target "=" expression ";"
assignment_target ::= identifier | identifier "." identifier | "this" "." identifier

product_declaration ::= "product" string "@" expression "stock" expression ";"
add_command       ::= "add" string expression "@" expression ["override"] ";"
                    | "add" identifier expression ";"

coupon_command    ::= "apply" "coupon" string ";"
checkout_command  ::= "checkout" ";"

if_statement      ::= "if" "(" expression ")" block ["else" block]
while_statement   ::= "while" "(" expression ")" block
for_statement     ::= "for" "(" statement_fragment ";" expression ";" statement_fragment ")" block

class_declaration ::= "class" identifier "{" class_member* "}"
class_member      ::= field_declaration | method_declaration
field_declaration ::= ["public" | "private"] ["let" | type] identifier "=" expression ";"
method_declaration::= ["public" | "private"] ["void"] "method" identifier "(" parameter_list? ")" block
parameter_list    ::= parameter ("," parameter)*
parameter         ::= ("let" | type) identifier
method_call       ::= identifier "." identifier "(" argument_list? ")" ";"
argument_list     ::= expression ("," expression)*
```

`statement_fragment` in a `for` loop is the same assignment/declaration shape without relying on a standalone line in the editor.

## 6. Expression grammar

Expressions are used in declarations, assignments, conditions, quantities, prices, loop clauses, and method arguments.

Operator precedence, from highest to lowest:

| Level | Operators | Meaning |
| --- | --- | --- |
| 1 | `()` | Grouping |
| 2 | `!`, unary `-` | Boolean negation, numeric negation |
| 3 | `*`, `/`, `%` | Multiplication, division, remainder |
| 4 | `+`, `-` | Addition, subtraction, string concatenation with `+` |
| 5 | `<`, `<=`, `>`, `>=` | Numeric comparison |
| 6 | `==`, `!=` | Equality comparison |
| 7 | `&&` | Boolean and |
| 8 | `||` | Boolean or |

Examples:

```shopscript
int qty = 2;
float total = qty * 29.00;
bool ready = qty > 0 && total < 100.00;
string message = "Hello " + user;
```

## 7. Variables and data types

### 7.1 Inferred declarations

`let` declares a variable whose runtime type is inferred from the assigned value.

```shopscript
let user = "Ava";
let cart = [];
let budget = 1200.00;
```

`let` remains supported for cart lists and object references.

### 7.2 Explicit declarations

Explicit required types:

```shopscript
int qty = 2;
float price = 29.00;
string user = "Ava";
bool ready = true;
```

### 7.3 Assignment

Variables can be reassigned if they were already declared:

```shopscript
qty = qty + 1;
set shipping = 40.00;
```

`set` is accepted for general assignment and is also used for object fields:

```shopscript
set item.price = 14.50;
set this.price = this.price * rate;
```

### 7.4 Type rules

- `int` accepts whole numbers.
- `float` accepts numeric values.
- `string` accepts string values.
- `bool` accepts boolean values.
- `let` infers the runtime type.
- Assigning an incompatible value produces a semantic error.
- Using undeclared variables produces a semantic error.
- Duplicate declarations in the same scope produce a semantic error.

## 8. E-commerce commands

### 8.1 Register a runtime product

```shopscript
product "Hoverboard" @ 250.00 stock 2;
```

Meaning:

- Registers a product for the current program execution.
- The product can then be used by `add` like catalog inventory.
- The command does not permanently modify the Inventory CRUD page or browser-stored catalog.
- Product name must not duplicate an existing inventory product.
- Price must be non-negative.
- Stock must be a non-negative whole number.
### 8.2 Add a catalog product

```shopscript
add "Smartphone X" 1 @ 599.00;
```

Meaning:

- Product name must exist in the current inventory unless it is a custom object product.
- Quantity must be a positive whole number.
- Price must be non-negative.
- Quantity must not exceed available stock.
- Catalog price must match inventory price unless `override` is used.

### 8.3 Manual sale price override

```shopscript
add "Smartphone X" 1 @ 200.00 override;
```

Use `override` only when the script intentionally uses a manual or sale price. Without `override`, a catalog-price mismatch is a semantic error.

### 8.4 Add an object product

```shopscript
add item 1;
```

The object must have public `name` and `price` fields.

### 8.5 Register runtime coupon

```shopscript
coupon "FLASH25" 25%;
```

A runtime coupon registers a temporary discount code for the current program run. The discount must be from 0% to 95%. Runtime coupons cannot duplicate an existing managed/default coupon code and are not saved to the browser coupon catalog.

### 8.6 Apply coupon

```shopscript
apply coupon "SAVE10";
```

Supported default coupons in the current project. The Inventory > Coupons view can add more managed coupons:

| Code | Discount |
| --- | --- |
| `SAVE10` | 10% |
| `STUDENT10` | 10% |
| `NONE` | 0% |

Unsupported coupon codes produce a semantic error. A script can define a temporary code before applying it with `coupon "CODE" 25%;`.

### 8.7 Set shipping

```shopscript
set shipping = 40.00;
```

Shipping must be a non-negative number.

### 8.8 Checkout

```shopscript
checkout;
```

Checkout succeeds only when the cart is not empty and no blocking semantic error exists.

## 9. Control flow

### 9.1 If / else

```shopscript
if (ready && qty > 0) {
  add "Phone Case" qty @ 29.00;
} else {
  set shipping = 0.00;
}
```

The condition is evaluated as a boolean expression.

### 9.2 While

```shopscript
while (qty < 2) {
  qty = qty + 1;
}
```

The current runtime uses a safety limit of 100 iterations.

### 9.3 For

```shopscript
for (int i = 0; i < 2; i = i + 1) {
  add "Phone Case" 1 @ 29.00;
}
```

The current runtime uses a safety limit of 100 iterations.

## 10. Scope and binding

ShopScript supports global and nested block scopes.

Rules:

- A variable must be declared before use.
- A variable cannot be declared twice in the same scope.
- A nested block can create local bindings.
- Method parameters are method-local bindings.
- Assignment searches the current scope and then enclosing scopes.
- Variables from completed block scopes are shown with scope labels in analyzer output when relevant.

Example:

```shopscript
int qty = 1;

if (qty == 1) {
  int localBonus = 2;
  qty = qty + localBonus;
}
```

## 11. Object-oriented features

### 11.1 Class declaration

```shopscript
class Product {
  public string name = "Phone Case";
  public float price = 29.00;
  private float cost = 10.00;
}
```

### 11.2 Object creation

```shopscript
let item = new Product;
```

### 11.3 Fields

Fields can be `public` or `private`.

```shopscript
public float price = 29.00;
private float cost = 10.00;
```

If no access modifier is provided, the current runtime treats the member as public.

### 11.4 Methods

```shopscript
class Product {
  public string name = "Phone Case";
  public float price = 29.00;

  public method discount(float rate) {
    set this.price = this.price * rate;
  }
}

let item = new Product;
item.discount(0.5);
```

Method rules:

- Methods can have typed parameters.
- `this` refers to the current object.
- Private fields are accessible inside the object method.
- Private fields and private methods cannot be accessed externally.
- Return values are not part of the current required subset.

## 12. Semantic rules

The interpreter reports semantic errors for invalid meaning even when tokens and syntax are valid.

Common semantic errors:

| Scenario | Example |
| --- | --- |
| Unknown product | `add "Tablet Z" 1 @ 300.00;` |
| Duplicate runtime product | `product "Phone Case" @ 19.00 stock 5;` |
| Quantity is not positive | `add "Phone Case" 0 @ 29.00;` |
| Quantity exceeds stock | `add "Smartphone X" 30 @ 599.00;` |
| Price mismatch without override | `add "Smartphone X" 1 @ 200.00;` |
| Invalid coupon | `apply coupon "BADCODE";` |
| Negative shipping | `set shipping = -5.00;` |
| Empty checkout | `checkout;` with no cart items |
| Undeclared variable | `qty = qty + 1;` before `qty` exists |
| Duplicate declaration | `int qty = 1; int qty = 2;` in same scope |
| Type mismatch | `int qty = "two";` |
| Private field access | `set item.cost = 5.00;` |
| Missing object fields | `add item 1;` without public `name` and `price` |

## 13. Error categories

### 13.1 Lexical errors

Lexical errors happen when the tokenizer cannot form valid tokens.

Example:

```shopscript
let user = "Ava;
```

Expected result: unterminated string error.

### 13.2 Syntax errors

Syntax errors happen when tokens do not form a valid statement.

Example:

```shopscript
let user = "Bob"
let budget = 500.00;
```

Expected result: missing semicolon after the `let` declaration on line 1.

### 13.3 Semantic errors

Semantic errors happen when syntax is valid but the program meaning is invalid.

Example:

```shopscript
let cart = [];
add "Smartphone X" 30 @ 599.00;
checkout;
```

Expected result: stock-limit semantic error.

## 14. Final demonstration program

This sample demonstrates variables, explicit types, expressions, control flow, e-commerce commands, OOP, method calls, and checkout.

```shopscript
// Final ShopScript demonstration
string user = "Ava";
let cart = [];
int qty = 0;
bool ready = true;
float shipping = 0.00;

while (qty < 2) {
  qty = qty + 1;
}

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

if (ready && qty == 2) {
  add "Wireless Earbuds" 1 @ 199.00;
  add item qty;
} else {
  set shipping = 0.00;
}

apply coupon "SAVE10";
set shipping = 40.00;
checkout;
```

Expected behavior:

- `user`, `cart`, `qty`, `ready`, `shipping`, and `item` appear in analyzer output.
- `Product` appears in class/object output.
- `qty` becomes `2`.
- `item.discount(0.5)` changes the object price to `14.50`.
- The cart contains Wireless Earbuds and two Phone Case items.
- Coupon and shipping are applied.
- Checkout produces a simulated receipt.

## 15. Current limitations

The following are intentionally outside the current required subset:

- Real payments, accounts, authentication, and persistent orders.
- Database-backed inventory.
- Multi-file imports.
- User-defined return values.
- Constructors.
- Arrays/lists beyond the empty cart-list pattern used by the project.
- Full string escape support.
- `cart.add(...)` dialect from early PDF examples, unless the team explicitly approves a compatibility mode.

## 16. Implementation references

Primary source files:

- `artifacts/shopscript/src/shopscript-interpreter.ts`
- `artifacts/shopscript/src/App.tsx`
- `artifacts/shopscript/scripts/interpreter-tests.mjs`

Project planning references:

- `PROJECT_ROADMAP.md`
- `README.md`
- `PROJECT+SPECIFICATION.pdf`
- `ShopScript_Ecommerce_Project_Plan.pdf`

When implementation and documentation disagree, update this specification and tests to match the actual accepted behavior before final submission.
