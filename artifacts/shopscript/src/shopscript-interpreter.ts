
// =============================================================================
// ShopScript Mini Language Interpreter
// Lexical Analysis → Syntax Analysis → Semantic Analysis → Execution
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

export interface InterpreterResult {
  tokens: Token[];
  lexErrors: LexError[];
  syntaxErrors: SyntaxError[];
  semanticErrors: SemanticError[];
  cart: CartItem[];
  variables: VariableEntry[];
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
const TOKEN_TYPES = {
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
  BOOLEAN: "boolean",
  EOF: "eof",
};

const KEYWORDS = new Set([
  "let", "add", "apply", "coupon", "set", "checkout",
  "if", "else", "for", "while", "class", "new", "true", "false",
  "shipping", "budget", "cart", "user",
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
    // Skip whitespace
    if (/\s/.test(source[pos])) {
      if (source[pos] === "\n") {
        line++;
        lineStart = pos + 1;
      }
      pos++;
      continue;
    }

    // Comments //
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
    if (/[0-9]/.test(source[pos]) || (source[pos] === "." && /[0-9]/.test(source[pos + 1]))) {
      let num = "";
      while (pos < source.length && /[0-9.]/.test(source[pos])) {
        num += source[pos++];
      }
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: num, line, col: startCol });
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_]/.test(source[pos])) {
      let ident = "";
      while (pos < source.length && /[a-zA-Z0-9_]/.test(source[pos])) {
        ident += source[pos++];
      }
      if (ident === "true" || ident === "false") {
        tokens.push({ type: TOKEN_TYPES.BOOLEAN, value: ident, line, col: startCol });
      } else if (KEYWORDS.has(ident)) {
        tokens.push({ type: TOKEN_TYPES.KEYWORD, value: ident, line, col: startCol });
      } else {
        tokens.push({ type: TOKEN_TYPES.IDENTIFIER, value: ident, line, col: startCol });
      }
      continue;
    }

    // Single character tokens
    if (source[pos] === ";") {
      tokens.push({ type: TOKEN_TYPES.SEMICOLON, value: ";", line, col: startCol });
      pos++;
      continue;
    }
    if (source[pos] === "@") {
      tokens.push({ type: TOKEN_TYPES.AT, value: "@", line, col: startCol });
      pos++;
      continue;
    }
    if (source[pos] === "=") {
      tokens.push({ type: TOKEN_TYPES.ASSIGN, value: "=", line, col: startCol });
      pos++;
      continue;
    }
    if (source[pos] === "[") {
      tokens.push({ type: TOKEN_TYPES.LBRACKET, value: "[", line, col: startCol });
      pos++;
      continue;
    }
    if (source[pos] === "]") {
      tokens.push({ type: TOKEN_TYPES.RBRACKET, value: "]", line, col: startCol });
      pos++;
      continue;
    }
    if (["+", "-", "*", "/", "%", "<", ">", "!", "&", "|"].includes(source[pos])) {
      tokens.push({ type: TOKEN_TYPES.OPERATOR, value: source[pos], line, col: startCol });
      pos++;
      continue;
    }
    if (["(", ")", "{", "}", ",", "."].includes(source[pos])) {
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
    if (t.type === type && (value === undefined || t.value === value)) {
      consume();
      return true;
    }
    return false;
  };

  while (i < tokens.length && peek().type !== TOKEN_TYPES.EOF) {
    const t = peek();

    // let <ident> = <value>;
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "let") {
      consume();
      const ident = peek();
      if (ident.type !== TOKEN_TYPES.IDENTIFIER && ident.type !== TOKEN_TYPES.KEYWORD) {
        errors.push({ message: `Expected identifier after 'let' at line ${ident.line}`, line: ident.line });
      } else {
        consume();
      }
      if (!expect(TOKEN_TYPES.ASSIGN)) {
        errors.push({ message: `Expected '=' in let declaration at line ${peek().line}`, line: peek().line });
      }
      // value: string, number, or []
      const val = peek();
      if (val.type === TOKEN_TYPES.STRING || val.type === TOKEN_TYPES.NUMBER || val.type === TOKEN_TYPES.BOOLEAN) {
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

    // add "<product>" <qty> @ <price>;
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "add") {
      consume();
      const name = peek();
      if (name.type !== TOKEN_TYPES.STRING) {
        errors.push({ message: `Expected product name string after 'add' at line ${name.line}`, line: name.line });
      } else {
        consume();
      }
      const qty = peek();
      if (qty.type !== TOKEN_TYPES.NUMBER) {
        errors.push({ message: `Expected quantity number at line ${qty.line}`, line: qty.line });
      } else {
        consume();
      }
      if (!expect(TOKEN_TYPES.AT)) {
        errors.push({ message: `Expected '@' in add command at line ${peek().line}`, line: peek().line });
      }
      const price = peek();
      if (price.type !== TOKEN_TYPES.NUMBER) {
        errors.push({ message: `Expected price number after '@' at line ${price.line}`, line: price.line });
      } else {
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
      } else {
        consume();
      }
      const code = peek();
      if (code.type !== TOKEN_TYPES.STRING) {
        errors.push({ message: `Expected coupon code string at line ${code.line}`, line: code.line });
      } else {
        consume();
      }
      if (!expect(TOKEN_TYPES.SEMICOLON)) {
        errors.push({ message: `Missing semicolon after apply coupon at line ${peek().line}`, line: peek().line });
      }
      continue;
    }

    // set shipping = <value>;
    if (t.type === TOKEN_TYPES.KEYWORD && t.value === "set") {
      consume();
      const field = peek();
      if (field.type !== TOKEN_TYPES.KEYWORD && field.type !== TOKEN_TYPES.IDENTIFIER) {
        errors.push({ message: `Expected identifier after 'set' at line ${field.line}`, line: field.line });
      } else {
        consume();
      }
      if (!expect(TOKEN_TYPES.ASSIGN)) {
        errors.push({ message: `Expected '=' after 'set ${field.value}' at line ${peek().line}`, line: peek().line });
      }
      const val = peek();
      if (val.type !== TOKEN_TYPES.NUMBER && val.type !== TOKEN_TYPES.STRING) {
        errors.push({ message: `Expected value after '=' in set command at line ${val.line}`, line: val.line });
      } else {
        consume();
      }
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

    // Unknown statement
    errors.push({ message: `Unknown statement '${t.value}' at line ${t.line}`, line: t.line });
    consume();
  }

  return errors;
}

