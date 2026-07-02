import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject, type UIEvent } from "react";
import { createPortal } from "react-dom";

export type EditorTheme = "light" | "dark";

interface ShopScriptCodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRun?: () => void;
  theme: EditorTheme;
  editorRef?: RefObject<HTMLTextAreaElement | null>;
  className?: string;
  ariaLabel: string;
  errorLines?: number[];
  onCursorChange?: (position: { line: number; col: number }) => void;
  completionCatalog?: {
    products?: string[];
    coupons?: string[];
  };
}

type CompletionKind = "keyword" | "command" | "type" | "identifier" | "class" | "field" | "value" | "product" | "coupon";

interface CompletionItem {
  label: string;
  insertText: string;
  detail: string;
  kind: CompletionKind;
  priority: number;
  searchText?: string;
  quoted?: boolean;
}

interface CompletionContext {
  prefix: string;
  start: number;
  end: number;
  lineIndex: number;
  colIndex: number;
  inString: boolean;
}

interface CompletionState {
  items: CompletionItem[];
  activeIndex: number;
  context: CompletionContext;
}

const DECLARATION_KEYWORDS = new Set(["let", "int", "float", "string", "bool", "void"]);
const COMMAND_KEYWORDS = new Set(["product", "update", "add", "apply", "coupon", "set", "checkout", "override"]);
const CONTROL_KEYWORDS = new Set(["if", "else", "for", "while", "return"]);
const OOP_KEYWORDS = new Set(["class", "new", "public", "private", "method", "this"]);
const DOMAIN_KEYWORDS = new Set(["stock", "shipping", "budget", "cart", "user"]);
const ALL_KEYWORDS = new Set([
  ...DECLARATION_KEYWORDS,
  ...COMMAND_KEYWORDS,
  ...CONTROL_KEYWORDS,
  ...OOP_KEYWORDS,
  ...DOMAIN_KEYWORDS,
]);

const TOKEN_PATTERN = /("(?:\\.|[^"\\])*"|\/\/.*|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)?\b|[@=+\-*/%<>!&|]+|[{}\[\]();,.]|\s+|.)/g;

