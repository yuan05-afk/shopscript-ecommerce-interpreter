
// =============================================================================
// ShopScript Mini Language Interpreter v0.2.0
// Lexical Analysis -> Syntax Analysis -> Semantic Analysis -> Execution
// Now with OOP: class definitions and new instantiation
// =============================================================================

export interface Token {
  type: string;
  value: string;
  line: number;
  col: number;
}

export interface LexError {
  message: string;
  line: number;
}

export interface SyntaxError {
  message: string;
  line: number;
}

export interface SemanticError {
  message: string;
  line: number;
}

export interface CartItem {
  name: string;
  quantity: number;
  price: number;
}

export interface VariableEntry {
  name: string;
  type: string;
  value: string;
}

export interface ClassDefinition {
  name: string;
  fields: Record<string, { type: string; value: string }>;
}

export interface ObjectInstance {
  className: string;
  fields: Record<string, { type: string; value: string }>;
}

export interface InterpreterResult {
  tokens: Token[];
  lexErrors: LexError[];
  syntaxErrors: SyntaxError[];
  semanticErrors: SemanticError[];
  cart: CartItem[];
  variables: VariableEntry[];
  classes: ClassDefinition[];
  instances: Record<string, ObjectInstance>;
  logs: string[];
  coupon: string | null;
  discount: number;
  shipping: number;
  subtotal: number;
  total: number;
  user: string | null;
  didCheckout: boolean;
}

// ---------------------------------------------------------------------------
// INVENTORY
// ---------------------------------------------------------------------------
export const INVENTORY: Record<string, { price: number; emoji: string }> = {
  "Smartphone X": { price: 599.0, emoji: "\u{1F4F1}" },
  "Wireless Earbuds": { price: 199.0, emoji: "\u{1F3A7}" },
  "Phone Case": { price: 29.0, emoji: "\u{1F6E1}\u{FE0F}" },
  "Urban Backpack": { price: 49.0, emoji: "\u{1F392}" },
  Laptop: { price: 999.0, emoji: "\u{1F4BB}" },
  "Smart Watch": { price: 299.0, emoji: "\u{231A}" },
};

export interface RuntimeInventoryProduct {
  name: string;
  price: number;
  stock: number;
  inStock: boolean;
}

// ---------------------------------------------------------------------------
// COUPONS
// ---------------------------------------------------------------------------
export interface RuntimeCoupon {
  code: string;
  discount: number;
  active: boolean;
}

const DEFAULT_COUPON_RATES: Record<string, number> = {
  SAVE10: 0.1,
  STUDENT10: 0.1,
  NONE: 0.0,
};

function normalizeCouponCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function createCouponMap(coupons?: RuntimeCoupon[]): Map<string, number> {
  const couponMap = new Map<string, number>();
  Object.entries(DEFAULT_COUPON_RATES).forEach(([code, discount]) => couponMap.set(code, discount));
  coupons?.forEach(coupon => {
    const code = normalizeCouponCode(coupon.code);
    if (code && coupon.active && Number.isFinite(coupon.discount)) couponMap.set(code, coupon.discount);
  });
  return couponMap;
}

// ---------------------------------------------------------------------------
// TOKEN TYPES
// ---------------------------------------------------------------------------
export const TOKEN_TYPES = {
  KEYWORD: "keyword",
  IDENTIFIER: "identifier",
  STRING: "string",
  NUMBER: "number",
  OPERATOR: "operator",
  SYMBOL: "symbol",
  AT: "at",
  SEMICOLON: "semicolon",
  ASSIGN: "assign",
  LBRACKET: "lbracket",
  RBRACKET: "rbracket",
  LBRACE: "lbrace",
  RBRACE: "rbrace",
  DOT: "dot",
  BOOLEAN: "boolean",
  EOF: "eof",
};

const KEYWORDS = new Set([
  "let", "int", "float", "string", "bool", "void", "product", "stock", "add", "apply", "coupon", "set", "checkout", "override",
  "if", "else", "for", "while", "class", "new", "true", "false",
  "shipping", "budget", "cart", "user", "return", "this", "public", "private", "method",
]);

// ---------------------------------------------------------------------------
// LEXER
// ---------------------------------------------------------------------------
export function tokenize(source: string): { tokens: Token[]; errors: LexError[] } {
  const tokens: Token[] = [];
  const errors: LexError[] = [];
  let pos = 0;
  let line = 1;
  let lineStart = 0;

  const col = () => pos - lineStart + 1;

  while (pos < source.length) {
    if (/\s/.test(source[pos])) {
      if (source[pos] === "\n") { line++; lineStart = pos + 1; }
      pos++;
      continue;
    }

    // Line comments
    if (source[pos] === "/" && source[pos + 1] === "/") {
      while (pos < source.length && source[pos] !== "\n") pos++;
      continue;
    }

    const startCol = col();

    const two = source.slice(pos, pos + 2);
    if (["<=", ">=", "==", "!=", "&&", "||"].includes(two)) {
      tokens.push({ type: TOKEN_TYPES.OPERATOR, value: two, line, col: startCol });
      pos += 2;
      continue;
    }

    // String literal
    if (source[pos] === '"') {
      pos++;
      let str = "";
      while (pos < source.length && source[pos] !== '"') {
        if (source[pos] === "\n") {
          errors.push({ message: `Unterminated string literal at line ${line}`, line });
          break;
        }
        str += source[pos++];
      }
      if (source[pos] === '"') pos++;
      tokens.push({ type: TOKEN_TYPES.STRING, value: str, line, col: startCol });
      continue;
    }

    // Number literal
    if (/[0-9]/.test(source[pos]) || (source[pos] === "." && /[0-9]/.test(source[pos + 1] ?? ""))) {
      let num = "";
      while (pos < source.length && /[0-9.]/.test(source[pos])) num += source[pos++];
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: num, line, col: startCol });
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_]/.test(source[pos])) {
      let ident = "";
      while (pos < source.length && /[a-zA-Z0-9_]/.test(source[pos])) ident += source[pos++];
      if (ident === "true" || ident === "false") {
        tokens.push({ type: TOKEN_TYPES.BOOLEAN, value: ident, line, col: startCol });
      } else if (KEYWORDS.has(ident)) {
        tokens.push({ type: TOKEN_TYPES.KEYWORD, value: ident, line, col: startCol });
      } else {
        tokens.push({ type: TOKEN_TYPES.IDENTIFIER, value: ident, line, col: startCol });
      }
      continue;
    }

    // Single-char tokens
    const singles: Record<string, string> = {
      ";": TOKEN_TYPES.SEMICOLON,
      "@": TOKEN_TYPES.AT,
      "=": TOKEN_TYPES.ASSIGN,
      "[": TOKEN_TYPES.LBRACKET,
      "]": TOKEN_TYPES.RBRACKET,
      "{": TOKEN_TYPES.LBRACE,
      "}": TOKEN_TYPES.RBRACE,
      ".": TOKEN_TYPES.DOT,
    };
    if (singles[source[pos]]) {
      tokens.push({ type: singles[source[pos]], value: source[pos], line, col: startCol });
      pos++;
      continue;
    }
    if (["+", "-", "*", "/", "%", "<", ">", "!", "&", "|"].includes(source[pos])) {
      tokens.push({ type: TOKEN_TYPES.OPERATOR, value: source[pos], line, col: startCol });
      pos++;
      continue;
    }
    if (["(", ")", ","].includes(source[pos])) {
      tokens.push({ type: TOKEN_TYPES.SYMBOL, value: source[pos], line, col: startCol });
      pos++;
      continue;
    }

    errors.push({ message: `Unexpected character '${source[pos]}' at line ${line}, col ${startCol}`, line });
    pos++;
  }

  tokens.push({ type: TOKEN_TYPES.EOF, value: "", line, col: col() });
  return { tokens, errors };
}

