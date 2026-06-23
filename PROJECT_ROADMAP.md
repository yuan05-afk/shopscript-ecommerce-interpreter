# ShopScript Implementation Roadmap

> Agent-facing execution plan derived from `PROJECT+SPECIFICATION.pdf`, `ShopScript_Ecommerce_Project_Plan.pdf`, and the implementation as of June 20, 2026.

## Purpose of this file

Use this document to decide what to build next and to report project status. Do not infer completion from the README, reserved keywords, UI labels, or planned PDF examples. A phase is complete only when its acceptance criteria work in the interpreter and are demonstrated in the website.

## Status legend

- **DONE** — implemented and verifiable for the required scope.
- **IN PROGRESS** — a working subset exists, but mandatory requirements remain.
- **NOT STARTED** — no executable implementation exists; placeholders or reserved keywords do not count.
- **BLOCKED** — work cannot continue without a project decision or external input.

## Sources and authority

Use these sources in this order:

1. `PROJECT+SPECIFICATION.pdf` — mandatory academic requirements.
2. This roadmap — agreed implementation sequence and current status.
3. `artifacts/shopscript/src/shopscript-interpreter.ts` — current language behavior.
4. `artifacts/shopscript/src/App.tsx` and `index.css` — current website behavior and presentation.
5. `ShopScript_Ecommerce_Project_Plan.pdf` — intended design, examples, and expanded feature ideas.
6. `README.md` — user documentation; update it when behavior changes.

## Scope guardrails

- ShopScript is an educational interpreter with an e-commerce simulation as its visual output.
- Do not add real authentication, payments, customer accounts, database persistence, or production ordering.
- Keep language rules in `shopscript-interpreter.ts`; do not implement interpreter semantics only in React.
- Preserve token line and column data and line-based error reporting.
- Add valid and invalid samples whenever grammar or semantic rules change.
- Do not describe a feature as supported until parsing, validation, execution, UI output, and tests agree.
- Complete mandatory course requirements before optional visual enhancements.

## Canonical language direction

The PDFs contain examples such as `int qty = 2;` and `cart.add(...)`, while the working website currently uses `let qty = 2;` and `add "Product" 1 @ 10.00;`.

To avoid two competing dialects:

- Preserve the current commands (`add`, `apply coupon`, `set shipping`, and `checkout`) unless the team explicitly approves a migration.
- Extend the current grammar to meet mandatory concepts.
- Add explicit `int`, `float`, `string`, and `bool` declarations during the data-type phase, while deciding whether `let` remains supported as inferred typing.
- Do not implement the PDF''s `cart.add` dialect in parallel unless compatibility with both syntaxes is an explicit requirement.
- Record any approved syntax change in this file, the README, sample programs, and automated tests.

## Current status summary

| Phase | Requirement | Status |
| --- | --- | --- |
| 0 | Repository and local development setup | **DONE** |
| 1 | Language purpose, syntax, and formal grammar | **IN PROGRESS** |
| 2 | Lexical analysis | **IN PROGRESS** |
| 3 | Syntax analysis | **IN PROGRESS** |
| 4 | Names, scope, and binding | **DONE** |
| 5 | Semantic analysis | **IN PROGRESS** |
| 6 | Control flow | **DONE** |
| 7 | Required data types and conversions | **DONE** |
| 8 | Object-oriented features and encapsulation | **DONE** |
| 9 | Website and interpreter-output integration | **IN PROGRESS** |
| 10 | Automated testing and required demonstrations | **IN PROGRESS** |
| 11 | Final documentation and submission validation | **IN PROGRESS** |

## Phase 0 — Repository and local development setup

**Status: DONE**

Implemented:

- pnpm workspace installation works on Windows.
- Windows-native esbuild, Rollup, Lightning CSS, and Tailwind packages are allowed.
- The ShopScript React/Vite package can typecheck and build.
- README contains Windows, macOS, and Linux startup instructions.
- `AGENTS.md` records repository structure and engineering guardrails.

Verification:

```powershell
pnpm install
pnpm --filter @workspace/shopscript run typecheck
$env:PORT = "5173"
$env:BASE_PATH = "/"
pnpm --filter @workspace/shopscript run build
```

Do not reopen this phase unless setup, package-manager policy, or entry points change.

## Phase 1 — Language design and formal grammar

**Status: IN PROGRESS**

Already implemented:

- The language purpose and e-commerce simulation scope are defined.
- Working syntax exists for variables, cart additions, coupons, shipping, checkout, classes, instances, and field assignment.
- Sample programs demonstrate valid, syntax-error, semantic-error, and basic OOP cases.

Still required:

- Write one canonical grammar matching the implementation target.
- Define expression grammar, operator precedence, blocks, assignments, typed declarations, control flow, and OOP methods/access modifiers.
- Decide and document whether `let` coexists with explicit typed declarations.
- Resolve differences between the PDF command examples and the current website syntax.
- Define runtime limits, especially maximum loop iterations.