const BASE_COMPLETIONS: CompletionItem[] = [
  { label: "let", insertText: "let ", detail: "Declare a dynamically typed variable.", kind: "keyword", priority: 100 },
  { label: "int", insertText: "int ", detail: "Declare a whole-number variable.", kind: "type", priority: 92 },
  { label: "float", insertText: "float ", detail: "Declare a decimal-number variable.", kind: "type", priority: 92 },
  { label: "string", insertText: "string ", detail: "Declare a text variable.", kind: "type", priority: 92 },
  { label: "bool", insertText: "bool ", detail: "Declare a true or false variable.", kind: "type", priority: 92 },
  { label: "true", insertText: "true", detail: "Boolean true literal.", kind: "value", priority: 80 },
  { label: "false", insertText: "false", detail: "Boolean false literal.", kind: "value", priority: 80 },
  { label: "product", insertText: "product ", detail: "Register a product for this run.", kind: "command", priority: 90 },
  { label: "update product", insertText: "update product ", detail: "Override an existing catalog product for this run.", kind: "command", priority: 94 },
  { label: "add", insertText: "add ", detail: "Add a product or object instance to the cart.", kind: "command", priority: 95 },
  { label: "apply coupon", insertText: "apply coupon ", detail: "Apply a known coupon code.", kind: "command", priority: 96 },
  { label: "coupon", insertText: "coupon ", detail: "Create a runtime coupon for this program.", kind: "command", priority: 88 },
  { label: "set", insertText: "set ", detail: "Update shipping or an object field.", kind: "command", priority: 90 },
  { label: "set shipping", insertText: "set shipping = ", detail: "Set shipping before checkout.", kind: "command", priority: 97 },
  { label: "checkout", insertText: "checkout;", detail: "Complete the simulated order.", kind: "command", priority: 96 },
  { label: "override", insertText: "override", detail: "Allow an intentional manual product price.", kind: "keyword", priority: 72 },
  { label: "class", insertText: "class ", detail: "Define an object template with fields or methods.", kind: "keyword", priority: 94 },
  { label: "new", insertText: "new ", detail: "Create an instance from a class.", kind: "keyword", priority: 90 },
  { label: "public", insertText: "public ", detail: "Expose a class field or method.", kind: "keyword", priority: 78 },
  { label: "private", insertText: "private ", detail: "Hide a class field or method from outside access.", kind: "keyword", priority: 78 },
  { label: "method", insertText: "method ", detail: "Declare a class method in structured samples.", kind: "keyword", priority: 76 },
  { label: "this", insertText: "this", detail: "Reference the current object inside a method.", kind: "keyword", priority: 74 },
  { label: "if", insertText: "if () {\n  \n}", detail: "Run a block only when a condition is true.", kind: "keyword", priority: 82 },
  { label: "else", insertText: "else {\n  \n}", detail: "Fallback block after an if statement.", kind: "keyword", priority: 74 },
  { label: "for", insertText: "for (; ; ) {\n  \n}", detail: "Run a counted or condition-based loop.", kind: "keyword", priority: 82 },
  { label: "while", insertText: "while () {\n  \n}", detail: "Repeat a block while a condition is true.", kind: "keyword", priority: 82 },
  { label: "return", insertText: "return ", detail: "Return a value from a method.", kind: "keyword", priority: 74 },
  { label: "user", insertText: "user", detail: "Common customer-name variable.", kind: "identifier", priority: 72 },
  { label: "cart", insertText: "cart", detail: "Common cart list variable.", kind: "identifier", priority: 72 },
  { label: "budget", insertText: "budget", detail: "Common budget variable used in examples.", kind: "identifier", priority: 70 },
  { label: "shipping", insertText: "shipping", detail: "Shipping amount used in checkout totals.", kind: "identifier", priority: 70 },
  { label: "stock", insertText: "stock", detail: "Inventory availability field.", kind: "field", priority: 68 },
  { label: "price", insertText: "price", detail: "Product or object price field.", kind: "field", priority: 68 },
  { label: "name", insertText: "name", detail: "Product or object display name field.", kind: "field", priority: 68 },
  { label: "warranty", insertText: "warranty", detail: "Example OOP field for premium products.", kind: "field", priority: 62 },
  { label: '"Smartphone X"', insertText: "Smartphone X", detail: "Default inventory product.", kind: "product", priority: 66, searchText: "Smartphone X", quoted: true },
  { label: '"Wireless Earbuds"', insertText: "Wireless Earbuds", detail: "Default inventory product.", kind: "product", priority: 66, searchText: "Wireless Earbuds", quoted: true },
  { label: '"Phone Case"', insertText: "Phone Case", detail: "Default inventory product.", kind: "product", priority: 66, searchText: "Phone Case", quoted: true },
  { label: '"Urban Backpack"', insertText: "Urban Backpack", detail: "Default inventory product.", kind: "product", priority: 66, searchText: "Urban Backpack", quoted: true },
  { label: '"SAVE10"', insertText: "SAVE10", detail: "Default coupon code.", kind: "coupon", priority: 65, searchText: "SAVE10", quoted: true },
  { label: '"STUDENT10"', insertText: "STUDENT10", detail: "Default coupon code.", kind: "coupon", priority: 65, searchText: "STUDENT10", quoted: true },
  { label: '"NONE"', insertText: "NONE", detail: "No-discount coupon code.", kind: "coupon", priority: 60, searchText: "NONE", quoted: true },
];