// ---------------------------------------------------------------------------
// SYNTAX CHECKER
// ---------------------------------------------------------------------------
export function checkSyntax(tokens: Token[]): SyntaxError[] {
  const errors: SyntaxError[] = [];
  let i = 0;
  const peek = () => tokens[i];
  const consume = () => tokens[i++];
  const expect = (type: string, value?: string): boolean => {
    const t = peek();
    if (t.type === type && (value === undefined || t.value === value)) { consume(); return true; }
    return false;
  };

  while (i < tokens.length && peek().type !== TOKEN_TYPES.EOF) {
    const t = peek();

    // class ClassName { field = value; ... }
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "class") {
      consume();
      const nameToken = peek();
      if (nameToken.type !== TOKEN_TYPES.IDENTIFIER) {
        errors.push({ message: `Expected class name (identifier) after 'class' at line ${nameToken.line}`, line: nameToken.line });
      } else { consume(); }
      if (!expect(TOKEN_TYPES.LBRACE)) {
        errors.push({ message: `Expected '{' to open class body at line ${peek().line}`, line: peek().line });
      }
      // Parse fields until }
      while (i < tokens.length && peek().type !== TOKEN_TYPES.RBRACE && peek().type !== TOKEN_TYPES.EOF) {
        const fieldName = peek();
        if (fieldName.type !== TOKEN_TYPES.IDENTIFIER) {
          errors.push({ message: `Expected field name in class body at line ${fieldName.line}`, line: fieldName.line });
          consume(); continue;
        }
        consume();
        if (!expect(TOKEN_TYPES.ASSIGN)) {
          errors.push({ message: `Expected '=' after field name '${fieldName.value}' at line ${peek().line}`, line: peek().line });
        }
        const val = peek();
        if (val.type !== TOKEN_TYPES.STRING && val.type !== TOKEN_TYPES.NUMBER && val.type !== TOKEN_TYPES.BOOLEAN) {
          errors.push({ message: `Expected default value for field '${fieldName.value}' at line ${val.line}`, line: val.line });
        } else { consume(); }
        if (!expect(TOKEN_TYPES.SEMICOLON)) {
          errors.push({ message: `Missing semicolon after field '${fieldName.value}' at line ${fieldName.line}`, line: fieldName.line });
        }
      }
      if (!expect(TOKEN_TYPES.RBRACE)) {
        errors.push({ message: `Expected '}' to close class body at line ${peek().line}`, line: peek().line });
      }
      continue;
    }

    // let <ident> = <value | new ClassName | []>;
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "let") {
      consume();
      const ident = peek();
      if (ident.type !== TOKEN_TYPES.IDENTIFIER && ident.type !== TOKEN_TYPES.KEYWORD) {
        errors.push({ message: `Expected identifier after 'let' at line ${ident.line}`, line: ident.line });
      } else { consume(); }
      if (!expect(TOKEN_TYPES.ASSIGN)) {
        errors.push({ message: `Expected '=' in let declaration at line ${peek().line}`, line: peek().line });
      }
      const val = peek();
      if (val.type === TOKEN_TYPES.KEYWORD && val.value === "new") {
        consume(); // new
        const cls = peek();
        if (cls.type !== TOKEN_TYPES.IDENTIFIER) {
          errors.push({ message: `Expected class name after 'new' at line ${cls.line}`, line: cls.line });
        } else { consume(); }
      } else if (val.type === TOKEN_TYPES.STRING || val.type === TOKEN_TYPES.NUMBER || val.type === TOKEN_TYPES.BOOLEAN) {
        consume();
      } else if (val.type === TOKEN_TYPES.LBRACKET) {
        consume();
        if (!expect(TOKEN_TYPES.RBRACKET)) {
          errors.push({ message: `Expected ']' to close empty array at line ${val.line}`, line: val.line });
        }
      } else {
        errors.push({ message: `Expected value after '=' at line ${val.line}`, line: val.line });
      }
      if (!expect(TOKEN_TYPES.SEMICOLON)) {
        errors.push({ message: `Missing semicolon after let declaration at line ${t.line}`, line: t.line });
      }
      continue;
    }


    // product "Name" @ <price> stock <qty>;
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "product") {
      consume();
      const name = peek();
      if (name.type !== TOKEN_TYPES.STRING) {
        errors.push({ message: `Expected product name string after 'product' at line ${name.line}`, line: name.line });
      } else { consume(); }
      if (!expect(TOKEN_TYPES.AT)) {
        errors.push({ message: `Expected '@' in product declaration at line ${peek().line}`, line: peek().line });
      }
      const price = peek();
      if (price.type !== TOKEN_TYPES.NUMBER) {
        errors.push({ message: `Expected product price number after '@' at line ${price.line}`, line: price.line });
      } else { consume(); }
      const stockKeyword = peek();
      if (stockKeyword.type !== TOKEN_TYPES.KEYWORD || stockKeyword.value !== "stock") {
        errors.push({ message: `Expected 'stock' in product declaration at line ${stockKeyword.line}`, line: stockKeyword.line });
      } else { consume(); }
      const stock = peek();
      if (stock.type !== TOKEN_TYPES.NUMBER) {
        errors.push({ message: `Expected stock quantity number at line ${stock.line}`, line: stock.line });
      } else { consume(); }
      if (!expect(TOKEN_TYPES.SEMICOLON)) {
        errors.push({ message: `Missing semicolon after product declaration at line ${t.line}`, line: t.line });
      }
      continue;
    }
    // add "<product>" <qty> @ <price> [override]; OR add <instanceVar> <qty>;
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "add") {
      consume();
      const nameOrVar = peek();
      if (nameOrVar.type === TOKEN_TYPES.STRING) {
        consume();
        const qty = peek();
        if (qty.type !== TOKEN_TYPES.NUMBER) {
          errors.push({ message: `Expected quantity number at line ${qty.line}`, line: qty.line });
        } else { consume(); }
        if (!expect(TOKEN_TYPES.AT)) {
          errors.push({ message: `Expected '@' in add command at line ${peek().line}`, line: peek().line });
        }
        const price = peek();
        if (price.type !== TOKEN_TYPES.NUMBER) {
          errors.push({ message: `Expected price number after '@' at line ${price.line}`, line: price.line });
        } else { consume(); }
        if (peek().type === TOKEN_TYPES.KEYWORD && peek().value === "override") {
          consume();
        }
      } else if (nameOrVar.type === TOKEN_TYPES.IDENTIFIER) {
        // add instanceVar qty;  (uses instance.name and instance.price)
        consume();
        const qty = peek();
        if (qty.type !== TOKEN_TYPES.NUMBER) {
          errors.push({ message: `Expected quantity number after instance variable at line ${qty.line}`, line: qty.line });
        } else { consume(); }
      } else {
        errors.push({ message: `Expected product name string or instance variable after 'add' at line ${nameOrVar.line}`, line: nameOrVar.line });
        consume();
      }
      if (!expect(TOKEN_TYPES.SEMICOLON)) {
        errors.push({ message: `Missing semicolon after add command at line ${t.line}`, line: t.line });
      }
      continue;
    }

    // syntax runtime coupon declaration: coupon "<CODE>" <percent>%;
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "coupon") {
      consume();
      const code = peek();
      if (code.type !== TOKEN_TYPES.STRING) {
        errors.push({ message: "Expected coupon code string at line " + code.line, line: code.line });
      } else { consume(); }
      const rate = peek();
      if (rate.type !== TOKEN_TYPES.NUMBER) {
        errors.push({ message: "Expected coupon discount number at line " + rate.line, line: rate.line });
      } else { consume(); }
      if (peek().type === TOKEN_TYPES.OPERATOR && peek().value === "%") {
        consume();
      }
      if (!expect(TOKEN_TYPES.SEMICOLON)) {
        errors.push({ message: "Missing semicolon after coupon declaration at line " + t.line, line: t.line });
      }
      continue;
    }

    // apply coupon "<CODE>";
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "apply") {
      consume();
      const coupKw = peek();
      if (coupKw.type !== TOKEN_TYPES.KEYWORD || coupKw.value !== "coupon") {
        errors.push({ message: `Expected 'coupon' after 'apply' at line ${coupKw.line}`, line: coupKw.line });
      } else { consume(); }
      const code = peek();
      if (code.type !== TOKEN_TYPES.STRING) {
        errors.push({ message: `Expected coupon code string at line ${code.line}`, line: code.line });
      } else { consume(); }
      if (!expect(TOKEN_TYPES.SEMICOLON)) {
        errors.push({ message: `Missing semicolon after apply coupon at line ${t.line}`, line: t.line });
      }
      continue;
    }

    // set <var> = <value>;  OR  set <var>.<field> = <value>;
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "set") {
      consume();
      const field = peek();
      if (field.type !== TOKEN_TYPES.KEYWORD && field.type !== TOKEN_TYPES.IDENTIFIER) {
        errors.push({ message: `Expected identifier after 'set' at line ${field.line}`, line: field.line });
      } else { consume(); }
      // Optional dot-access
      if (peek().type === TOKEN_TYPES.DOT) {
        consume(); // .
        const prop = peek();
        if (prop.type !== TOKEN_TYPES.IDENTIFIER) {
          errors.push({ message: `Expected field name after '.' at line ${prop.line}`, line: prop.line });
        } else { consume(); }
      }
      if (!expect(TOKEN_TYPES.ASSIGN)) {
        errors.push({ message: `Expected '=' in set command at line ${peek().line}`, line: peek().line });
      }
      const val = peek();
      if (val.type !== TOKEN_TYPES.NUMBER && val.type !== TOKEN_TYPES.STRING && val.type !== TOKEN_TYPES.BOOLEAN) {
        errors.push({ message: `Expected value after '=' in set command at line ${val.line}`, line: val.line });
      } else { consume(); }
      if (!expect(TOKEN_TYPES.SEMICOLON)) {
        errors.push({ message: `Missing semicolon after set command at line ${t.line}`, line: t.line });
      }
      continue;
    }

    // checkout;
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "checkout") {
      consume();
      if (!expect(TOKEN_TYPES.SEMICOLON)) {
        errors.push({ message: `Missing semicolon after 'checkout' at line ${t.line}`, line: t.line });
      }
      continue;
    }

    errors.push({ message: `Unknown statement '${t.value}' at line ${t.line}`, line: t.line });
    consume();
  }

  return errors;
}

