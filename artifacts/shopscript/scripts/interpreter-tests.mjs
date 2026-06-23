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
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(name, source, check) {
  const result = interpret(source, catalog);
  check(result);
  console.log("PASS " + name);
}

run("typed declarations, while, if", `
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
  assert(result.semanticErrors.length === 0, "expected no semantic errors");
  assert(result.cart[0]?.quantity === 2, "expected loop quantity to be 2");
  assert(result.total === 58, "expected total 58");
});

run("for loop and OOP method", `
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
  assert(result.semanticErrors.length === 0, "expected no semantic errors");
  assert(result.cart[0]?.price === 14.5, "expected method-mutated price");
  assert(result.total === 29, "expected total 29");
});

run("private field enforcement", `
class Product {
  private float cost = 10.00;
}
let item = new Product;
set item.cost = 5.00;
`, result => {
  assert(result.semanticErrors.some(error => error.message.includes("private")), "expected private field error");
});

run("manual price override", `
let cart = [];
add "Smartphone X" 1 @ 200.00 override;
checkout;
`, result => {
  assert(result.semanticErrors.length === 0, "expected override to pass");
  assert(result.total === 200, "expected override price total");
});

run("missing semicolon line attribution", `// Syntax Error Sample
let user = "Bob"
let budget = 500.00;

add Smartphone X 1 @ 599.00;
apply coupon SAVE10;

checkout;
`, result => {
  assert(result.syntaxErrors[0]?.line === 2, "expected missing semicolon to point at line 2");
  assert(result.syntaxErrors[0]?.message.includes("line 2"), "expected message to mention line 2");
});
await rm(tempDir, { recursive: true, force: true });