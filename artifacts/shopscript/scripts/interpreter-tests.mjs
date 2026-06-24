import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/shopscript-interpreter.ts");
const tempDir = resolve(root, ".tmp-tests");
const outPath = resolve(tempDir, "shopscript-interpreter.mjs");

await mkdir(tempDir, { recursive: true });
const source = await readFile(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020, moduleResolution: ts.ModuleResolutionKind.NodeNext, skipLibCheck: true },
});
await writeFile(outPath, transpiled.outputText, "utf8");
const { interpret } = await import(pathToFileURL(outPath).href + "?v=" + Date.now());

const catalog = [
  { name: "Phone Case", price: 29, stock: 24, inStock: true },
  { name: "Smartphone X", price: 599, stock: 12, inStock: true },
  { name: "Wireless Earbuds", price: 199, stock: 8, inStock: true },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function allMessages(errors) {
  return errors.map(error => error.message).join(" | ");
}

function expectError(errors, fragment, label) {
  assert(errors.some(error => error.message.includes(fragment)), `expected ${label} containing "${fragment}"; got: ${allMessages(errors)}`);
}

function expectNoErrors(errors, label) {
  assert(errors.length === 0, `expected no ${label}; got: ${allMessages(errors)}`);
}

function run(name, source, check) {
  const result = interpret(source, catalog);
  check(result);
  console.log("PASS " + name);
}

try {
  run("valid typed declarations, while, if", `
string user = "Ava";
let cart = [];
int qty = 0;
while (qty < 2) {
  qty = qty + 1;
}
if (qty == 2) {
  add "Phone Case" qty @ 29.00;
}
checkout;
`, result => {
    expectNoErrors(result.lexErrors, "lex errors");
    expectNoErrors(result.syntaxErrors, "syntax errors");
    expectNoErrors(result.semanticErrors, "semantic errors");
    assert(result.cart[0]?.quantity === 2, "expected loop quantity to be 2");
    assert(result.total === 58, "expected total 58");
  });

  run("valid for loop and OOP method", `
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
checkout;
`, result => {
    expectNoErrors(result.lexErrors, "lex errors");
    expectNoErrors(result.syntaxErrors, "syntax errors");
    expectNoErrors(result.semanticErrors, "semantic errors");
    assert(result.cart[0]?.price === 14.5, "expected method-mutated price");
    assert(result.total === 29, "expected total 29");
  });

  run("valid manual price override", `
let cart = [];
add "Smartphone X" 1 @ 200.00 override;
checkout;
`, result => {
    expectNoErrors(result.semanticErrors, "semantic errors");
    assert(result.total === 200, "expected override price total");
  });



  run("valid runtime product registration", `
let cart = [];
product "Hoverboard" @ 250.00 stock 2;
add "Hoverboard" 1 @ 250.00;
checkout;
`, result => {
    expectNoErrors(result.lexErrors, "lex errors");
    expectNoErrors(result.syntaxErrors, "syntax errors");
    expectNoErrors(result.semanticErrors, "semantic errors");
    assert(result.cart.some(item => item.name === "Hoverboard" && item.quantity === 1 && item.price === 250), "expected registered Hoverboard in cart");
    assert(result.didCheckout, "expected checkout to complete");
  });

  run("semantic rejects duplicate runtime product", `
let cart = [];
product "Phone Case" @ 19.00 stock 5;
`, result => {
    expectError(result.semanticErrors, "already exists in inventory", "semantic error");
  });
  run("valid final end-to-end demonstration", `
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
`, result => {
    expectNoErrors(result.lexErrors, "lex errors");
    expectNoErrors(result.syntaxErrors, "syntax errors");
    expectNoErrors(result.semanticErrors, "semantic errors");
    assert(result.cart.length === 2, "expected catalog and object cart items");
    assert(result.cart.some(item => item.name === "Wireless Earbuds" && item.quantity === 1), "expected Wireless Earbuds in cart");
    assert(result.cart.some(item => item.name === "Phone Case" && item.quantity === 2 && item.price === 14.5), "expected discounted object Phone Case x2");
    assert(result.coupon === "SAVE10", "expected SAVE10 coupon");
    assert(result.shipping === 40, "expected shipping 40");
    assert(result.didCheckout, "expected checkout to complete");
  });
  run("lexer rejects unterminated string", `
let user = "Ava;
`, result => {
    expectError(result.lexErrors, "Unterminated string", "lex error");
  });

  run("lexer rejects unknown character", `
let user = "Ava";
let budget = 10#;
`, result => {
    expectError(result.lexErrors, "Unexpected character", "lex error");
  });

  run("syntax reports missing semicolon on source line", `// Syntax Error Sample
let user = "Bob"
let budget = 500.00;

add Smartphone X 1 @ 599.00;
apply coupon SAVE10;

checkout;
`, result => {
    assert(result.syntaxErrors[0]?.line === 2, "expected missing semicolon to point at line 2");
    expectError(result.syntaxErrors, "Missing semicolon after let declaration at line 2", "syntax error");
  });

  run("syntax rejects malformed add command", `
let cart = [];
add "Phone Case" one @ 29.00;
`, result => {
    expectError(result.syntaxErrors, "Expected quantity number", "syntax error");
  });

  run("syntax rejects missing closing brace", `
int qty = 1;
if (qty > 0) {
  qty = qty + 1;
`, result => {
    expectError(result.syntaxErrors, "Expected closing brace", "syntax error");
  });

  run("syntax rejects unknown structured statement", `
int qty = 1;
buy now;
`, result => {
    expectError(result.syntaxErrors, "Unknown statement", "syntax error");
  });

  run("semantic rejects unknown product", `
let cart = [];
add "Tablet Z" 1 @ 300.00;
checkout;
`, result => {
    expectError(result.semanticErrors, "not found in inventory", "semantic error");
  });

  run("semantic rejects quantity above stock", `
let cart = [];
add "Smartphone X" 30 @ 599.00;
checkout;
`, result => {
    expectError(result.semanticErrors, "Only 12 additional unit", "semantic error");
  });

  run("valid runtime coupon registration", `
let cart = [];
add "Phone Case" 2 @ 29.00;
coupon "FLASH25" 25%;
apply coupon "FLASH25";
checkout;
`, result => {
    expectNoErrors(result.lexErrors, "lex errors");
    expectNoErrors(result.syntaxErrors, "syntax errors");
    expectNoErrors(result.semanticErrors, "semantic errors");
    assert(result.coupon === "FLASH25", "expected runtime coupon to apply");
    assert(result.discount === 0.25, "expected 25 percent runtime discount");
  });

  {
    const result = interpret(`
let cart = [];
add "Phone Case" 1 @ 29.00;
apply coupon "VIP20";
checkout;
`, catalog, [{ code: "VIP20", discount: 0.2, active: true }]);
    expectNoErrors(result.semanticErrors, "semantic errors");
    assert(result.coupon === "VIP20", "expected managed coupon to apply");
    assert(result.discount === 0.2, "expected managed coupon discount");
    console.log("PASS valid managed coupon catalog");
  }

  run("semantic rejects duplicate runtime coupon", `
let cart = [];
coupon "SAVE10" 25%;
`, result => {
    expectError(result.semanticErrors, "already exists", "semantic error");
  });

  run("semantic rejects invalid coupon", `
let cart = [];
add "Phone Case" 1 @ 29.00;
apply coupon "BADCODE";
checkout;
`, result => {
    expectError(result.semanticErrors, "Invalid coupon code", "semantic error");
  });

  run("semantic rejects price mismatch without override", `
let cart = [];
add "Smartphone X" 1 @ 200.00;
checkout;
`, result => {
    expectError(result.semanticErrors, "Price mismatch", "semantic error");
  });

  run("semantic rejects empty checkout", `
let cart = [];
checkout;
`, result => {
    expectError(result.semanticErrors, "Cannot checkout with an empty cart", "semantic error");
  });

  run("semantic rejects undeclared assignment", `
int qty = 1;
total = qty + 1;
`, result => {
    expectError(result.semanticErrors, "'total' is not declared", "semantic error");
  });

  run("semantic rejects duplicate declaration", `
int qty = 1;
int qty = 2;
`, result => {
    expectError(result.semanticErrors, "Duplicate declaration", "semantic error");
  });

  run("semantic rejects type mismatch", `
int qty = "two";
`, result => {
    expectError(result.semanticErrors, "int requires a whole number", "semantic error");
  });

  run("semantic rejects invalid expression operands", `
int qty = 1 + true;
`, result => {
    expectError(result.semanticErrors, "Numeric expression expected", "semantic error");
  });

  run("semantic enforces loop safety limit", `
int qty = 0;
while (qty < 200) {
  qty = qty + 1;
}
`, result => {
    expectError(result.semanticErrors, "Loop safety limit", "semantic error");
  });

  run("semantic enforces private field access", `
class Product {
  private float cost = 10.00;
}
let item = new Product;
set item.cost = 5.00;
`, result => {
    expectError(result.semanticErrors, "private", "semantic error");
  });

  run("semantic rejects wrong method argument count", `
class Product {
  public string name = "Phone Case";
  public float price = 29.00;
  public method discount(float rate) {
    set this.price = this.price * rate;
  }
}
let item = new Product;
item.discount();
`, result => {
    expectError(result.semanticErrors, "expects 1 argument", "semantic error");
  });

  run("semantic rejects object product without public price", `
class Product {
  public string name = "Mystery Item";
  private float price = 10.00;
}
let item = new Product;
add item 1;
`, result => {
    expectError(result.semanticErrors, "must have public name and price fields", "semantic error");
  });
} finally {
  await rm(tempDir, { recursive: true, force: true });
}