// ---------------------------------------------------------------------------
// INTERPRETER / EXECUTOR
// ---------------------------------------------------------------------------
export function interpret(source: string, catalog?: RuntimeInventoryProduct[], coupons?: RuntimeCoupon[]): InterpreterResult {
  const { tokens, errors: lexErrors } = tokenize(source);
  if (usesStructuredRuntime(source)) {
    return interpretStructured(source, tokens, lexErrors, catalog, coupons);
  }
  const syntaxErrors = checkSyntax(tokens);
  const runtimeInventory = catalog
    ? new Map(catalog.map(product => [product.name, product]))
    : new Map(Object.entries(INVENTORY).map(([name, product]) => [name, { name, price: product.price, stock: Number.POSITIVE_INFINITY, inStock: true }]));
  const runtimeCoupons = createCouponMap(coupons);

  const semanticErrors: SemanticError[] = [];
  const cart: CartItem[] = [];
  const variables: VariableEntry[] = [];
  const classes: ClassDefinition[] = [];
  const instances: Record<string, ObjectInstance> = {};
  const logs: string[] = [];
  let coupon: string | null = null;
  let discount = 0;
  let shipping = 0;
  let user: string | null = null;
  let didCheckout = false;

  const now = new Date();
  const ts = `[${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}]`;

  logs.push(`${ts} Program started.`);

  if (syntaxErrors.length === 0 && lexErrors.length === 0) {
    let i = 0;
    const peek = () => tokens[i];
    const consume = () => tokens[i++];

    while (i < tokens.length && peek().type !== TOKEN_TYPES.EOF) {
      const t = peek();

      // class definition
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "class") {
        consume();
        const className = consume().value;
        consume(); // {
        const fields: Record<string, { type: string; value: string }> = {};
        while (i < tokens.length && peek().type !== TOKEN_TYPES.RBRACE && peek().type !== TOKEN_TYPES.EOF) {
          const fieldName = consume().value;
          consume(); // =
          const valToken = consume();
          consume(); // ;
          const valType = valToken.type === TOKEN_TYPES.STRING ? "string"
            : valToken.type === TOKEN_TYPES.BOOLEAN ? "boolean"
            : "number";
          fields[fieldName] = { type: valType, value: valToken.value };
        }
        consume(); // }
        classes.push({ name: className, fields });
        logs.push(`${ts} Class '${className}' defined with ${Object.keys(fields).length} field(s): ${Object.keys(fields).join(", ")}`);
        continue;
      }

      // let declaration
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "let") {
        consume();
        const identToken = consume();
        const varName = identToken.value;
        consume(); // =
        const val = peek();

        if (val.type === TOKEN_TYPES.KEYWORD && val.value === "new") {
          consume(); // new
          const classNameToken = consume();
          const className = classNameToken.value;
          consume(); // ;

          const classDef = classes.find(c => c.name === className);
          if (!classDef) {
            semanticErrors.push({ message: `Class '${className}' is not defined`, line: classNameToken.line });
          } else {
            const instance: ObjectInstance = {
              className,
              fields: { ...JSON.parse(JSON.stringify(classDef.fields)) },
            };
            instances[varName] = instance;
            const fieldSummary = Object.entries(instance.fields)
              .map(([k, v]) => `${k}=${v.type === "string" ? `"${v.value}"` : v.value}`)
              .join(", ");
            variables.push({ name: varName, type: `${className} instance`, value: `{${fieldSummary}}` });
            logs.push(`${ts} Instance '${varName}' created from class '${className}'`);
          }
        } else {
          let varType = "unknown", varValue = "";
          if (val.type === TOKEN_TYPES.STRING) {
            varType = "string"; varValue = `"${val.value}"`;
            if (varName === "user") user = val.value;
            consume();
          } else if (val.type === TOKEN_TYPES.NUMBER) {
            varType = "number"; varValue = val.value; consume();
          } else if (val.type === TOKEN_TYPES.BOOLEAN) {
            varType = "boolean"; varValue = val.value; consume();
          } else if (val.type === TOKEN_TYPES.LBRACKET) {
            consume(); consume(); varType = "list"; varValue = "[]";
          }
          consume(); // ;
          const existing = variables.findIndex(v => v.name === varName);
          if (existing >= 0) variables[existing] = { name: varName, type: varType, value: varValue };
          else variables.push({ name: varName, type: varType, value: varValue });
          logs.push(`${ts} Variable '${varName}' = ${varValue}`);
        }
        continue;
      }


      // runtime product declaration: product "Name" @ price stock qty;
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "product") {
        consume();
        const nameToken = consume();
        consume(); // @
        const priceToken = consume();
        consume(); // stock
        const stockToken = consume();
        consume(); // ;
        const productName = nameToken.value;
        const price = parseFloat(priceToken.value);
        const stock = parseFloat(stockToken.value);
        if (runtimeInventory.has(productName)) {
          semanticErrors.push({ message: `Product "${productName}" already exists in inventory`, line: nameToken.line });
        } else if (isNaN(price) || price < 0) {
          semanticErrors.push({ message: "Product price must be a valid non-negative number", line: priceToken.line });
        } else if (!Number.isInteger(stock) || stock < 0) {
          semanticErrors.push({ message: "Product stock must be a non-negative whole number", line: stockToken.line });
        } else {
          runtimeInventory.set(productName, { name: productName, price, stock, inStock: stock > 0 });
          logs.push(`${ts} Runtime product "${productName}" registered @ $${price.toFixed(2)} with ${stock} unit(s)`);
        }
        continue;
      }
      // add command (string form or instance form)
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "add") {
        consume();
        const nameOrVar = peek();

        if (nameOrVar.type === TOKEN_TYPES.STRING) {
          // add "Product Name" qty @ price [override];
          consume();
          const productName = nameOrVar.value;
          const qtyToken = consume();
          const qty = parseFloat(qtyToken.value);
          consume(); // @
          const priceToken = consume();
          const price = parseFloat(priceToken.value);
          const allowPriceOverride = peek().type === TOKEN_TYPES.KEYWORD && peek().value === "override";
          if (allowPriceOverride) consume();
          consume(); // ;

          const inventoryProduct = runtimeInventory.get(productName);
          const existingCartQuantity = cart.find(item => item.name === productName)?.quantity ?? 0;
          if (!inventoryProduct && !isCustomProduct(instances, productName)) {
            semanticErrors.push({ message: `Product "${productName}" not found in inventory`, line: nameOrVar.line });
          } else if (inventoryProduct && (!inventoryProduct.inStock || inventoryProduct.stock === 0)) {
            semanticErrors.push({ message: 'Product "' + productName + '" is unavailable', line: nameOrVar.line });
          } else if (isNaN(qty) || qty <= 0) {
            semanticErrors.push({ message: `Quantity must be > 0`, line: qtyToken.line });
          } else if (!Number.isInteger(qty)) {
            semanticErrors.push({ message: 'Quantity must be a whole number', line: qtyToken.line });
          } else if (inventoryProduct && existingCartQuantity + qty > inventoryProduct.stock) {
            semanticErrors.push({ message: 'Only ' + Math.max(0, inventoryProduct.stock - existingCartQuantity) + ' additional unit(s) of "' + productName + '" are available', line: qtyToken.line });
          } else if (isNaN(price) || price < 0) {
            semanticErrors.push({ message: `Price must be a valid non-negative number`, line: priceToken.line });
          } else if (inventoryProduct && Math.abs(price - inventoryProduct.price) > 0.005 && !allowPriceOverride) {
            semanticErrors.push({ message: 'Price mismatch for "' + productName + '". Expected $' + inventoryProduct.price.toFixed(2) + ', received $' + price.toFixed(2) + '. Add override after the price to use a manual sale price.', line: priceToken.line });
          } else {
            addToCart(cart, productName, qty, price);
            logs.push(`${ts} Added "${productName}" x${qty} @ $${price.toFixed(2)}${allowPriceOverride ? " (price override)" : ""}`);
            updateCartVar(variables, cart);
          }
        } else if (nameOrVar.type === TOKEN_TYPES.IDENTIFIER) {
          // add instanceVar qty;
          consume();
          const varName = nameOrVar.value;
          const qtyToken = consume();
          const qty = parseFloat(qtyToken.value);
          consume(); // ;

          const instance = instances[varName];
          if (!instance) {
            semanticErrors.push({ message: `'${varName}' is not a defined object instance`, line: nameOrVar.line });
          } else {
            const nameField = instance.fields["name"];
            const priceField = instance.fields["price"];
            if (!nameField || !priceField) {
              semanticErrors.push({ message: `Instance '${varName}' must have 'name' and 'price' fields to be added to cart`, line: nameOrVar.line });
            } else if (isNaN(qty) || qty <= 0) {
              semanticErrors.push({ message: `Quantity must be > 0`, line: qtyToken.line });
            } else {
              const price = parseFloat(priceField.value);
              const productName = nameField.value;
              addToCart(cart, productName, qty, price);
              logs.push(`${ts} Added instance '${varName}' ("${productName}") x${qty} @ $${price.toFixed(2)}`);
              updateCartVar(variables, cart);
            }
          }
        } else {
          consume(); consume(); // skip
        }
        continue;
      }

      // legacy runtime coupon declaration
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "coupon") {
        consume();
        const codeToken = consume();
        const rateToken = consume();
        const hasPercent = peek().type === TOKEN_TYPES.OPERATOR && peek().value === "%";
        if (hasPercent) consume();
        consume(); // ;
        const code = normalizeCouponCode(codeToken.value);
        const rawRate = parseFloat(rateToken.value);
        const couponDiscount = hasPercent ? rawRate / 100 : rawRate;
        if (!code) {
          semanticErrors.push({ message: "Coupon code cannot be empty", line: codeToken.line });
        } else if (runtimeCoupons.has(code)) {
          semanticErrors.push({ message: "Coupon \"" + code + "\" already exists", line: codeToken.line });
        } else if (!Number.isFinite(couponDiscount) || couponDiscount < 0 || couponDiscount > 0.95) {
          semanticErrors.push({ message: "Coupon discount must be from 0% to 95%", line: rateToken.line });
        } else {
          runtimeCoupons.set(code, couponDiscount);
          logs.push(ts + " Runtime coupon \"" + code + "\" registered (" + (couponDiscount * 100).toFixed(0) + "% off)");
        }
        continue;
      }

      // apply coupon
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "apply") {
        consume(); consume(); // apply coupon
        const codeToken = consume();
        consume(); // ;
        const code = normalizeCouponCode(codeToken.value);
        const couponDiscount = runtimeCoupons.get(code);
        if (couponDiscount === undefined) {
          semanticErrors.push({ message: "Invalid coupon code \"" + codeToken.value + "\"", line: codeToken.line });
        } else {
          coupon = code;
          discount = couponDiscount;
          logs.push(ts + " Coupon \"" + code + "\" applied (" + (discount * 100).toFixed(0) + "% off)");
        }
        continue;
      }

      // set (including instance field assignment)
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "set") {
        consume();
        const fieldToken = consume();
        const varName = fieldToken.value;

        if (peek().type === TOKEN_TYPES.DOT) {
          consume(); // .
          const propToken = consume();
          const propName = propToken.value;
          consume(); // =
          const valToken = consume();
          consume(); // ;

          const instance = instances[varName];
          if (!instance) {
            semanticErrors.push({ message: `'${varName}' is not a defined object instance`, line: fieldToken.line });
          } else {
            const valType = valToken.type === TOKEN_TYPES.STRING ? "string"
              : valToken.type === TOKEN_TYPES.BOOLEAN ? "boolean"
              : "number";
            instance.fields[propName] = { type: valType, value: valToken.value };
            // Update variable display
            const fieldSummary = Object.entries(instance.fields)
              .map(([k, v]) => `${k}=${v.type === "string" ? `"${v.value}"` : v.value}`)
              .join(", ");
            const varIdx = variables.findIndex(v => v.name === varName);
            if (varIdx >= 0) variables[varIdx].value = `{${fieldSummary}}`;
            logs.push(`${ts} Set '${varName}.${propName}' = ${valToken.type === "string" ? `"${valToken.value}"` : valToken.value}`);
          }
        } else {
          consume(); // =
          const valToken = consume();
          consume(); // ;
          const numVal = parseFloat(valToken.value);
          if (varName === "shipping") {
            if (isNaN(numVal) || numVal < 0) {
              semanticErrors.push({ message: `Shipping must be a valid non-negative number`, line: valToken.line });
            } else {
              shipping = numVal;
              logs.push(`${ts} Shipping set to $${numVal.toFixed(2)}`);
            }
          }
          const existing = variables.findIndex(v => v.name === varName);
          if (existing >= 0) variables[existing].value = valToken.value;
          else variables.push({ name: varName, type: "number", value: valToken.value });
        }
        continue;
      }

      // checkout
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "checkout") {
        consume(); consume(); // checkout ;
        if (cart.length === 0) {
          semanticErrors.push({ message: `Cannot checkout with an empty cart`, line: t.line });
        } else {
          didCheckout = true;
          logs.push(`${ts} Checkout completed.`);
        }
        continue;
      }

      consume();
    }
  } else {
    logs.push(`${ts} Execution halted due to errors.`);
  }

  const subtotal = cart.reduce((s, item) => s + item.price * item.quantity, 0);
  const discountAmt = subtotal * discount;
  const total = subtotal - discountAmt + shipping;

  if (didCheckout && semanticErrors.length === 0) {
    logs.push(`${ts} Order total: $${total.toFixed(2)}`);
  }

  return {
    tokens: tokens.filter(t => t.type !== TOKEN_TYPES.EOF),
    lexErrors,
    syntaxErrors,
    semanticErrors,
    cart,
    variables,
    classes,
    instances,
    logs,
    coupon,
    discount,
    shipping,
    subtotal,
    total,
    user,
    didCheckout,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StructuredValue = { type: string; value: unknown; objectId?: number; className?: string };
type StructuredBinding = { name: string; declaredType: string; value: StructuredValue; scopeId: number; depth: number };
type StructuredScope = { id: number; depth: number; parent?: StructuredScope; values: Map<string, StructuredBinding> };
type StructuredField = { access: "public" | "private"; declaredType: string; value: StructuredValue };
type StructuredMethod = { access: "public" | "private"; params: Array<{ name: string; type: string }>; body: SourceLine[] };
type StructuredClass = { name: string; fields: Record<string, StructuredField>; methods: Record<string, StructuredMethod> };
type StructuredObject = { id: number; className: string; fields: Record<string, StructuredField> };
type SourceLine = { text: string; line: number };

function usesStructuredRuntime(source: string): boolean {
  return /\b(int|float|string|bool|if|else|for|while|public|private|method)\b/.test(source);
}

function interpretStructured(source: string, tokens: Token[], lexErrors: LexError[], catalog?: RuntimeInventoryProduct[], coupons?: RuntimeCoupon[]): InterpreterResult {
  const runtimeInventory = catalog
    ? new Map(catalog.map(product => [product.name, product]))
    : new Map(Object.entries(INVENTORY).map(([name, product]) => [name, { name, price: product.price, stock: Number.POSITIVE_INFINITY, inStock: true }]));
  const semanticErrors: SemanticError[] = [];
  const syntaxErrors: SyntaxError[] = [];
  const cart: CartItem[] = [];
  const classes: ClassDefinition[] = [];
  const instances: Record<string, ObjectInstance> = {};
  const runtimeClasses = new Map<string, StructuredClass>();
  const runtimeObjects = new Map<number, StructuredObject>();
  const scopes: StructuredScope[] = [];
  let nextScopeId = 1;
  let nextObjectId = 1;
  let coupon: string | null = null;
  let discount = 0;
  let shipping = 0;
  let user: string | null = null;
  let didCheckout = false;
  const now = new Date();
  const ts = `[${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}]`;
  const logs = [`${ts} Program started.`, `${ts} Structured runtime enabled.`];
  const runtimeCoupons = createCouponMap(coupons);
  const addError = (message: string, line: number) => semanticErrors.push({ message, line });
  const createScope = (parent?: StructuredScope): StructuredScope => {
    const scope = { id: nextScopeId++, depth: parent ? parent.depth + 1 : 0, parent, values: new Map<string, StructuredBinding>() };
    scopes.push(scope);
    return scope;
  };
  const globalScope = createScope();
  const lines = source.split(/\r?\n/).map((raw, index) => ({ text: stripLineComment(raw).trim(), line: index + 1 })).filter(line => line.text.length > 0);

  const display = (value: StructuredValue): string => {
    if (value.type === "string") return `"${String(value.value)}"`;
    if (value.type === "list") return Array.isArray(value.value) && value.value.length ? `(${value.value.length} items)` : "[]";
    if (value.type === "object") return `{${value.className} instance}`;
    if (typeof value.value === "number") return Number.isInteger(value.value) ? String(value.value) : value.value.toFixed(2);
    return String(value.value ?? "null");
  };
  const cloneValue = (value: StructuredValue): StructuredValue => ({ ...value, value: Array.isArray(value.value) ? [...value.value] : value.value });
  const inferType = (value: StructuredValue): string => value.type === "number" && typeof value.value === "number" ? (Number.isInteger(value.value) ? "int" : "float") : value.type;
  const coerce = (declaredType: string, value: StructuredValue, line: number): StructuredValue | null => {
    const type = declaredType === "let" ? inferType(value) : declaredType;
    if (type === "int" && (typeof value.value !== "number" || !Number.isInteger(value.value))) { addError("int requires a whole number", line); return null; }
    if (type === "float" && typeof value.value !== "number") { addError("float requires a numeric value", line); return null; }
    if (type === "string" && value.type !== "string") { addError("string requires a string value", line); return null; }
    if (type === "bool" && value.type !== "bool") { addError("bool requires true or false", line); return null; }
    return { ...value, type };
  };
  const findBinding = (scope: StructuredScope, name: string): StructuredBinding | null => {
    let current: StructuredScope | undefined = scope;
    while (current) {
      const binding = current.values.get(name);
      if (binding) return binding;
      current = current.parent;
    }
    return null;
  };
  const declareBinding = (scope: StructuredScope, name: string, declaredType: string, value: StructuredValue, line: number): void => {
    if (scope.values.has(name)) { addError(`Duplicate declaration '${name}' in scope ${scope.id}`, line); return; }
    const coerced = coerce(declaredType, value, line);
    if (!coerced) return;
    scope.values.set(name, { name, declaredType, value: coerced, scopeId: scope.id, depth: scope.depth });
    if (name === "user" && coerced.type === "string") user = String(coerced.value);
    logs.push(`${ts} Declared ${declaredType} '${name}' = ${display(coerced)} in scope ${scope.id}`);
  };
  const assignBinding = (scope: StructuredScope, name: string, value: StructuredValue, line: number): void => {
    const binding = findBinding(scope, name);
    if (!binding) { addError(`'${name}' is not declared`, line); return; }
    const coerced = coerce(binding.declaredType, value, line);
    if (!coerced) return;
    binding.value = coerced;
    if (name === "user" && coerced.type === "string") user = String(coerced.value);
    if (name === "shipping") shipping = typeof coerced.value === "number" && coerced.value >= 0 ? coerced.value : shipping;
    logs.push(`${ts} Set '${name}' = ${display(coerced)}`);
  };
  const objectFromValue = (value?: StructuredValue): StructuredObject | null => value?.type === "object" && typeof value.objectId === "number" ? runtimeObjects.get(value.objectId) ?? null : null;
  const readField = (scope: StructuredScope, target: string, field: string, line: number, thisObject: StructuredObject | null): StructuredValue => {
    const object = target === "this" ? thisObject : objectFromValue(findBinding(scope, target)?.value);
    if (!object) { addError(`'${target}' is not an object instance`, line); return { type: "unknown", value: null }; }
    const item = object.fields[field];
    if (!item) { addError(`Field '${field}' does not exist on ${object.className}`, line); return { type: "unknown", value: null }; }
    if (item.access === "private" && object !== thisObject) { addError(`Field '${field}' is private`, line); return { type: "unknown", value: null }; }
    return cloneValue(item.value);
  };
  const writeField = (scope: StructuredScope, target: string, field: string, value: StructuredValue, line: number, thisObject: StructuredObject | null): void => {
    const object = target === "this" ? thisObject : objectFromValue(findBinding(scope, target)?.value);
    if (!object) { addError(`'${target}' is not an object instance`, line); return; }
    const item = object.fields[field];
    if (!item) { addError(`Field '${field}' does not exist on ${object.className}`, line); return; }
    if (item.access === "private" && object !== thisObject) { addError(`Field '${field}' is private`, line); return; }
    const coerced = coerce(item.declaredType, value, line);
    if (coerced) item.value = coerced;
  };
  const evalExpr = (expr: string, scope: StructuredScope, line: number, thisObject: StructuredObject | null): StructuredValue => {
    const exprTokens = tokenize(expr).tokens.filter(token => token.type !== TOKEN_TYPES.EOF);
    let ei = 0;
    const peekExpr = () => exprTokens[ei];
    const matchOp = (...ops: string[]) => peekExpr()?.type === TOKEN_TYPES.OPERATOR && ops.includes(peekExpr().value) ? exprTokens[ei++] : null;
    const matchSym = (value: string) => peekExpr()?.type === TOKEN_TYPES.SYMBOL && peekExpr().value === value ? exprTokens[ei++] : null;
    const asNumber = (value: StructuredValue): number => typeof value.value === "number" ? value.value : (addError("Numeric expression expected", line), 0);
    const truthy = (value: StructuredValue): boolean => value.type === "bool" ? Boolean(value.value) : typeof value.value === "number" ? value.value !== 0 : Boolean(value.value);
    const binaryNumber = (left: StructuredValue, right: StructuredValue, op: string): StructuredValue => {
      const a = asNumber(left), b = asNumber(right);
      if (op === "/" && b === 0) { addError("Division by zero", line); return { type: "float", value: 0 }; }
      const result = op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : op === "/" ? a / b : a % b;
      return { type: Number.isInteger(result) ? "int" : "float", value: result };
    };
    const parsePrimary = (): StructuredValue => {
      const token = exprTokens[ei++];
      if (!token) return { type: "unknown", value: null };
      if (token.type === TOKEN_TYPES.NUMBER) { const value = Number(token.value); return { type: Number.isInteger(value) ? "int" : "float", value }; }
      if (token.type === TOKEN_TYPES.STRING) return { type: "string", value: token.value };
      if (token.type === TOKEN_TYPES.BOOLEAN) return { type: "bool", value: token.value === "true" };
      if (token.type === TOKEN_TYPES.SYMBOL && token.value === "(") { const value = parseOr(); matchSym(")"); return value; }
      if (token.type === TOKEN_TYPES.IDENTIFIER || token.type === TOKEN_TYPES.KEYWORD) {
        if (peekExpr()?.type === TOKEN_TYPES.DOT) { ei++; const field = exprTokens[ei++]; return readField(scope, token.value, field?.value ?? "", line, thisObject); }
        const binding = findBinding(scope, token.value);
        if (!binding) { addError(`'${token.value}' is not declared`, line); return { type: "unknown", value: null }; }
        return cloneValue(binding.value);
      }
      addError(`Invalid expression '${expr}'`, line);
      return { type: "unknown", value: null };
    };
    const parseUnary = (): StructuredValue => {
      const op = matchOp("!", "-");
      if (!op) return parsePrimary();
      const value = parseUnary();
      return op.value === "!" ? { type: "bool", value: !truthy(value) } : { type: value.type, value: -asNumber(value) };
    };
    const parseFactor = (): StructuredValue => { let left = parseUnary(); for (let op = matchOp("*", "/", "%"); op; op = matchOp("*", "/", "%")) left = binaryNumber(left, parseUnary(), op.value); return left; };
    const parseTerm = (): StructuredValue => { let left = parseFactor(); for (let op = matchOp("+", "-"); op; op = matchOp("+", "-")) { const right = parseFactor(); left = op.value === "+" && (left.type === "string" || right.type === "string") ? { type: "string", value: String(left.value) + String(right.value) } : binaryNumber(left, right, op.value); } return left; };
    const parseCompare = (): StructuredValue => { let left = parseTerm(); for (let op = matchOp("<", "<=", ">", ">="); op; op = matchOp("<", "<=", ">", ">=")) { const a = asNumber(left), b = asNumber(parseTerm()); left = { type: "bool", value: op.value === "<" ? a < b : op.value === "<=" ? a <= b : op.value === ">" ? a > b : a >= b }; } return left; };
    const parseEquality = (): StructuredValue => { let left = parseCompare(); for (let op = matchOp("==", "!="); op; op = matchOp("==", "!=")) { const right = parseCompare(); left = { type: "bool", value: op.value === "==" ? left.value === right.value : left.value !== right.value }; } return left; };
    const parseAnd = (): StructuredValue => { let left = parseEquality(); for (let op = matchOp("&&"); op; op = matchOp("&&")) left = { type: "bool", value: truthy(left) && truthy(parseEquality()) }; return left; };
    const parseOr = (): StructuredValue => { let left = parseAnd(); for (let op = matchOp("||"); op; op = matchOp("||")) left = { type: "bool", value: truthy(left) || truthy(parseAnd()) }; return left; };
    const value = parseOr();
    if (ei < exprTokens.length) addError(`Unexpected token '${exprTokens[ei].value}' in expression`, line);
    return value;
  };
  const findBlockEnd = (start: number): number => {
    let depth = 0;
    for (let i = start; i < lines.length; i++) {
      if (lines[i].text.includes("{")) depth++;
      if (lines[i].text.includes("}")) depth--;
      if (depth === 0) return i;
    }
    syntaxErrors.push({ message: `Expected closing brace for block at line ${lines[start].line}`, line: lines[start].line });
    return lines.length - 1;
  };
  const splitArgs = (value: string): string[] => value.trim() ? value.split(",").map(item => item.trim()).filter(Boolean) : [];
  const syncInstance = (name: string, value?: StructuredValue): void => {
    const object = objectFromValue(value);
    if (!object) return;
    instances[name] = {
      className: object.className,
      fields: Object.fromEntries(Object.entries(object.fields).map(([fieldName, field]) => [fieldName, { type: field.declaredType === "let" ? field.value.type : field.declaredType, value: display(field.value).replace(/^"|"$/g, "") }]))
    };
  };
  const createObject = (className: string, line: number): StructuredValue => {
    const cls = runtimeClasses.get(className);
    if (!cls) { addError(`Class '${className}' is not defined`, line); return { type: "unknown", value: null }; }
    const object: StructuredObject = { id: nextObjectId++, className, fields: {} };
    Object.entries(cls.fields).forEach(([name, field]) => object.fields[name] = { ...field, value: cloneValue(field.value) });
    runtimeObjects.set(object.id, object);
    return { type: "object", value: className, className, objectId: object.id };
  };
  const updateCartVar = (scope: StructuredScope): void => {
    const binding = findBinding(scope, "cart");
    if (binding) binding.value = { type: "list", value: cart.map(item => ({ ...item })) };
  };
  const runLines = (start: number, end: number, scope: StructuredScope, thisObject: StructuredObject | null): void => {
    for (let i = start; i <= end && i < lines.length; i++) {
      const item = lines[i];
      const text = item.text;
      if (text === "}" || text === "} else {") continue;
      const classMatch = text.match(/^class\s+(\w+)\s*\{$/);
      if (classMatch) {
        const blockEnd = findBlockEnd(i);
        const cls: StructuredClass = { name: classMatch[1], fields: {}, methods: {} };
        for (let j = i + 1; j < blockEnd; j++) {
          const bodyLine = lines[j];
          const methodMatch = bodyLine.text.match(/^(public|private)?\s*(?:void\s+)?method\s+(\w+)\s*\(([^)]*)\)\s*\{$/);
          if (methodMatch) {
            const methodEnd = findBlockEnd(j);
            cls.methods[methodMatch[2]] = {
              access: (methodMatch[1] as "public" | "private") || "public",
              params: splitArgs(methodMatch[3]).map(raw => {
                const parts = raw.split(/\s+/);
                return parts.length === 2 ? { type: parts[0], name: parts[1] } : { type: "let", name: parts[0] };
              }),
              body: lines.slice(j + 1, methodEnd),
            };
            j = methodEnd;
            continue;
          }
          const fieldMatch = bodyLine.text.match(/^(public|private)?\s*(?:(let|int|float|string|bool)\s+)?(\w+)\s*=\s*(.+);$/);
          if (fieldMatch) {
            const access = (fieldMatch[1] as "public" | "private") || "public";
            const declaredType = fieldMatch[2] || "let";
            const value = coerce(declaredType, evalExpr(fieldMatch[4], scope, bodyLine.line, null), bodyLine.line);
            if (value) cls.fields[fieldMatch[3]] = { access, declaredType, value };
          }
        }
        runtimeClasses.set(cls.name, cls);
        classes.push({ name: cls.name, fields: Object.fromEntries(Object.entries(cls.fields).map(([name, field]) => [name, { type: field.declaredType === "let" ? field.value.type : field.declaredType, value: display(field.value).replace(/^"|"$/g, "") }])) });
        logs.push(`${ts} Class '${cls.name}' defined with ${Object.keys(cls.fields).length} field(s) and ${Object.keys(cls.methods).length} method(s)`);
        i = blockEnd;
        continue;
      }
      const ifMatch = text.match(/^if\s*\((.+)\)\s*\{$/);
      if (ifMatch) {
        const thenEnd = findBlockEnd(i);
        const hasElse = lines[thenEnd + 1]?.text === "else {" || lines[thenEnd + 1]?.text === "} else {";
        const elseStart = hasElse ? thenEnd + 1 : -1;
        const elseEnd = hasElse ? findBlockEnd(elseStart) : -1;
        if (Boolean(evalExpr(ifMatch[1], scope, item.line, thisObject).value)) runLines(i + 1, thenEnd - 1, createScope(scope), thisObject);
        else if (hasElse) runLines(elseStart + 1, elseEnd - 1, createScope(scope), thisObject);
        i = hasElse ? elseEnd : thenEnd;
        continue;
      }
      const whileMatch = text.match(/^while\s*\((.+)\)\s*\{$/);
      if (whileMatch) {
        const blockEnd = findBlockEnd(i);
        const loopScope = createScope(scope);
        let count = 0;
        while (Boolean(evalExpr(whileMatch[1], loopScope, item.line, thisObject).value)) {
          if (++count > 100) { addError("Loop safety limit of 100 iterations exceeded", item.line); break; }
          runLines(i + 1, blockEnd - 1, createScope(loopScope), thisObject);
        }
        logs.push(`${ts} while loop executed ${count} iteration(s)`);
        i = blockEnd;
        continue;
      }
      const forMatch = text.match(/^for\s*\((.*);(.*);(.*)\)\s*\{$/);
      if (forMatch) {
        const blockEnd = findBlockEnd(i);
        const loopScope = createScope(scope);
        runSingle(forMatch[1].trim() + ";", item.line, loopScope, thisObject);
        let count = 0;
        while (!forMatch[2].trim() || Boolean(evalExpr(forMatch[2].trim(), loopScope, item.line, thisObject).value)) {
          if (++count > 100) { addError("Loop safety limit of 100 iterations exceeded", item.line); break; }
          runLines(i + 1, blockEnd - 1, createScope(loopScope), thisObject);
          runSingle(forMatch[3].trim() + ";", item.line, loopScope, thisObject);
        }
        logs.push(`${ts} for loop executed ${count} iteration(s)`);
        i = blockEnd;
        continue;
      }
      runSingle(text, item.line, scope, thisObject);
    }
  };
  const runSingle = (text: string, line: number, scope: StructuredScope, thisObject: StructuredObject | null): void => {
    const decl = text.match(/^(let|int|float|string|bool)\s+(\w+)\s*=\s*(.+);$/);
    if (decl) {
      const expr = decl[3].trim();
      const newMatch = expr.match(/^new\s+(\w+)$/);
      const value = newMatch ? createObject(newMatch[1], line) : expr === "[]" ? { type: "list", value: [] } : evalExpr(expr, scope, line, thisObject);
      declareBinding(scope, decl[2], decl[1], value, line);
      syncInstance(decl[2], findBinding(scope, decl[2])?.value);
      return;
    }
    const assign = text.match(/^(?:set\s+)?([\w.]+)\s*=\s*(.+);$/);
    if (assign) {
      const value = evalExpr(assign[2], scope, line, thisObject);
      const target = assign[1];
      if (target.includes(".")) {
        const [base, field] = target.split(".");
        writeField(scope, base, field, value, line, thisObject);
        syncInstance(base, findBinding(scope, base)?.value);
      } else assignBinding(scope, target, value, line);
      return;
    }
    const call = text.match(/^(\w+)\.(\w+)\((.*)\);$/);
    if (call) {
      const binding = findBinding(scope, call[1]);
      const object = objectFromValue(binding?.value);
      const cls = object ? runtimeClasses.get(object.className) : null;
      const method = cls?.methods[call[2]];
      if (!object) { addError(`'${call[1]}' is not an object instance`, line); return; }
      if (!method) { addError(`Method '${call[2]}' does not exist on ${object.className}`, line); return; }
      if (method.access === "private") { addError(`Method '${call[2]}' is private`, line); return; }
      const args = splitArgs(call[3]);
      if (args.length !== method.params.length) { addError(`Method '${call[2]}' expects ${method.params.length} argument(s)`, line); return; }
      const methodScope = createScope(scope);
      method.params.forEach((param, index) => declareBinding(methodScope, param.name, param.type, evalExpr(args[index], scope, line, thisObject), line));
      const saved = lines.splice(0, lines.length, ...method.body);
      runLines(0, method.body.length - 1, methodScope, object);
      lines.splice(0, lines.length, ...saved);
      syncInstance(call[1], binding?.value);
      logs.push(`${ts} Method '${call[1]}.${call[2]}' executed`);
      return;
    }

    const productDecl = text.match(/^product\s+"([^"]+)"\s+@\s+(.+?)\s+stock\s+(.+);$/);
    if (productDecl) {
      const productName = productDecl[1];
      const price = Number(evalExpr(productDecl[2], scope, line, thisObject).value);
      const stock = Number(evalExpr(productDecl[3], scope, line, thisObject).value);
      if (runtimeInventory.has(productName)) addError(`Product "${productName}" already exists in inventory`, line);
      else if (isNaN(price) || price < 0) addError("Product price must be a valid non-negative number", line);
      else if (!Number.isInteger(stock) || stock < 0) addError("Product stock must be a non-negative whole number", line);
      else { runtimeInventory.set(productName, { name: productName, price, stock, inStock: stock > 0 }); logs.push(`${ts} Runtime product "${productName}" registered @ $${price.toFixed(2)} with ${stock} unit(s)`); }
      return;
    }
    const addProduct = text.match(/^add\s+"([^"]+)"\s+(.+)\s+@\s+(.+?)(\s+override)?;$/);
    if (addProduct) {
      const productName = addProduct[1];
      const qty = Number(evalExpr(addProduct[2], scope, line, thisObject).value);
      const price = Number(evalExpr(addProduct[3], scope, line, thisObject).value);
      const inventoryProduct = runtimeInventory.get(productName);
      const existingQty = cart.find(item => item.name === productName)?.quantity ?? 0;
      if (!inventoryProduct && !isCustomProduct(instances, productName)) addError(`Product "${productName}" not found in inventory`, line);
      else if (inventoryProduct && (!inventoryProduct.inStock || inventoryProduct.stock === 0)) addError(`Product "${productName}" is unavailable`, line);
      else if (!Number.isInteger(qty) || qty <= 0) addError("Quantity must be a positive whole number", line);
      else if (inventoryProduct && existingQty + qty > inventoryProduct.stock) addError(`Only ${Math.max(0, inventoryProduct.stock - existingQty)} additional unit(s) of "${productName}" are available`, line);
      else if (isNaN(price) || price < 0) addError("Price must be a valid non-negative number", line);
      else if (inventoryProduct && Math.abs(price - inventoryProduct.price) > 0.005 && !addProduct[4]) addError(`Price mismatch for "${productName}". Expected $${inventoryProduct.price.toFixed(2)}, received $${price.toFixed(2)}. Add override after the price to use a manual sale price.`, line);
      else { addToCart(cart, productName, qty, price); updateCartVar(scope); logs.push(`${ts} Added "${productName}" x${qty} @ $${price.toFixed(2)}`); }
      return;
    }
    const addObject = text.match(/^add\s+(\w+)\s+(.+);$/);
    if (addObject) {
      const binding = findBinding(scope, addObject[1]);
      const object = objectFromValue(binding?.value);
      const qty = Number(evalExpr(addObject[2], scope, line, thisObject).value);
      if (!object) { addError(`'${addObject[1]}' is not a defined object instance`, line); return; }
      const nameField = object.fields.name, priceField = object.fields.price;
      if (!nameField || !priceField || nameField.access === "private" || priceField.access === "private") addError(`Instance '${addObject[1]}' must have public name and price fields`, line);
      else { addToCart(cart, String(nameField.value.value), qty, Number(priceField.value.value)); updateCartVar(scope); }
      return;
    }
    const couponDecl = text.match(/^coupon\s+"([^"]+)"\s+(.+?)(?:\s*%)?;$/);
    if (couponDecl) {
      const hasPercent = /%\s*;$/.test(text);
      const code = normalizeCouponCode(couponDecl[1]);
      const rawRate = Number(evalExpr(couponDecl[2], scope, line, thisObject).value);
      const couponDiscount = hasPercent ? rawRate / 100 : rawRate;
      if (!code) addError("Coupon code cannot be empty", line);
      else if (runtimeCoupons.has(code)) addError("Coupon \"" + code + "\" already exists", line);
      else if (!Number.isFinite(couponDiscount) || couponDiscount < 0 || couponDiscount > 0.95) addError("Coupon discount must be from 0% to 95%", line);
      else { runtimeCoupons.set(code, couponDiscount); logs.push(ts + " Runtime coupon \"" + code + "\" registered"); }
      return;
    }
    const apply = text.match(/^apply\s+coupon\s+"([^"]+)";$/);
    if (apply) {
      const code = normalizeCouponCode(apply[1]);
      const couponDiscount = runtimeCoupons.get(code);
      if (couponDiscount === undefined) addError("Invalid coupon code \"" + apply[1] + "\"", line);
      else { coupon = code; discount = couponDiscount; logs.push(ts + " Coupon \"" + code + "\" applied"); }
      return;
    }
    if (text === "checkout;") { if (cart.length === 0) addError("Cannot checkout with an empty cart", line); else { didCheckout = true; logs.push(`${ts} Checkout completed.`); } return; }
    if (!text.includes("{")) syntaxErrors.push({ message: `Unknown statement '${text}' at line ${line}`, line });
  };
  if (lexErrors.length === 0) runLines(0, lines.length - 1, globalScope, null);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmt = subtotal * discount;
  const total = subtotal - discountAmt + shipping;
  if (didCheckout && semanticErrors.length === 0) logs.push(`${ts} Order total: $${total.toFixed(2)}`);
  const variables: VariableEntry[] = [];
  scopes.forEach(scope => scope.values.forEach(binding => variables.push({ name: scope.depth === 0 ? binding.name : `${binding.name} @scope${scope.id}`, type: binding.declaredType === "let" ? binding.value.type : binding.declaredType, value: display(binding.value) })));
  return { tokens: tokens.filter(token => token.type !== TOKEN_TYPES.EOF), lexErrors, syntaxErrors, semanticErrors, cart, variables, classes, instances, logs, coupon, discount, shipping, subtotal, total, user, didCheckout };
}
function stripLineComment(line: string): string {
  const index = line.indexOf("//");
  return index >= 0 ? line.slice(0, index) : line;
}
function addToCart(cart: CartItem[], name: string, qty: number, price: number) {
  const existing = cart.findIndex(c => c.name === name);
  if (existing >= 0) cart[existing].quantity += qty;
  else cart.push({ name, quantity: qty, price });
}

function updateCartVar(variables: VariableEntry[], cart: CartItem[]) {
  const cartVar = variables.findIndex(v => v.name === "cart");
  if (cartVar >= 0) variables[cartVar].value = `(${cart.length} items)`;
}

function isCustomProduct(instances: Record<string, ObjectInstance>, name: string): boolean {
  return Object.values(instances).some(
    inst => inst.fields["name"]?.value === name
  );
}
