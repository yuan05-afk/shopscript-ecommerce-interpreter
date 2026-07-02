# ShopScript Full Phase Documentation

Version: ShopScript v0.3.0  
Project: Design and Implementation of a Mini Programming Language  
Domain: E-commerce cart and order simulation  
Primary app: `artifacts/shopscript`  
Primary interpreter: `artifacts/shopscript/src/shopscript-interpreter.ts`  
Primary editor: `artifacts/shopscript/src/components/shopscript-code-editor.tsx`

## 1. Purpose Of This Document

This document answers the required PHASES section from `PROJECT+SPECIFICATION.pdf` using the actual completed ShopScript system.

It replaces the older planning assumptions in `ShopScript_Ecommerce_Project_Plan.pdf` where they no longer match the implemented app. The most important syntax correction is:

```shopscript
// Current implemented ShopScript syntax
add "Smartphone X" 1 @ 599.00;
apply coupon "SAVE10";
set shipping = 40.00;
checkout;
```

The early project-plan examples used a different planned dialect such as `cart.add(...)`, `discount.apply(...)`, `checkout.order()`, and `receipt.print()`. Those are not the canonical implemented syntax. The current system is centered on the ShopScript Mini IDE and its interpreter pipeline.

## 2. Current System Overview

ShopScript is a browser-based educational mini programming language interpreter. It uses an e-commerce simulation as the visible output of language execution.

The project is not a production e-commerce website. It does not process real payments, create customer accounts, authenticate users, persist production orders, or connect to a production database. Its academic purpose is to demonstrate programming language concepts through a familiar cart, coupon, checkout, inventory, and receipt workflow.

The current website includes:

- Home workspace with the full ShopScript editor, storefront simulator, analyzer panels, receipt preview, and OOP output.
- Playground workspace with the same editor and interpreter state in a focused coding layout.
- Docs page explaining supported syntax, commands, OOP, analyzer output, setup, and project status.
- Examples page with runnable programs for starter code, e-commerce commands, errors, inventory, control flow, and OOP.
- Inventory page with product CRUD, search, filters, sorting, stock state, and coupon management.
- About page with project purpose, educational scope, pipeline, system coverage, and project team responsibilities.
- Vercel-ready production deployment through `vercel.json`.

## 3. ShopScript Mini IDE Capabilities

The ShopScript Mini IDE is the main user-facing tool for writing and running programs. It is shared by Home and Playground, so both pages use the same editor behavior and the same interpreter.

### 3.1 Code Editing

The Mini IDE supports:

- Plain-text ShopScript source editing.
- File-style label `main.shop`.
- Synchronized line-number gutter.
- Cursor tracking with line and column display.
- Tab key indentation using two spaces.
- `Ctrl+Enter` on Windows/Linux and `Command+Enter` on macOS to run the current program.
- Light and dark editor modes.
- Shared editor state between Home and Playground.
- Error-line highlighting after a program run.
- Inline first diagnostic below the editor.
- Scroll synchronization between the text input layer, highlight layer, and gutter.

### 3.2 Syntax Highlighting

The editor visually distinguishes:

- Comments such as `// ShopScript sample`.
- Strings such as `"Ava"` and `"Smartphone X"`.
- Numbers such as `1`, `29.00`, and `1200.50`.
- Booleans such as `true` and `false`.
- Declaration keywords such as `let`, `int`, `float`, `string`, and `bool`.
- E-commerce commands such as `product`, `update product`, `add`, `apply`, `coupon`, `set`, `checkout`, and `override`.
- Control-flow keywords such as `if`, `else`, `for`, and `while`.
- OOP keywords such as `class`, `new`, `public`, `private`, `method`, and `this`.
- Operators such as `=`, `+`, `-`, `*`, `/`, `%`, `<`, `>`, `==`, `!=`, `<=`, `>=`, `&&`, `||`, and `!`.
- Punctuation such as braces, brackets, parentheses, dots, commas, and semicolons.
- Identifiers such as `user`, `cart`, `qty`, `Product`, and `item`.

### 3.3 Autocomplete

The editor provides autocomplete suggestions for:

- Language keywords.
- Data types.
- E-commerce commands.
- Control-flow constructs.
- OOP keywords.
- Common identifiers.
- Object fields.
- Product names from the current inventory catalog.
- Coupon codes from the current coupon catalog.
- Identifiers, class names, fields, products, and coupons already written in the current source code.

Autocomplete is context-aware enough to:

- Detect the current prefix near the cursor.
- Suggest matching items by priority.
- Insert quoted product and coupon values correctly when needed.
- Position the popup near the current typing caret.
- Keep the menu inside the viewport when near screen edges.
- Support keyboard selection with arrow keys, Enter, Tab, and Escape.

### 3.4 Analyzer Output

After running a program, the Mini IDE and analyzer panels show:

- Tokens with token type, value, line, and column.
- Lexical errors.
- Syntax errors.
- Semantic errors.
- Variables with type and value.
- Scoped variables when block or method scopes are used.
- Execution logs.
- Cart contents.
- Subtotal, discount, shipping, and total.
- Checkout status.
- Receipt preview.
- Classes and object instances when OOP features are used.

### 3.5 Home Workspace Output

The Home page connects the Mini IDE to the visual simulator:

- Product inventory cards can add products into the ShopScript source.
- Cart quantity controls update the matching source code.
- Remove controls update the source code.
- Inventory stock and price validation are enforced through the interpreter.
- Coupon and shipping values affect totals.
- Checkout creates a simulated receipt only when the program passes validation.
- Receipt preview can be downloaded as a PDF.
- OOP-defined products appear when scripts create object-backed products.

### 3.6 Playground Output

The Playground page provides a focused programming workspace:

- Same editor and same interpreter as Home.
- Example loader.
- Run and clear controls.
- Status strip for lines, token count, error count, and total.
- Results tabs for Output, Tokens, Errors, and Variables.
- Cart and execution logs in the Output tab.
- Token list in the Tokens tab.
- Grouped lexical, syntax, and semantic diagnostics in the Errors tab.
- Variables and OOP summary in the Variables tab.

## 4. Interpreter Pipeline

ShopScript source code is processed through this pipeline:

```text
Source Code
  -> Lexical Analysis
  -> Syntax Analysis
  -> Semantic Analysis
  -> Execution
  -> Visual Simulation Output
```

The interpreter returns one structured result object containing:

- Tokens.
- Lexical errors.
- Syntax errors.
- Semantic errors.
- Cart items.
- Variables.
- Classes.
- Object instances.
- Execution logs.
- Coupon state.
- Discount value.
- Shipping value.
- Subtotal.
- Total.
- User name.
- Checkout status.

This result drives the Home simulator, Playground tabs, analyzer cards, OOP cards, receipt preview, and notifications.

## 5. Current Canonical ShopScript Syntax

### 5.1 Declarations

```shopscript
let user = "Ava";
let cart = [];
int qty = 2;
float price = 29.00;
string customer = "Ava";
bool ready = true;
```

### 5.2 Assignment

```shopscript
qty = qty + 1;
set shipping = 40.00;
set item.price = 14.50;
set this.price = this.price * rate;
```

### 5.3 Runtime Product Registration

```shopscript
product "Hoverboard" @ 250.00 stock 2;
```

### 5.4 Runtime Product Update

```shopscript
update product "Phone Case" @ 29.00 stock 25;
```

`update product` overrides an existing catalog product for the current program run only. It does not save changes to the Inventory page. Later `add` commands validate against the updated runtime stock and price.

### 5.5 Add Product To Cart

```shopscript
add "Smartphone X" 1 @ 599.00;
add "Phone Case" qty @ 29.00;
```

### 5.6 Manual Price Override

```shopscript
add "Smartphone X" 1 @ 200.00 override;
```

### 5.7 Coupons

```shopscript
coupon "FLASH25" 25%;
apply coupon "FLASH25";
apply coupon "SAVE10";
```

### 5.8 Shipping And Checkout

```shopscript
set shipping = 40.00;
checkout;
```

### 5.9 Control Flow

```shopscript
if (ready && qty == 2) {
  add "Phone Case" qty @ 29.00;
} else {
  set shipping = 0.00;
}

while (qty < 2) {
  qty = qty + 1;
}

for (int i = 0; i < 2; i = i + 1) {
  add "Phone Case" 1 @ 29.00;
}
```

### 5.10 OOP

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

## 6. Phase 1: Language Design

### 6.1 Required By Specification

Phase 1 requires the project to:

- Define the purpose of the programming language.
- Specify syntax style using keywords and symbols.
- Specify the basic structure of programs.

### 6.2 ShopScript Purpose

ShopScript is designed to control an educational e-commerce simulation through source code. The language lets users write simple programs that declare values, register products, add items to a cart, apply coupons, compute totals, check out, and display receipt output.