Acceptance criteria:

- A grammar section documents every supported statement and expression.
- Every grammar production has at least one valid and one invalid test.
- README examples and website samples use the canonical syntax.
- No advertised command exists only in documentation.

Recommended deliverable:

- Add `docs/SHOPSCRIPT_LANGUAGE_SPEC.md` before implementing control flow.

## Phase 2 — Lexical analysis

**Status: IN PROGRESS**

Already implemented in `tokenize(source)`:

- Keywords, identifiers, strings, numbers, booleans, operators, symbols, braces, brackets, dots, assignments, at-signs, and semicolons.
- Single-line `//` comments and whitespace skipping.
- Token line and column positions.
- Unterminated-string and unknown-character errors.
- Token display in the website.

Still required:

- Add tokens for explicit type and access keywords: `int`, `float`, `string`, `bool`, `private`, and `public`.
- Correctly tokenize multi-character operators: `==`, `!=`, `<=`, `>=`, `&&`, and `||`.
- Reject malformed numeric literals such as multiple decimal points.
- Define string escaping behavior.
- Add lexer tests for comments, positions, malformed literals, operators, and unknown characters.

Acceptance criteria:

- All grammar terminals tokenize unambiguously.
- Tokens retain accurate line and column positions.
- Invalid characters and malformed literals produce deterministic lexical errors.
- Lexer tests cover every token category and failure mode.

## Phase 3 — Syntax analysis

**Status: IN PROGRESS**

Already implemented in `checkSyntax(tokens)`:

- Current `let` declarations.
- Current string-form and object-instance `add` commands.
- Coupon application, shipping/field assignment, and checkout.
- Basic class declarations, object creation, and field defaults.
- Missing-semicolon and malformed-statement errors.

Still required:

- Parse typed declarations and general assignments.
- Parse expressions with precedence and parentheses.
- Parse `if`/`else`, `for`, and `while` blocks.
- Parse class access modifiers, methods, parameters, method calls, and returns.
- Detect unmatched braces and parentheses consistently.
- Replace token-skipping execution assumptions with a structured AST or typed statement representation.

Acceptance criteria:

- Valid required programs produce a structured program representation.
- Invalid structures stop before semantic analysis or execution.
- Errors identify the relevant line and expected construct.
- Parser tests cover declarations, expressions, commands, blocks, loops, conditions, classes, objects, and methods.

Engineering note:

The current checker and executor independently walk raw tokens. Before control flow, introduce an AST to prevent grammar and runtime behavior from diverging.

## Phase 4 — Names, scope, and binding

**Status: IN PROGRESS**

Already implemented:

- A flat variable table records inferred type and display value.
- Object instance names bind to class instances.
- Undefined classes and undefined object instances can produce semantic errors.

Still required:

- Enforce declaration before use.
- Reject duplicate declarations in the same scope.
- Implement global and nested block scopes.
- Implement method-local scope and parameter binding.
- Define assignment lookup through enclosing scopes.
- Prevent accidental implicit declaration through `set`.
- Expose scope information in the analyzer table.

Acceptance criteria:

- Each symbol records name, declared type, value, scope ID/depth, and mutability if applicable.
- Shadowing behavior is explicitly defined and tested.
- Leaving a block removes its local bindings.
- Undeclared access and same-scope duplicates produce semantic errors.
- The website demonstrates global and local variables.

## Phase 5 — Semantic analysis

**Status: IN PROGRESS**

Already implemented:

- Unknown product detection.
- Positive quantity and non-negative price checks.
- Coupon-code validation.
- Non-negative shipping validation.
- Empty-cart checkout prevention.
- Undefined class/instance checks.
- Required object fields for adding custom products.

Still required:

- Type-check declarations, assignments, expressions, conditions, parameters, and returns.
- Enforce declared-variable use and duplicate-name rules.
- Validate operator operand types.
- Validate method existence and method-call arguments.
- Prevent duplicate coupon application when disallowed.
- Verify inventory stock and update simulated stock.
- Decide whether script-supplied prices must match trusted inventory prices; the plan says client commands must not alter checkout price.
- Stop or roll back invalid actions consistently instead of partially executing an invalid program.

Acceptance criteria:

- Semantic analysis runs after successful parsing and before state mutation.
- Invalid programs do not produce successful checkout state.
- Every rule has a semantic-error sample and automated test.
- Error messages state what is wrong and where it occurred.

## Phase 6 — Control flow

**Status: DONE**

Implemented:

- Executable `if`/`else`, `while`, and `for` blocks in the structured runtime.
- Expression-based conditions with comparisons and boolean operators.
- Nested block scopes and a 100-iteration loop safety limit.
- Runnable control-flow example and automated interpreter coverage.

Still useful later:

- Add more invalid-loop and malformed-condition regression tests.

## Phase 7 — Data types and type system

