# ShopScript Project Memory

## Purpose and scope

ShopScript is a browser-based educational mini-language interpreter for an e-commerce cart and order simulation. The interpreter is the academic core; the storefront is a visual execution output. It is not a production store and must not add real accounts, payments, or order processing unless the project scope is explicitly changed.

The required course outcomes come from `PROJECT+SPECIFICATION.pdf`: lexical analysis, syntax analysis, names/scope/binding, semantic analysis, control flow (`if`/`else`, `for`, `while`), integer/float/boolean/string types and conversion, plus class definition, object creation, and basic encapsulation. `ShopScript_Ecommerce_Project_Plan.pdf` adapts those requirements to the e-commerce domain.

Use `PROJECT_ROADMAP.md` for phase status, required implementation order, acceptance criteria, and the next approved work.

## Source-of-truth priority

1. `PROJECT+SPECIFICATION.pdf` defines mandatory academic requirements.
2. `PROJECT_ROADMAP.md` defines implementation order and audited phase status.
3. Running code under `artifacts/shopscript/src/` describes what is implemented now.
4. `ShopScript_Ecommerce_Project_Plan.pdf` defines the intended design and optional expansion ideas.
5. `README.md` explains the project but may lag behind the code or workspace tooling.

Do not claim a planned feature is implemented without checking the interpreter. In particular, reserved keywords are not proof that their execution semantics exist.

## Repository map

- `artifacts/shopscript/`: primary React/Vite website (`@workspace/shopscript`).
  - `src/main.tsx`: browser entry point.
  - `src/App.tsx`: main single-page UI, sample programs, product presentation, editor controls, store/cart/checkout panels, analyzer panels, OOP cards, and receipt.
  - `src/shopscript-interpreter.ts`: lexer, syntax checker, semantic checks, executor, inventory, coupons, classes, and instances. This is the language behavior source of truth.
  - `src/index.css`: global theme, responsive layout, and component classes.
  - `src/components/ui/`: reusable generated UI primitives; most current page composition remains in `App.tsx`.
  - `vite.config.ts`: requires `PORT` and `BASE_PATH` environment variables.
- `artifacts/api-server/`: Express API scaffold; currently exposes `/api/healthz` and is not needed for the in-browser interpreter.
- `artifacts/mockup-sandbox/`: separate visual mockup package; not the primary app.
- `lib/api-spec/`: OpenAPI contract for the API scaffold.
- `lib/api-client-react/` and `lib/api-zod/`: generated API client and validation code.
- `lib/db/`: Drizzle/PostgreSQL scaffold; persistence is outside the current ShopScript simulator scope.
- `scripts/`: workspace helper package.
- `attached_assets/`: supplied images and prompt/reference assets.

## Current website structure

`App.tsx` renders one responsive page with:

1. Sticky ShopScript header and navigation.
2. Intro/hero content and status summary.
3. Main workspace containing the ShopScript editor/sample selector and the store simulation.
4. Product catalog, cart, coupon/shipping totals, checkout CTA, and receipt preview.
5. Analyzer output for tokens, lexical/syntax/semantic errors, variables, and execution logs.
6. OOP class and object-instance visualization when the OOP sample is used.
7. Footer and language quick-reference content.

The current visual theme is orange-and-white and Shopee-inspired. Preserve the educational analyzer and simulator relationship when changing the layout.

## Interpreter pipeline and current language

`interpret(source)` follows:

`tokenize` -> `checkSyntax` -> semantic validation/execution -> `InterpreterResult`

`InterpreterResult` drives the UI and includes tokens, three error collections, cart, variables, classes, instances, logs, coupon/discount/shipping/totals, user, and checkout state.

Currently demonstrated syntax includes:

- `let user = "Ava";`, numeric variables, booleans, and `let cart = [];`
- `add "Smartphone X" 1 @ 599.00;`
- `apply coupon "SAVE10";`
- `set shipping = 40.00;`
- `checkout;`
- Basic classes with fields, `let item = new Product;`, field assignment, and `add item 1;`

Inventory and coupons are defined in `shopscript-interpreter.ts`. UI product metadata and image URLs are separately defined in `App.tsx`; keep matching product names synchronized.

## Known requirement gaps

The website and README use ShopScript v0.2.0. Basic OOP support exists, but the project does not yet fulfill every mandatory specification item. Before final submission, verify and implement as needed:

- Executable `if`/`else`, `for`, and `while`, including a loop safety limit.
- Real nested/global scope and binding behavior.
- Explicit `int`, `float`, `bool`, and `string` declarations, operations, and allowed conversion.
- OOP methods and access/encapsulation (`private`/`public`), not only class fields and instances.
- Grammar coverage and semantic tests for all required features.
- Inventory stock checks/updates if presented as implemented.

## Package manager and local commands

This is a pnpm workspace. The root `preinstall` intentionally rejects npm, and the root package has no `dev` script. Do not use `npm install` or `npm run dev`.

On Windows PowerShell, Corepack is available. Use:

```powershell
corepack pnpm install
$env:PORT = "5173"
$env:BASE_PATH = "/"
corepack pnpm --filter @workspace/shopscript run dev
```

Then open `http://localhost:5173/`. Use `corepack pnpm run typecheck` for the workspace typecheck and `corepack pnpm run build` for the full build. The primary app alone can be checked with `corepack pnpm --filter @workspace/shopscript run typecheck`.

## Change discipline

- Keep interpreter behavior in `shopscript-interpreter.ts`; avoid duplicating language rules in UI code.
- Add or update valid, syntax-error, and semantic-error samples when grammar changes.
- Preserve line and column information in lexer/parser errors.
- Run the primary app typecheck after code changes and the full workspace checks before submission.
- Treat generated files under API client/schema packages as generated; change the OpenAPI source and regenerate instead of hand-editing them.
- Update this file when entry points, commands, architecture, or implemented language features materially change.