The language exists to demonstrate compiler/interpreter concepts:

- Lexical analysis.
- Syntax analysis.
- Names, scope, and binding.
- Semantic analysis.
- Control flow.
- Data types.
- Type checking.
- Object-oriented programming.
- Encapsulation.
- Runtime execution.

The e-commerce interface is the visual output of the language, not the academic core. The academic core is the interpreter.

### 6.3 Syntax Style

ShopScript uses a small imperative syntax. It is designed to be readable and easy to tokenize.

The syntax style includes:

- Keyword-based statements.
- Semicolon-terminated statements.
- Brace-delimited blocks.
- Quoted string literals.
- Numeric literals for prices, quantities, and totals.
- Boolean literals for conditions.
- Assignment using `=`.
- Product price marker using `@`.
- Object member access using `.`.
- Parentheses for conditions, grouping, and method calls.

Examples:

```shopscript
string user = "Ava";
let cart = [];
int qty = 1;

if (qty > 0) {
  add "Phone Case" qty @ 29.00;
}

checkout;
```

### 6.4 Basic Program Structure

A ShopScript program is a sequence of statements.

Common structure:

```text
optional declarations
optional product/coupon definitions
optional class definitions
optional object creation
optional assignments
optional control-flow blocks
cart commands
coupon/shipping commands
checkout command
```

Example:

```shopscript
string user = "Ava";
let cart = [];
int qty = 2;

add "Phone Case" qty @ 29.00;
apply coupon "SAVE10";
set shipping = 40.00;
checkout;
```

### 6.5 Mini IDE Support For Phase 1

The Mini IDE supports language design by:

- Providing runnable sample programs.
- Displaying current syntax in Docs.
- Offering autocomplete for supported keywords and commands.
- Highlighting language constructs visually.
- Showing how source code changes simulator output.
- Letting Home and Playground share the same source and interpreter state.

### 6.6 Phase 1 Status

Status: Complete.

ShopScript has a defined purpose, syntax style, program structure, and documented canonical grammar.

## 7. Phase 2: Lexical Analysis

### 7.1 Required By Specification

Phase 2 requires the project to:

- Define tokens.
- Include identifiers.
- Include keywords.
- Include operators.
- Include literals.
- Create a lexical analyzer that scans input code.

### 7.2 Lexical Analyzer

The lexical analyzer is implemented by `tokenize(source)`.

It scans the source code from left to right and groups characters into tokens. It ignores whitespace and single-line comments while preserving line and column positions for diagnostics.

### 7.3 Token Categories

#### Keywords

ShopScript recognizes language and domain keywords:

```text
let int float string bool void
product stock add apply coupon set checkout override update
if else for while
class new public private method this
true false
shipping budget cart user
```

#### Identifiers

Identifiers are names used for variables, classes, fields, methods, and parameters.

Examples:

```shopscript
user
qty
unitPrice
Product
PremiumProduct
item
discount
```

#### Literals

String literals:

```shopscript
"Ava"
"Smartphone X"
"SAVE10"
```

Number literals:

```shopscript
1
29.00
1200.50
```

Boolean literals:

```shopscript
true
false
```

Empty list literal:

```shopscript
[]
```

#### Operators

Assignment:

```text
=
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

Product price marker:

```text
@
```

#### Symbols And Punctuation

```text
; , . ( ) { } [ ]
```

### 7.4 Lexical Error Handling

The lexical analyzer reports errors for:

- Unterminated string literals.
- Unexpected or unsupported characters.

Example lexical error:

```shopscript
let user = "Ava;
```

Expected result:

- Lexical error for unterminated string.
- Error shown in analyzer and editor diagnostic output.

Another lexical error:

```shopscript
let budget = 10#;
```

Expected result:

- Lexical error for unexpected character `#`.

### 7.5 Mini IDE Support For Phase 2

The Mini IDE demonstrates lexical analysis by:

- Showing syntax-colored source while typing.
- Showing a Tokens analyzer panel after execution.
- Showing token count in Playground.
- Showing token chips in Home analyzer.
- Showing token type, lexeme, line, and column in Playground.
- Highlighting lexical errors in the editor.
- Grouping lexical errors separately from syntax and semantic errors.

### 7.6 Phase 2 Status

Status: Complete.

The current system defines and displays all required token categories and includes a working lexical analyzer with diagnostics.

## 8. Phase 3: Syntax Analysis

### 8.1 Required By Specification

Phase 3 requires the project to:

- Define grammar rules.
- Validate program structure.
- Detect correct or incorrect syntax.

