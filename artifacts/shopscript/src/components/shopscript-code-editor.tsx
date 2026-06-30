import { useRef, type KeyboardEvent, type RefObject, type UIEvent } from "react";

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
}

const DECLARATION_KEYWORDS = new Set(["let", "int", "float", "string", "bool", "void"]);
const COMMAND_KEYWORDS = new Set(["product", "add", "apply", "coupon", "set", "checkout", "override"]);
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
}: ShopScriptCodeEditorProps) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = editorRef ?? localRef;
  const lines = code.split("\n");
  const errorLineSet = new Set(errorLines);

  const reportCursor = (textarea: HTMLTextAreaElement) => {
    if (!onCursorChange) return;
    const beforeCursor = textarea.value.slice(0, textarea.selectionStart);
    const cursorLines = beforeCursor.split("\n");
    onCursorChange({ line: cursorLines.length, col: cursorLines[cursorLines.length - 1].length + 1 });
  };

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = event.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && onRun) {
      event.preventDefault();
      onRun();
      return;
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

  return (
    <div className={"shopscript-ide ide-" + theme + " " + className} data-lenis-prevent>
      <div className="ide-gutter" ref={gutterRef} aria-hidden="true">
        {lines.map((_, index) => <div className={errorLineSet.has(index + 1) ? "ide-error-line" : ""} key={index}>{index + 1}</div>)}
      </div>
      <div className="ide-code-layer">
        <div className="ide-highlight" ref={highlightRef} aria-hidden="true">
          {lines.map((line, index) => <HighlightedLine line={line} lineIndex={index} hasError={errorLineSet.has(index + 1)} key={index} />)}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={event => {
            onCodeChange(event.target.value);
            reportCursor(event.currentTarget);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={event => reportCursor(event.currentTarget)}
          onClick={event => reportCursor(event.currentTarget)}
          onSelect={event => reportCursor(event.currentTarget)}
          onFocus={event => reportCursor(event.currentTarget)}
          onScroll={syncScroll}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          wrap="off"
          data-lenis-prevent
          aria-label={ariaLabel}
        />
      </div>
    </div>
  );
}
