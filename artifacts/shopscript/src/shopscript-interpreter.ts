
// =============================================================================
// ShopScript Mini Language Interpreter v0.2.0
// Lexical Analysis → Syntax Analysis → Semantic Analysis → Execution
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
  "Smartphone X": { price: 599.0, emoji: "📱" },
  "Wireless Earbuds": { price: 199.0, emoji: "🎧" },
  "Phone Case": { price: 29.0, emoji: "🛡️" },
  "Urban Backpack": { price: 49.0, emoji: "🎒" },
  Laptop: { price: 999.0, emoji: "💻" },
  "Smart Watch": { price: 299.0, emoji: "⌚" },
};

// ---------------------------------------------------------------------------
// COUPONS
// ---------------------------------------------------------------------------
const COUPONS: Record<string, number> = {
  SAVE10: 0.1,
  STUDENT10: 0.1,
  NONE: 0.0,
};

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
  "let", "add", "apply", "coupon", "set", "checkout",
  "if", "else", "for", "while", "class", "new", "true", "false",
  "shipping", "budget", "cart", "user", "return", "this",
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
          errors.push({ message: `Missing semicolon after field '${fieldName.value}' at line ${peek().line}`, line: peek().line });
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
        errors.push({ message: `Missing semicolon after let declaration at line ${peek().line}`, line: peek().line });
      }
      continue;
    }

    // add "<product>" <qty> @ <price>; OR add <instanceVar> <qty>;
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
        errors.push({ message: `Missing semicolon after add command at line ${peek().line}`, line: peek().line });
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
        errors.push({ message: `Missing semicolon after apply coupon at line ${peek().line}`, line: peek().line });
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
        errors.push({ message: `Missing semicolon after set command at line ${peek().line}`, line: peek().line });
      }
      continue;
    }

    // checkout;
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "checkout") {
      consume();
      if (!expect(TOKEN_TYPES.SEMICOLON)) {
        errors.push({ message: `Missing semicolon after 'checkout' at line ${peek().line}`, line: peek().line });
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
export function interpret(source: string): InterpreterResult {
  const { tokens, errors: lexErrors } = tokenize(source);
  const syntaxErrors = checkSyntax(tokens);

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

      // ── class definition ─────────────────────────────────────────────
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

      // ── let declaration ───────────────────────────────────────────────
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

      // ── add command (string form or instance form) ─────────────────────
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "add") {
        consume();
        const nameOrVar = peek();

        if (nameOrVar.type === TOKEN_TYPES.STRING) {
          // add "Product Name" qty @ price;
          consume();
          const productName = nameOrVar.value;
          const qtyToken = consume();
          const qty = parseFloat(qtyToken.value);
          consume(); // @
          const priceToken = consume();
          const price = parseFloat(priceToken.value);
          consume(); // ;

          if (!INVENTORY[productName] && !isCustomProduct(instances, productName)) {
            semanticErrors.push({ message: `Product "${productName}" not found in inventory`, line: nameOrVar.line });
          } else if (isNaN(qty) || qty <= 0) {
            semanticErrors.push({ message: `Quantity must be > 0`, line: qtyToken.line });
          } else if (isNaN(price) || price < 0) {
            semanticErrors.push({ message: `Price must be a valid non-negative number`, line: priceToken.line });
          } else {
            addToCart(cart, productName, qty, price);
            logs.push(`${ts} Added "${productName}" x${qty} @ $${price.toFixed(2)}`);
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

      // ── apply coupon ──────────────────────────────────────────────────
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "apply") {
        consume(); consume(); // apply coupon
        const codeToken = consume();
        consume(); // ;
        if (COUPONS[codeToken.value] === undefined) {
          semanticErrors.push({ message: `Invalid coupon code "${codeToken.value}"`, line: codeToken.line });
        } else {
          coupon = codeToken.value;
          discount = COUPONS[codeToken.value];
          logs.push(`${ts} Coupon "${codeToken.value}" applied (${(discount * 100).toFixed(0)}% off)`);
        }
        continue;
      }

      // ── set (including instance field assignment) ─────────────────────
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

      // ── checkout ──────────────────────────────────────────────────────
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