### 8.2 Current Grammar Summary

The current implemented grammar is statement-oriented:

```ebnf
program           ::= statement*

statement         ::= declaration
                    | assignment
                    | product_declaration
                    | product_update
                    | add_command
                    | coupon_command
                    | checkout_command
                    | if_statement
                    | while_statement
                    | for_statement
                    | class_declaration
                    | method_call

declaration       ::= ("let" | type) identifier "=" expression ";"
type              ::= "int" | "float" | "string" | "bool"

assignment        ::= ["set"] assignment_target "=" expression ";"
assignment_target ::= identifier | identifier "." identifier | "this" "." identifier

product_declaration ::= "product" string "@" expression "stock" expression ";"
product_update      ::= "update" "product" string "@" expression "stock" expression ";"
add_command       ::= "add" string expression "@" expression ["override"] ";"
                    | "add" identifier expression ";"

coupon_command    ::= "coupon" string expression ["%"] ";"
                    | "apply" "coupon" string ";"

checkout_command  ::= "checkout" ";"

if_statement      ::= "if" "(" expression ")" block ["else" block]
while_statement   ::= "while" "(" expression ")" block
for_statement     ::= "for" "(" statement_fragment ";" expression ";" statement_fragment ")" block

class_declaration ::= "class" identifier "{" class_member* "}"
class_member      ::= field_declaration | method_declaration
field_declaration ::= ["public" | "private"] ["let" | type] identifier "=" expression ";"
method_declaration::= ["public" | "private"] ["void"] "method" identifier "(" parameter_list? ")" block
method_call       ::= identifier "." identifier "(" argument_list? ")" ";"
```

### 8.3 Syntax Rules Enforced

The syntax layer validates:

- Statement endings with semicolons.
- `let` declarations.
- Explicit typed declarations.
- Add product command shape.
- Add object command shape.
- Runtime product declaration shape.
- Runtime coupon declaration shape.
- Coupon application shape.
- Shipping and assignment shape.
- Checkout statement shape.
- Class declaration structure.
- Object creation through `new`.
- Braced blocks.
- Unknown statements.
- Missing closing braces.
- Malformed add commands.

### 8.4 Syntax Error Examples

Missing semicolon:

```shopscript
let user = "Bob"
let budget = 500.00;
```

Expected result:

- Syntax error pointing to the missing semicolon line.

Malformed add command:

```shopscript
let cart = [];
add "Phone Case" one @ 29.00;
```

Expected result:

- Syntax error because the simple syntax checker rejects the malformed quantity in this command shape.

Missing brace:

```shopscript
int qty = 1;
if (qty > 0) {
  qty = qty + 1;
```

Expected result:

- Syntax error for missing closing brace.

Unknown statement:

```shopscript
int qty = 1;
buy now;
```

Expected result:

- Syntax error for unknown statement.

### 8.5 Mini IDE Support For Phase 3

The Mini IDE demonstrates syntax analysis by:

- Showing syntax-colored source.
- Showing line numbers.
- Marking error lines.
- Showing the first syntax diagnostic below the editor.
- Listing syntax errors in Home analyzer.
- Grouping syntax errors in Playground Errors tab.
- Providing syntax-related samples.
- Providing Docs page examples for the current grammar.

### 8.6 Phase 3 Status

Status: Complete for the current required project scope.

ShopScript validates program structure and reports syntax errors with line numbers. The implementation is intentionally lightweight and statement-oriented rather than a large parser generator or full AST compiler.

## 9. Phase 4: Names, Scope, And Binding

### 9.1 Required By Specification

Phase 4 requires the project to:

- Implement variable declaration rules.
- Define scope.
- Define binding rules.
- Support global and local scope.

### 9.2 Variable Declaration Rules

ShopScript supports inferred and explicit declarations:

```shopscript
let user = "Ava";
int qty = 2;
float price = 29.00;
string label = "Phone Case";
bool ready = true;
```

Rules:

- Variables must be declared before use.
- Duplicate declarations in the same scope are rejected.
- Assignments must target an existing binding.
- Explicitly typed variables must receive compatible values.
- `let` infers the runtime type from the assigned value.

### 9.3 Scope Model

ShopScript supports:

- Global scope.
- Nested block scopes for `if`, `else`, `while`, and `for`.
- Loop-local scope.
- Method-local scope.
- Method parameter binding.
- Object field access through instance bindings.

Example:

```shopscript
int qty = 1;

if (qty == 1) {
  int localBonus = 2;
  qty = qty + localBonus;
}
```

In this example:

- `qty` is declared globally.
- `localBonus` is declared inside the `if` block.
- The block can read and update `qty` through enclosing-scope lookup.
- `localBonus` belongs to the block scope.

### 9.4 Binding Rules

The interpreter binds:

- Variable names to declared type, runtime value, scope ID, and depth.
- Class names to class definitions.
- Object variables to object instances.
- Method parameters to method-local bindings.
- `this` to the current object during method execution.

Assignment lookup starts from the current scope and searches enclosing scopes.

### 9.5 Scope Error Examples

Undeclared variable:

```shopscript
int qty = 1;
total = qty + 1;
```

Expected result:

- Semantic error because `total` was not declared.

Duplicate declaration:

```shopscript
int qty = 1;
int qty = 2;
```

Expected result:

- Semantic error because `qty` is declared twice in the same scope.

### 9.6 Mini IDE Support For Phase 4

The Mini IDE demonstrates names, scope, and binding by:

- Showing variable names in the Variables panel.
- Showing declared or inferred types.
- Showing current values.
- Showing scoped variables with scope labels when block or method scopes are involved.
- Showing undeclared-variable errors in the Semantic Errors panel.
- Showing duplicate-declaration errors.
- Showing object instance names and class bindings in the OOP panel.

### 9.7 Phase 4 Status

Status: Complete.

The current structured runtime implements declaration rules, global/local scopes, method-local binding, enclosing-scope lookup, and variable analyzer output.

## 10. Phase 5: Semantic Analysis

### 10.1 Required By Specification

Phase 5 requires the project to:

- Perform type checking.
- Perform variable declaration checking.
- Detect semantic errors.

### 10.2 Semantic Analysis Purpose

Semantic analysis checks whether syntactically valid code makes sense.

For example, this may be syntactically shaped like an add command:

```shopscript
add "Smartphone X" 30 @ 599.00;
```

But it can still be semantically invalid if only 12 units are available.

### 10.3 Type Checking

ShopScript checks declared types:

```shopscript
int qty = 2;
float price = 29.00;
string user = "Ava";
bool ready = true;
```

Invalid type example:

```shopscript
int qty = "two";
```

Expected result:

- Semantic error because `int` requires a whole number.

The interpreter also checks assignment compatibility:

```shopscript
int qty = 1;
qty = qty + 1;
```

This is valid because the result remains numeric and compatible with `int`.

### 10.4 Variable Declaration Checking

Semantic analysis detects:

- Use before declaration.
- Assignment to undeclared variables.
- Duplicate declarations in the same scope.
- Invalid object references.
- Undefined classes.
- Undefined object instances.

### 10.5 Expression Semantic Checks

The expression evaluator supports:

- Numeric arithmetic.
- String concatenation with `+`.
- Comparison operators.
- Equality operators.
- Boolean operators.
- Unary negation.
- Boolean not.
- Parentheses.
- Field reads.

It detects invalid expression meaning, such as:

```shopscript
int qty = 1 + true;
```

Expected result:

- Semantic error because a numeric expression was expected.

### 10.6 E-commerce Semantic Checks

The interpreter validates:

- Product must exist in inventory unless registered during the current script.
- `update product` must target an existing product and affects only the current run.
- Runtime product names cannot duplicate existing inventory products.
- Product price must be non-negative.
- Product stock must be a non-negative whole number.
- Quantity must be a positive whole number.
- Quantity cannot exceed available stock.
- Catalog price must match the trusted inventory price unless `override` is used.
- Coupon code must exist.
- Runtime coupon code must not duplicate an existing coupon.
- Coupon discount must be from 0% to 95%.
- Shipping must be non-negative.
- Checkout cannot happen with an empty cart.
- Invalid programs must not show a misleading successful checkout.

### 10.7 OOP Semantic Checks

The interpreter validates:

- Class must be defined before object creation.
- Object instance must exist before field access.
- Field must exist before read/write.
- Private fields cannot be accessed externally.
- Private methods cannot be called externally.
- Method must exist before call.
- Method argument count must match parameter count.
- Method parameters are bound in method scope.
- Object products added to cart must expose public `name` and `price` fields.

### 10.8 Semantic Error Examples

Unknown product:

```shopscript
let cart = [];
add "Tablet Z" 1 @ 300.00;
checkout;
```

Quantity above stock:

```shopscript
let cart = [];
add "Smartphone X" 30 @ 599.00;
checkout;
```