function tokenStyle(token: string): string {
  if (token.startsWith("//")) return "comment";
  if (token.startsWith('"')) return "string";
  if (token === "true" || token === "false") return "boolean";
  if (DECLARATION_KEYWORDS.has(token)) return "keyword keyword-declaration";
  if (COMMAND_KEYWORDS.has(token)) return "keyword keyword-command";
  if (CONTROL_KEYWORDS.has(token)) return "keyword keyword-control";
  if (OOP_KEYWORDS.has(token)) return "keyword keyword-oop";
  if (DOMAIN_KEYWORDS.has(token)) return "keyword keyword-domain";
  if (ALL_KEYWORDS.has(token)) return "keyword";
  if (/^\d/.test(token)) return "number";
  if (/^[@=+\-*/%<>!&|]+$/.test(token)) return "operator";
  if (/^[{}\[\]();,.]$/.test(token)) return "punctuation";
  if (/^[A-Za-z_]/.test(token)) return "identifier";
  return "plain";
}

function HighlightedLine({ line, lineIndex, hasError }: { line: string; lineIndex: number; hasError: boolean }) {
  const tokens = line.match(TOKEN_PATTERN) ?? [line];
  return (
    <div className={"ide-highlight-line" + (hasError ? " has-error" : "")}>
      {tokens.map((token, tokenIndex) => (
        <span className={"syntax-" + tokenStyle(token)} key={lineIndex + "-" + tokenIndex}>{token}</span>
      ))}
      {line.length === 0 && <span>&nbsp;</span>}
    </div>
  );
}

function addCompletion(items: CompletionItem[], seen: Set<string>, item: CompletionItem) {
  const key = (item.searchText ?? item.label).toLowerCase() + "|" + item.kind;
  if (seen.has(key)) return;
  seen.add(key);
  items.push(item);
}

function buildDynamicCompletions(source: string): CompletionItem[] {
  const items: CompletionItem[] = [];
  const seen = new Set<string>();

  const declarations = /\b(?:let|int|float|string|bool)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  for (const match of source.matchAll(declarations)) {
    addCompletion(items, seen, {
      label: match[1],
      insertText: match[1],
      detail: "Identifier declared in the current script.",
      kind: "identifier",
      priority: 86,
    });
  }

  const classes = /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  for (const match of source.matchAll(classes)) {
    addCompletion(items, seen, {
      label: match[1],
      insertText: match[1],
      detail: "Class defined in the current script.",
      kind: "class",
      priority: 84,
    });
  }

  const dotFields = /\.([A-Za-z_][A-Za-z0-9_]*)/g;
  for (const match of source.matchAll(dotFields)) {
    addCompletion(items, seen, {
      label: match[1],
      insertText: match[1],
      detail: "Field used in the current script.",
      kind: "field",
      priority: 78,
    });
  }

  const assignmentFields = /^\s*(?:public|private)?\s*(?:int|float|string|bool)?\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/gm;
  for (const match of source.matchAll(assignmentFields)) {
    if (match[1] === "let" || ALL_KEYWORDS.has(match[1])) continue;
    addCompletion(items, seen, {
      label: match[1],
      insertText: match[1],
      detail: "Field or assignment target in the current script.",
      kind: "field",
      priority: 76,
    });
  }

  const strings = /"([^"\n]+)"/g;
  for (const match of source.matchAll(strings)) {
    const value = match[1].trim();
    if (!value) continue;
    const isCoupon = /^[A-Z0-9_]{3,}$/.test(value);
    const kind: CompletionKind = isCoupon ? "coupon" : value.includes(" ") ? "product" : "value";
    addCompletion(items, seen, {
      label: '"' + value + '"',
      insertText: value,
      detail: isCoupon ? "Coupon code used in the current script." : "String value used in the current script.",
      kind,
      priority: kind === "value" ? 82 : 80,
      searchText: value,
      quoted: true,
    });
  }

  return items;
}