**Status: DONE**

Implemented:

- Explicit `int`, `float`, `string`, and `bool` declarations.
- Inferred `let` declarations remain supported for cart lists and object references.
- Assignment compatibility checks and expression result typing.
- Type-system examples and automated interpreter coverage.

Still useful later:

- Add more conversion/error tests for invalid assignments.

## Phase 8 — Object-oriented features and encapsulation

**Status: DONE**

Implemented:

- Class declarations, object creation, public/private fields, public methods, parameters, and `this` field assignment.
- Private field/method access checks.
- Object-cart integration through public `name` and `price` fields.
- Runnable OOP method/encapsulation example and automated interpreter coverage.

Still useful later:

- Add constructor syntax only if required by the instructor.

## Phase 9 — Website and interpreter-output integration

**Status: IN PROGRESS**

Already implemented:

- Responsive React/Vite interface with orange-and-white store styling.
- Functional shared navigation with Home, Docs, Examples, Playground, and About views.
- Searchable, responsive in-app Docs section based on current interpreter behavior.
- Filterable Examples section with seven supported programs and direct open/run integration, including manual price override.
- Dedicated Playground with shared code state, example loading, keyboard execution, and tabbed interpreter results.
- Shared syntax-highlighted Home/Playground editor with a default Light theme and Dark toggle.
- Interactive inventory expansion, product-add, cart quantity, and removal controls that update and re-run ShopScript source while preserving intentional price overrides.
- Persistent Inventory page with product create, read, update, delete, search, stock/status filters, and a catalog shared with Home and semantic validation.
- Popup notifications, editor line markers, and inline diagnostics for interpreter, stock, cart, checkout, and inventory CRUD outcomes.
- Source editor area and sample selection.
- Run/reset behavior.
- Product catalog, cart, coupon, shipping, totals, checkout, and receipt.
- Token, error, variable, and execution-log panels.
- Class and instance visualization.
- Valid, syntax-error, semantic-error, price-override, type/scope/control-flow, and OOP method/encapsulation samples.

Still required:

- Add optional AST/scope visualization to the analyzer.
- Expand edge-case tests for malformed expressions, loops, and OOP misuse.
- Decide whether checkout should persistently decrement Inventory stock, or keep current behavior as validation-only simulation.
- Verify responsive behavior and keyboard accessibility.

Acceptance criteria:

- Every required language phase has a selectable demonstration.
- Analyzer panels accurately reflect interpreter results.
- Invalid programs never show a misleading successful receipt.
- The UI remains usable on desktop, tablet, and mobile widths.

## Phase 10 — Automated tests and demonstrations

**Status: IN PROGRESS**

Implemented:

- `pnpm --filter @workspace/shopscript run test:interpreter` validates typed declarations, control flow, OOP methods, encapsulation, and price override behavior.

Still required:

- Add more regression tests for invalid syntax, invalid expressions, loop safety, and inventory edge cases.
- Add final end-to-end demonstration program covering all mandatory modules.

## Phase 11 — Final documentation and submission validation

**Status: IN PROGRESS**

Already implemented:

- Project overview, commands, samples, features, scope, and local setup are documented.
- Project plan and official specification PDFs are retained.
- Agent memory and this roadmap describe the repository and current work.

Still required:

- Update README claims after each completed language phase.
- Document the final grammar and type rules.
- Add screenshots or a short demonstration flow if required by the instructor.
- Prepare answers for the specification''s Q&A section using only implemented behavior.
- Ensure the final sample demonstrates all Modules 1–7.
- Run a final requirements audit against `PROJECT+SPECIFICATION.pdf`.

Final submission gate:

- Phases 1–10 satisfy their acceptance criteria.
- `pnpm install`, tests, typecheck, and build all pass from a clean checkout.
- The website demonstration covers lexer, parser, scope, semantics, control flow, data types, and OOP.
- Documentation does not claim unimplemented features.
- No production e-commerce features have expanded the academic scope.

## Required implementation sequence

Future agents should work in this order:

1. Freeze and document the canonical grammar.
2. Introduce AST nodes and parser tests.
3. Complete expressions and the type system.
4. Implement nested environments, scope, and binding.
5. Separate semantic analysis from state-mutating execution.
6. Implement `if`/`else`, then loops with a safety limit.
7. Complete methods, `this`, and encapsulation.
8. Connect new outputs and samples to the website.
9. Add comprehensive automated tests.
10. Perform the final specification and documentation audit.

Do not start optional editor replacement, animation, persistence, authentication, payments, or database work before steps 1–9 are complete.

## Status update protocol

When work changes a phase:

1. Update its status and the summary table.
2. Move completed bullets from “Still required” to “Already implemented.”
3. Add evidence: source file, test, or command.
4. Update relevant README examples.
5. Update `AGENTS.md` if architecture or commands changed.
6. Never mark a phase **DONE** while any mandatory acceptance criterion remains unmet.