Invalid coupon:

```shopscript
let cart = [];
add "Phone Case" 1 @ 29.00;
apply coupon "BADCODE";
checkout;
```

Price mismatch without override:

```shopscript
let cart = [];
add "Smartphone X" 1 @ 200.00;
checkout;
```

Valid manual price override:

```shopscript
let cart = [];
add "Smartphone X" 1 @ 200.00 override;
checkout;
```

Private field access:

```shopscript
class Product {
  private float cost = 10.00;
}

let item = new Product;
set item.cost = 5.00;
```

### 10.9 Mini IDE Support For Phase 5

The Mini IDE demonstrates semantic analysis by:

- Showing Semantic Errors separately from lexical and syntax errors.
- Showing stock and product errors.
- Showing price mismatch and override behavior.
- Showing invalid coupon errors.
- Showing empty checkout errors.
- Showing object misuse and privacy errors.
- Preventing successful receipt output for invalid runs.
- Displaying notifications for run results.
- Updating analyzer panels from the interpreter result.

### 10.10 Phase 5 Status

Status: Complete.

Semantic analysis is one of the strongest parts of the current system because it checks both programming-language rules and e-commerce domain rules.

## 11. Phase 6: Control Flow Implementation

### 11.1 Required By Specification

Phase 6 requires the project to:

- Implement conditional statements.
- Implement loops.
- Demonstrate execution flow.

### 11.2 If / Else

ShopScript supports `if` and `else` blocks:

```shopscript
bool ready = true;
int qty = 2;

if (ready && qty == 2) {
  add "Phone Case" qty @ 29.00;
} else {
  set shipping = 0.00;
}
```

The condition can use:

- Boolean variables.
- Comparisons.
- Equality checks.
- Boolean operators.
- Parenthesized expressions.

### 11.3 While Loop

ShopScript supports `while` loops:

```shopscript
int qty = 0;

while (qty < 2) {
  qty = qty + 1;
}
```

The loop runs while the condition evaluates as true.

### 11.4 For Loop

ShopScript supports `for` loops:

```shopscript
let cart = [];

for (int i = 0; i < 2; i = i + 1) {
  add "Phone Case" 1 @ 29.00;
}

checkout;
```

The loop includes:

- Initializer.
- Condition.
- Increment/update statement.
- Block body.

### 11.5 Loop Safety

Both `while` and `for` loops use a safety limit of 100 iterations.

Example:

```shopscript
int qty = 0;

while (qty < 200) {
  qty = qty + 1;
}
```

Expected result:

- Semantic error after the loop safety limit is exceeded.

### 11.6 Execution Flow Demonstration

Execution flow is visible through:

- Cart changes.
- Variable changes.
- Loop iteration logs.
- Checkout logs.
- Total computation.
- Output Logs panel.
- Playground Output tab.

Example log behavior:

- Program started.
- Structured runtime enabled.
- Variable declared.
- Loop executed.
- Product added.
- Coupon applied.
- Checkout completed.
- Order total computed.

### 11.7 Mini IDE Support For Phase 6

The Mini IDE demonstrates control flow by:

- Providing control-flow sample programs.
- Highlighting `if`, `else`, `while`, and `for`.
- Autocompleting control-flow snippets.
- Showing variable changes after loops.
- Showing loop execution logs.
- Showing cart changes caused by branch or loop execution.
- Displaying errors for unsafe loops.

### 11.8 Phase 6 Status

Status: Complete.

ShopScript implements `if`/`else`, `while`, and `for` with expression conditions, scoped blocks, execution logs, and safety limits.

## 12. Phase 7: Data Types

### 12.1 Required By Specification

Phase 7 requires the project to:

- Support integer.
- Support float.
- Support boolean.
- Support string.
- Handle type conversion and operations.

### 12.2 Supported Data Types

#### Integer

```shopscript
int qty = 2;
```

Use cases:

- Product quantities.
- Stock counts.
- Loop counters.

Rules:

- Must be a whole number.
- Decimal values are rejected for `int`.
- Strings and booleans are rejected for `int`.

#### Float

```shopscript
float price = 29.00;
float shipping = 40.00;
```

Use cases:

- Prices.
- Shipping fees.
- Discounts.
- Computed totals.

Rules:

- Must be numeric.
- Whole numbers can be accepted as numeric float-compatible values.

#### Boolean

```shopscript
bool ready = true;
bool inStock = false;
```

Use cases:

- Conditions.
- Flags.
- Branch control.