// ---------------------------------------------------------------------------
// SEMANTIC CHECKER & EXECUTOR
// ---------------------------------------------------------------------------
export function interpret(source: string): InterpreterResult {
  const { tokens, errors: lexErrors } = tokenize(source);
  const syntaxErrors = checkSyntax(tokens);

  const semanticErrors: SemanticError[] = [];
  const cart: CartItem[] = [];
  const variables: VariableEntry[] = [];
  const logs: string[] = [];
  let coupon: string | null = null;
  let discount = 0;
  let shipping = 0;
  let user: string | null = null;
  let didCheckout = false;

  const now = new Date();
  const timestamp = `[${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}]`;

  logs.push(`${timestamp} Program started successfully.`);

  // Only execute if no errors
  if (syntaxErrors.length === 0 && lexErrors.length === 0) {
    let i = 0;
    const peek = () => tokens[i];
    const consume = () => tokens[i++];

    while (i < tokens.length && peek().type !== TOKEN_TYPES.EOF) {
      const t = peek();

      // let declaration
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "let") {
        consume();
        const ident = consume();
        consume(); // =
        const val = peek();

        let varType = "unknown";
        let varValue = "";

        if (val.type === TOKEN_TYPES.STRING) {
          varType = "string";
          varValue = `"${val.value}"`;
          if (ident.value === "user") user = val.value;
          consume();
        } else if (val.type === TOKEN_TYPES.NUMBER) {
          varType = "number";
          varValue = val.value;
          consume();
        } else if (val.type === TOKEN_TYPES.BOOLEAN) {
          varType = "boolean";
          varValue = val.value;
          consume();
        } else if (val.type === TOKEN_TYPES.LBRACKET) {
          consume();
          consume(); // ]
          varType = "list";
          varValue = "[]";
        }

        consume(); // ;

        const existing = variables.findIndex(v => v.name === ident.value);
        if (existing >= 0) {
          variables[existing] = { name: ident.value, type: varType, value: varValue };
        } else {
          variables.push({ name: ident.value, type: varType, value: varValue });
        }
        logs.push(`${timestamp} Variable '${ident.value}' set to ${varValue}`);
        continue;
      }

      // add command
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "add") {
        consume();
        const nameToken = consume();
        const productName = nameToken.value;
        const qtyToken = consume();
        const qty = parseFloat(qtyToken.value);
        consume(); // @
        const priceToken = consume();
        const price = parseFloat(priceToken.value);
        consume(); // ;

        // Semantic checks
        if (!INVENTORY[productName]) {
          semanticErrors.push({
            message: `Product "${productName}" not found in inventory at line ${nameToken.line}`,
            line: nameToken.line,
          });
        }
        if (isNaN(qty) || qty <= 0) {
          semanticErrors.push({
            message: `Quantity must be greater than 0 at line ${qtyToken.line}`,
            line: qtyToken.line,
          });
        }
        if (isNaN(price) || price < 0) {
          semanticErrors.push({
            message: `Price must be a valid non-negative number at line ${priceToken.line}`,
            line: priceToken.line,
          });
        }

        if (semanticErrors.length === 0 || !semanticErrors.find(e => e.line === nameToken.line)) {
          const existing = cart.findIndex(c => c.name === productName);
          if (existing >= 0) {
            cart[existing].quantity += qty;
          } else {
            cart.push({ name: productName, quantity: qty, price });
          }
          logs.push(`${timestamp} Added "${productName}" x${qty} — $${price.toFixed(2)} each`);

          // Update cart variable
          const cartVar = variables.findIndex(v => v.name === "cart");
          if (cartVar >= 0) {
            variables[cartVar].value = `(${cart.length} items)`;
          }
        }
        continue;
      }

      // apply coupon
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "apply") {
        consume();
        consume(); // coupon
        const codeToken = consume();
        const code = codeToken.value;
        consume(); // ;

        if (COUPONS[code] === undefined) {
          semanticErrors.push({
            message: `Invalid coupon code "${code}" at line ${codeToken.line}`,
            line: codeToken.line,
          });
        } else {
          coupon = code;
          discount = COUPONS[code];
          logs.push(`${timestamp} Coupon "${code}" applied (${(discount * 100).toFixed(0)}% off)`);
        }
        continue;
      }

      // set <field> = <value>
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "set") {
        consume();
        const fieldToken = consume();
        consume(); // =
        const valToken = consume();
        consume(); // ;

        const numVal = parseFloat(valToken.value);
        if (fieldToken.value === "shipping") {
          if (isNaN(numVal) || numVal < 0) {
            semanticErrors.push({
              message: `Shipping must be a valid non-negative number at line ${valToken.line}`,
              line: valToken.line,
            });
          } else {
            shipping = numVal;
            logs.push(`${timestamp} Shipping set to $${numVal.toFixed(2)}`);
          }
        }

        const existing = variables.findIndex(v => v.name === fieldToken.value);
        if (existing >= 0) {
          variables[existing].value = valToken.value;
        } else {
          variables.push({ name: fieldToken.value, type: "number", value: valToken.value });
        }
        continue;
      }

      // checkout
      if (t.type === TOKEN_TYPES.KEYWORD && t.value === "checkout") {
        consume();
        consume(); // ;

        if (cart.length === 0) {
          semanticErrors.push({
            message: `Cannot checkout with an empty cart`,
            line: t.line,
          });
        } else {
          didCheckout = true;
          logs.push(`${timestamp} Checkout completed successfully.`);
        }
        continue;
      }

      consume(); // skip unknown in case of partial errors
    }
  } else {
    logs.push(`${timestamp} Execution halted due to errors.`);
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmt = subtotal * discount;
  const total = subtotal - discountAmt + shipping;

  if (didCheckout && semanticErrors.length === 0) {
    logs.push(`${timestamp} Order total: $${total.toFixed(2)}`);
  }

  return {
    tokens: tokens.filter(t => t.type !== TOKEN_TYPES.EOF),
    lexErrors,
    syntaxErrors,
    semanticErrors,
    cart,
    variables,
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
