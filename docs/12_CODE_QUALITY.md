# 12 — Code Quality, Conventions, CI and README

## 1. Principles
1. **Layered and pure where possible:** `shared/engine` (pure) ← `server/ai` (I/O behind interfaces) ← `server/routes` (thin) ; `client/lib` (hooks, I/O) ← `client/features` (views) ← `client/components` (presentational).
2. **Types from schemas:** every domain type is `z.infer<typeof Schema>`; no duplicated interfaces.
3. **Small units:** functions ≤ 40 lines, components ≤ 150 lines, files ≤ 300 lines (data tables excepted). Split when exceeded.
4. **No magic numbers:** thresholds (rush days, crowd sizes, benchmark ratios) live in named constants in `engine/data/*` with a one-line comment citing the rule id.
5. **Errors as values** at boundaries (`Result<T, E>` = `{ ok: true, value } | { ok: false, error }`), exceptions only for programmer errors.
6. **Dependency injection** for clock, AI client, logger, storage — enables tests without mocks of modules.
7. **Comments explain why, not what.** Public functions in `shared/` and `server/ai/` have TSDoc with an example.

## 2. Naming
- Files: `camelCase.ts` for modules, `PascalCase.tsx` for components, `*.test.ts(x)` beside the `tests/` mirror path.
- Rule ids `R01…R30` appear in code (`ruleId: 'R03'`), tests and docs identically.
- Booleans start with `is/has/should`; event handlers `onX` props, `handleX` internals.
- CSS Modules class names in camelCase; tokens `--kebab-case`.

## 3. TypeScript config (`tsconfig.json` base)
```
"strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true,
"noImplicitOverride": true, "noFallthroughCasesInSwitch": true, "noUnusedLocals": true,
"noUnusedParameters": true, "useUnknownInCatchVariables": true, "verbatimModuleSyntax": true,
"module": "ESNext", "moduleResolution": "Bundler", "target": "ES2022", "jsx": "react-jsx"
```
Server build uses `tsconfig.server.json` (`module: NodeNext`, `outDir: dist/server`, includes `src/server` + `src/shared`). If `NodeNext` requires `.js` import suffixes, use them consistently in server/shared code, or bundle the server with `esbuild` (`--platform=node --format=esm --packages=external`) — pick one and document it.

## 4. ESLint (flat config) — must pass with zero warnings (`--max-warnings 0`)
- `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`
- `eslint-plugin-react-hooks` (recommended), `eslint-plugin-jsx-a11y` (strict), `eslint-plugin-react` (`react/no-danger: error`, `react/jsx-no-target-blank: error`)
- `no-restricted-imports` for layer boundaries (see `03` §2)
- `no-console: error` in `src/` (use logger), allowed in `scripts/`
- `eqeqeq`, `curly`, `prefer-const`, `no-param-reassign` (props: true), `@typescript-eslint/explicit-function-return-type` for `shared/**` and `server/**` exports
- `complexity: ["error", 12]`, `max-depth: ["error", 3]`
Prettier: `singleQuote`, `trailingComma: all`, `printWidth: 100`, `semi: true`. `.editorconfig` matching.

## 5. Git
- Single `main` branch. Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`, `perf:`, `ci:`).
- `.gitignore`: `node_modules`, `dist`, `coverage`, `.env`, `.env.*` (not `.env.example`), `playwright-report`, `test-results`, `*.log`, `.DS_Store`.
- No generated files, images (except `public/favicon.svg`), or lockfiles other than `package-lock.json`.

## 6. CI — `.github/workflows/ci.yml`
```yaml
name: ci
on: [push, pull_request]
permissions: { contents: read }
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run format
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - run: node scripts/check-bundle.mjs
      - run: npm audit --audit-level=high --omit=dev
      - name: secret scan
        run: "! grep -rEn 'AIza[0-9A-Za-z_-]{35}' --exclude-dir=node_modules --exclude-dir=.git ."
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```
Also add `.github/dependabot.yml` (npm, weekly).

## 7. README template (write exactly these sections, fill with real data)

```markdown
# Mehfil — a planning almanac for celebrations

> GenAI-powered planner for weddings, birthdays and community events: budgets, timelines,
> vendor checklists and personalised ideas — with an assistant that reasons about your plan.

**Live demo:** <Cloud Run URL>  ·  **Challenge:** [Challenge 5] Celebration & Event Planner

## What it does
(6 bullets: Invitation sentence → Almanac with Ledger, Timetable, Vendors, Ideas, Run sheet,
Ask the Planner; exports; saved plans; offline fallback)

## How it meets the brief
| Challenge expectation | Implementation | Code |
|---|---|---|
| Smart, dynamic assistant | ... | src/server/ai/assistant.ts, src/client/features/almanac/planner |
| Logical decision making from user context | Rule engine R01–R30 ... | src/shared/engine |
| Practical, real-world usability | ... | ... |
| Clean, maintainable code | ... | ... |

## Design decision: AI for creativity, rules for arithmetic
(the table from docs/05 §1 + 3 sentences)

## Decision rules (summary)
(compact table of rule ids, condition, effect)

## Architecture
(ASCII diagram from docs/03 §3, folder overview, stack table)

## Security
(bullets: key server-side only, CSP, rate limits, validation, prompt-injection defences,
action whitelist, no server-side personal data → link SECURITY.md)

## Accessibility
(WCAG 2.2 AA target, what was tested, keyboard map, inclusive engine rules)

## Efficiency
(budgets and measured numbers, caching, lazy tabs, dependency list)

## Testing
(commands, counts, coverage table, what is covered)

## Run locally
npm ci · cp .env.example .env (optionally add GEMINI_API_KEY) · npm run dev → http://localhost:5173

## Deploy (Google Cloud Run)
(commands from docs/13)

## Responsible AI
(docs/05 §7)

## Out of scope
(docs/02 §7)

## Google services used
Gemini API (ideas and assistant, structured JSON output) · Cloud Run (hosting) · Secret Manager
(API key) · Cloud Logging (structured logs) · Stitch (UI exploration via MCP)
```
Keep README ≤ 300 lines; facts must match the code (evaluators cross-check).