function getCompletionContext(source: string, cursor: number): CompletionContext | null {
  const beforeCursor = source.slice(0, cursor);
  const lineStart = beforeCursor.lastIndexOf("\n") + 1;
  const currentLine = beforeCursor.slice(lineStart);
  let quoteCount = 0;
  for (let i = 0; i < currentLine.length; i++) {
    if (currentLine[i] === '"' && currentLine[i - 1] !== "\\") quoteCount++;
  }
  const inString = quoteCount % 2 === 1;
  const match = (inString ? /[A-Za-z0-9 _.-]*$/ : /[A-Za-z_][A-Za-z0-9_]*$/).exec(currentLine);
  const prefix = match?.[0] ?? "";
  if (prefix.length < 1) return null;

  const lineIndex = beforeCursor.split("\n").length - 1;
  return {
    prefix,
    start: cursor - prefix.length,
    end: cursor,
    lineIndex,
    colIndex: currentLine.length,
    inString,
  };
}

function resolveInsertText(item: CompletionItem, inString: boolean): string {
  if (!item.quoted) return item.insertText;
  return inString ? item.insertText : '"' + item.insertText + '"';
}

function getCompletionMatches(items: CompletionItem[], context: CompletionContext): CompletionItem[] {
  const query = context.prefix.trim().toLowerCase();
  if (!query) return [];
  return items
    .map(item => {
      const searchable = (item.searchText ?? item.label).toLowerCase();
      const starts = searchable.startsWith(query);
      const contains = searchable.includes(query);
      return { item, starts, contains };
    })
    .filter(match => match.starts || match.contains)
    .sort((a, b) => {
      if (a.starts !== b.starts) return a.starts ? -1 : 1;
      if (a.item.priority !== b.item.priority) return b.item.priority - a.item.priority;
      return a.item.label.localeCompare(b.item.label);
    })
    .slice(0, 9)
    .map(match => match.item);
}

function parseCssPixels(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getTextareaCaretMenuPosition(textarea: HTMLTextAreaElement) {
  const style = window.getComputedStyle(textarea);
  const rect = textarea.getBoundingClientRect();
  const fontSize = parseCssPixels(style.fontSize, 13);
  const lineHeight = style.lineHeight === "normal" ? fontSize * 1.7 : parseCssPixels(style.lineHeight, fontSize * 1.7);
  const mirror = document.createElement("div");
  const marker = document.createElement("span");

  mirror.style.position = "fixed";
  mirror.style.left = rect.left - textarea.scrollLeft + "px";
  mirror.style.top = rect.top - textarea.scrollTop + "px";
  mirror.style.width = rect.width + "px";
  mirror.style.height = rect.height + "px";
  mirror.style.boxSizing = style.boxSizing;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.overflow = "hidden";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = "pre";
  mirror.style.tabSize = style.tabSize;
  mirror.style.font = style.font;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontSize = style.fontSize;
  mirror.style.fontWeight = style.fontWeight;
  mirror.style.fontStyle = style.fontStyle;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.textTransform = style.textTransform;

  const beforeCursor = textarea.value.slice(0, textarea.selectionStart);
  mirror.textContent = beforeCursor;
  marker.textContent = "\u200b";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const markerRect = marker.getBoundingClientRect();
  document.body.removeChild(mirror);

  return {
    left: markerRect.left,
    top: markerRect.top + lineHeight,
    lineHeight,
  };
}

export function EditorThemeToggle({ theme, onToggle }: { theme: EditorTheme; onToggle: () => void }) {
  const isDark = theme === "dark";
  const label = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
  return (
    <button
      type="button"
      className="ide-theme-toggle"
      onClick={onToggle}
      aria-label={label}
      data-tooltip={label}
    >
      {isDark ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>
        </svg>
      )}
    </button>
  );
}