Rules:

- Must be `true` or `false`.

#### String

```shopscript
string user = "Ava";
string productName = "Phone Case";
```

Use cases:

- Customer names.
- Product names.
- Coupon codes.
- Labels.

Rules:

- Must be a quoted string value.

#### Inferred `let`

```shopscript
let user = "Ava";
let budget = 1200.00;
let cart = [];
let item = new Product;
```

Use cases:

- Flexible declarations.
- Cart list.
- Object references.
- Compatibility with earlier ShopScript examples.

#### List

```shopscript
let cart = [];
```

The current required subset supports the empty list pattern mainly for the cart variable. General array operations are outside the current required subset.

#### Object

```shopscript
let item = new Product;
```

Object values are created from classes and can be added to the cart when they expose public `name` and `price` fields.

### 12.3 Operations

ShopScript supports:

Arithmetic:

```shopscript
qty = qty + 1;
float total = qty * 29.00;
```

Comparison:

```shopscript
qty > 0
price <= 100.00
qty == 2
```

Boolean logic:

```shopscript
ready && qty == 2
!ready
ready || qty > 0
```

String concatenation:

```shopscript
string message = "Hello " + user;
```

Field operations:

```shopscript
set this.price = this.price * rate;
set item.name = "Studio Headset";
```

### 12.4 Type Conversion And Compatibility

ShopScript has practical type compatibility rules:

- `let` infers a value's runtime type.
- `int` requires whole numeric values.
- `float` requires numeric values.
- `string` requires string values.
- `bool` requires boolean values.
- Arithmetic operations produce numeric results.
- Integer arithmetic can remain `int` when the result is whole.
- Decimal arithmetic can produce `float`.
- String concatenation with `+` converts operands to strings when one side is a string.
- Invalid conversions produce semantic errors instead of silently changing type.

### 12.5 Mini IDE Support For Phase 7

The Mini IDE demonstrates data types by:

- Syntax highlighting type keywords.
- Autocompleting `int`, `float`, `string`, and `bool`.
- Showing variable types in the Variables panel.
- Showing typed declaration examples in Docs and Examples.
- Showing type mismatch errors.
- Showing numeric/cart effects of typed values.

### 12.6 Phase 7 Status

Status: Complete.

ShopScript supports the required data types and implements practical type checking, expression operations, and compatibility rules.

## 13. Phase 8: Object-Oriented Features

### 13.1 Required By Specification

Phase 8 requires the project to:

- Implement class definition.
- Implement object creation.
- Implement basic encapsulation.
- Demonstrate usage.

### 13.2 Class Definition

Classes are declared with `class`:

```shopscript
class Product {
  public string name = "Phone Case";
  public float price = 29.00;
  private float cost = 10.00;
}
```

Classes can contain:

- Public fields.
- Private fields.
- Typed fields.
- Inferred fields.
- Public methods.
- Private methods.

### 13.3 Object Creation

Objects are created with `new`:

```shopscript
let item = new Product;
```

The variable `item` becomes an object instance bound to the `Product` class.

### 13.4 Fields

Public field:

```shopscript
public string name = "Phone Case";
```

Private field:

```shopscript
private float cost = 10.00;
```

Fields can be updated:

```shopscript
set item.name = "Studio Headset";
set item.price = 349.00;
```

Private fields cannot be updated from outside the object.

### 13.5 Methods

Methods are declared using `method`:

```shopscript
class Product {
  public string name = "Phone Case";
  public float price = 29.00;

  public method discount(float rate) {
    set this.price = this.price * rate;
  }
}
```

Methods support:

- Public/private access.
- Typed parameters.
- Method-local scope.
- `this` binding.
- Field reads and writes.

Method call:

```shopscript
let item = new Product;
item.discount(0.5);
```

### 13.6 Encapsulation

Encapsulation is implemented through `public` and `private`.

Valid internal access:

```shopscript
class Product {
  private float cost = 10.00;

  public method changeCost(float value) {
    set this.cost = value;
  }
}
```

Invalid external access:

```shopscript
class Product {
  private float cost = 10.00;
}

let item = new Product;
set item.cost = 5.00;
```

Expected result:

- Semantic error because `cost` is private.

### 13.7 Object-Backed Products

Object instances can be added to the cart when they expose public `name` and `price` fields:

```shopscript
class Product {
  public string name = "Phone Case";
  public float price = 29.00;
}

let item = new Product;
add item 2;
checkout;
```

Invalid object product:

```shopscript
class Product {
  public string name = "Mystery Item";
  private float price = 10.00;
}

let item = new Product;
add item 1;
```

Expected result:

- Semantic error because the object product does not expose public `name` and `price`.

### 13.8 Mini IDE Support For Phase 8

The Mini IDE demonstrates OOP by:

- Highlighting `class`, `new`, `public`, `private`, `method`, and `this`.
- Autocompleting OOP keywords.
- Showing OOP sample programs.
- Rendering class cards after execution.
- Rendering object instance cards after execution.
- Showing class field values.
- Showing object field values after mutation.
- Showing OOP-defined products in Home.
- Showing OOP summary in Playground.
- Showing private-field and method-call semantic errors.

### 13.9 Phase 8 Status

Status: Complete.

ShopScript implements class definitions, object creation, public/private access, methods, `this`, object state visualization, and object-backed products.

## 14. Final End-To-End Demonstration Program

This program demonstrates all required phases together:

```shopscript
// Final ShopScript Demonstration
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
}
else {
  set shipping = 0.00;
}

apply coupon "SAVE10";
set shipping = 40.00;
checkout;
```

This single program demonstrates:

- Language design through readable e-commerce syntax.
- Lexical analysis through tokens.
- Syntax analysis through declarations, blocks, OOP, commands, and semicolons.
- Names, scope, and binding through variables, loop scope, method scope, and object binding.
- Semantic analysis through types, inventory, coupons, object fields, and checkout rules.
- Control flow through `while` and `if`/`else`.
- Data types through `string`, `int`, `bool`, `float`, `let`, list, and object values.
- OOP through class definition, object creation, method call, `this`, and private field encapsulation.
- Execution flow through cart updates, logs, totals, and receipt output.

Expected behavior:

- `qty` becomes `2`.
- `Product` appears in OOP class output.
- `item` appears as an object instance.
- `item.discount(0.5)` changes the product price from `29.00` to `14.50`.
- Cart contains `Wireless Earbuds` and object-backed `Phone Case` items.
- Coupon `SAVE10` applies a discount.
- Shipping is set to `40.00`.
- Checkout completes.
- Receipt preview displays the final simulated order.

## 15. Current Limitations

The following are intentionally outside the required current subset:

- Real payments.
- Real accounts.
- Authentication.
- Production database storage.
- Persistent real orders.
- Constructors.
- User-defined return values.
- Imports or multi-file programs.
- Full array/list operations beyond the cart-list pattern.
- Full string escaping.
- The early `cart.add(...)` project-plan dialect.

These limitations keep the project focused on the programming-language requirements from the specification.

## 16. Verification Evidence

The current implementation has automated coverage through:

```powershell
corepack pnpm --filter @workspace/shopscript run test:interpreter
corepack pnpm --filter @workspace/shopscript run typecheck
corepack pnpm --filter @workspace/shopscript run build
```

The interpreter tests cover:

- Valid typed declarations.
- `while` loops.
- `if` statements.
- `for` loops.
- OOP methods.
- Encapsulation.
- Runtime product registration.
- Runtime coupon registration.
- Managed coupon validation.
- Manual price override.
- Final end-to-end demonstration.
- Unterminated string errors.
- Unknown character errors.
- Missing semicolon errors.
- Malformed command errors.
- Missing brace errors.
- Unknown statement errors.
- Unknown product errors.
- Stock limit errors.
- Duplicate runtime product errors.
- Duplicate runtime coupon errors.
- Invalid coupon errors.
- Price mismatch errors.
- Empty checkout errors.
- Undeclared variable errors.
- Duplicate declaration errors.
- Type mismatch errors.
- Invalid expression operand errors.
- Loop safety errors.
- Private access errors.
- Method argument count errors.
- Invalid object product errors.

## 17. Final Phase Status Summary

| Phase | Requirement | ShopScript Status |
| --- | --- | --- |
| Phase 1 | Language design | Complete |
| Phase 2 | Lexical analysis | Complete |
| Phase 3 | Syntax analysis | Complete for current grammar |
| Phase 4 | Names, scope, and binding | Complete |
| Phase 5 | Semantic analysis | Complete |
| Phase 6 | Control flow | Complete |
| Phase 7 | Data types | Complete |
| Phase 8 | Object-oriented features | Complete |

ShopScript now satisfies the required programming-language phases through a browser-based Mini IDE, interpreter pipeline, analyzer panels, simulator output, examples, documentation, tests, and deployable Vercel app.