export function ShopScriptCodeEditor({
  code,
  onCodeChange,
  onRun,
  theme,
  editorRef,
  className = "",
  ariaLabel,
  errorLines = [],
  onCursorChange,
  completionCatalog,
}: ShopScriptCodeEditorProps) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const codeLayerRef = useRef<HTMLDivElement>(null);
  const textareaRef = editorRef ?? localRef;
  const lines = code.split("\n");
  const errorLineSet = new Set(errorLines);
  const [completionState, setCompletionState] = useState<CompletionState | null>(null);
  const completionItems = useMemo(() => {
    const merged = [...BASE_COMPLETIONS];
    const seen = new Set(merged.map(item => (item.searchText ?? item.label).toLowerCase() + "|" + item.kind));
    completionCatalog?.products?.forEach(name => addCompletion(merged, seen, {
      label: '"' + name + '"',
      insertText: name,
      detail: "Product from the current inventory catalog.",
      kind: "product",
      priority: 83,
      searchText: name,
      quoted: true,
    }));
    completionCatalog?.coupons?.forEach(codeValue => addCompletion(merged, seen, {
      label: '"' + codeValue + '"',
      insertText: codeValue,
      detail: "Coupon from the current discount catalog.",
      kind: "coupon",
      priority: 82,
      searchText: codeValue,
      quoted: true,
    }));
    for (const item of buildDynamicCompletions(code)) addCompletion(merged, seen, item);
    return merged;
  }, [code, completionCatalog]);

  const reportCursor = (textarea: HTMLTextAreaElement) => {
    if (!onCursorChange) return;
    const beforeCursor = textarea.value.slice(0, textarea.selectionStart);
    const cursorLines = beforeCursor.split("\n");
    onCursorChange({ line: cursorLines.length, col: cursorLines[cursorLines.length - 1].length + 1 });
  };

  const refreshCompletions = (textarea: HTMLTextAreaElement, source = textarea.value) => {
    const context = getCompletionContext(source, textarea.selectionStart);
    if (!context) {
      setCompletionState(null);
      return;
    }
    const items = getCompletionMatches(completionItems, context);
    setCompletionState(items.length ? { items, activeIndex: 0, context } : null);
  };

  const applyCompletion = (item: CompletionItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const context = getCompletionContext(textarea.value, textarea.selectionStart) ?? completionState?.context;
    if (!context) return;
    const insertText = resolveInsertText(item, context.inString);
    const nextCode = textarea.value.slice(0, context.start) + insertText + textarea.value.slice(context.end);
    const nextCursor = context.start + insertText.length;
    onCodeChange(nextCode);
    setCompletionState(null);
    window.setTimeout(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.selectionStart = nextCursor;
      textareaRef.current.selectionEnd = nextCursor;
      reportCursor(textareaRef.current);
      refreshCompletions(textareaRef.current, nextCode);
    }, 0);
  };

  const syncEditorScrollPosition = (textarea: HTMLTextAreaElement) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = textarea.scrollTop;
      highlightRef.current.scrollLeft = textarea.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = textarea.scrollTop;
  };

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    syncEditorScrollPosition(event.currentTarget);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && onRun) {
      event.preventDefault();
      setCompletionState(null);
      onRun();
      return;
    }

    if (completionState) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCompletionState(current => current ? { ...current, activeIndex: (current.activeIndex + 1) % current.items.length } : current);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCompletionState(current => current ? { ...current, activeIndex: (current.activeIndex - 1 + current.items.length) % current.items.length } : current);
        return;
      }
      if (event.key === "Tab" || event.key === "Enter") {
        event.preventDefault();
        applyCompletion(completionState.items[completionState.activeIndex]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setCompletionState(null);
        return;
      }
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const start = event.currentTarget.selectionStart;
      const end = event.currentTarget.selectionEnd;
      onCodeChange(code.substring(0, start) + "  " + code.substring(end));
      window.setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
          reportCursor(textareaRef.current);
        }
      }, 0);
    }
  };

  const completionPosition: CSSProperties | undefined = completionState ? (() => {
    const textarea = textareaRef.current;
    if (!textarea) return undefined;
    const menuWidth = 276;
    const menuMaxHeight = 220;
    const menuMinHeight = 96;
    const viewportPadding = 10;
    const caret = getTextareaCaretMenuPosition(textarea);
    const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
    const ideRoot = textarea.closest<HTMLElement>(".shopscript-ide");
    const ideStyle = ideRoot ? window.getComputedStyle(ideRoot) : window.getComputedStyle(textarea);
    const preferredHeight = Math.min(menuMaxHeight, Math.max(menuMinHeight, 10 + completionState.items.length * 53));
    const availableBelow = Math.max(0, viewportHeight - caret.top - viewportPadding);
    const availableAbove = Math.max(0, caret.top - caret.lineHeight - viewportPadding);
    const shouldOpenBelow = availableBelow >= menuMinHeight || availableBelow >= availableAbove;
    const availableHeight = shouldOpenBelow ? availableBelow : availableAbove;
    const maxHeight = Math.max(menuMinHeight, Math.min(preferredHeight, availableHeight));
    const left = Math.max(viewportPadding, Math.min(viewportWidth - menuWidth - viewportPadding, caret.left));
    const top = shouldOpenBelow
      ? Math.max(viewportPadding, caret.top)
      : Math.max(viewportPadding, caret.top - caret.lineHeight - maxHeight);
    return {
      left,
      top,
      width: menuWidth,
      maxHeight,
      "--ide-bg": ideStyle.getPropertyValue("--ide-bg").trim(),
      "--ide-text": ideStyle.getPropertyValue("--ide-text").trim(),
      "--ide-muted": ideStyle.getPropertyValue("--ide-muted").trim(),
    } as CSSProperties;
  })() : undefined;

  const completionMenu = completionState ? (
    <div className={"code-completion-menu ide-" + theme} style={completionPosition} role="listbox">
      {completionState.items.map((item, index) => (
        <button
          type="button"
          key={item.kind + "-" + item.label}
          className={"code-completion-item" + (index === completionState.activeIndex ? " active" : "")}
          onMouseDown={event => {
            event.preventDefault();
            applyCompletion(item);
          }}
          role="option"
          aria-selected={index === completionState.activeIndex}
        >
          <span className="completion-main">
            <span className="completion-label">{item.label}</span>
            <span className="completion-kind">{item.kind}</span>
          </span>
          <span className="completion-detail">{item.detail}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className={"shopscript-ide ide-" + theme + " " + className}>
      <div className="ide-gutter" ref={gutterRef} aria-hidden="true">
        {lines.map((_, index) => <div className={errorLineSet.has(index + 1) ? "ide-error-line" : ""} key={index}>{index + 1}</div>)}
      </div>
      <div className="ide-code-layer" ref={codeLayerRef}>
        <div className="ide-highlight" ref={highlightRef} aria-hidden="true">
          {lines.map((line, index) => <HighlightedLine line={line} lineIndex={index} hasError={errorLineSet.has(index + 1)} key={index} />)}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={event => {
            onCodeChange(event.target.value);
            reportCursor(event.currentTarget);
            refreshCompletions(event.currentTarget, event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={event => {
            reportCursor(event.currentTarget);
            if (!["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"].includes(event.key)) refreshCompletions(event.currentTarget);
          }}
          onClick={event => {
            reportCursor(event.currentTarget);
            refreshCompletions(event.currentTarget);
          }}
          onSelect={event => reportCursor(event.currentTarget)}
          onFocus={event => {
            reportCursor(event.currentTarget);
            refreshCompletions(event.currentTarget);
          }}
          onBlur={() => window.setTimeout(() => setCompletionState(null), 120)}
          onScroll={syncScroll}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          wrap="off"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={Boolean(completionState)}
        />
      </div>
      {completionMenu && typeof document !== "undefined" ? createPortal(completionMenu, document.body) : completionMenu}
    </div>
  );
}
