# Contributing to Mehfil

## Set up

```bash
npm ci
cp .env.example .env     # optional: add GEMINI_API_KEY
npm run dev
```

The app and every test work without a Gemini key.

## Before you open a pull request

`npm run check` runs lint, typecheck, tests with coverage thresholds, the build and the bundle
budgets. `npm run test:e2e` runs the Playwright and axe suites. Both must pass.

## Rules of the codebase

- **Layers:** `src/shared` is pure and isomorphic (no DOM, no Node, no clock, no randomness);
  `src/server` and `src/client` never import each other. ESLint enforces this.
- **Money and dates** come only from the decision engine in `src/shared/engine`. The model never
  produces a number that enters the budget or a date that enters the timetable.
- **Every external input** (HTTP bodies, localStorage, model output) is validated with zod.
- **Types:** strict TypeScript, no `any`, no `@ts-ignore`. Prefer narrowing and generics to casts.
- **Size:** functions of 40 lines or fewer (components 150), files of 300 lines or fewer
  (data tables excepted).
- **Tests:** add a test for every behaviour you change. Tests never call the real network or Gemini.
- **Accessibility:** target WCAG 2.2 AA. New UI needs a component test with axe.
- **Design:** follow `docs/06_DESIGN_SYSTEM.md` and `docs/design-notes.md`.

## Commits

Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `perf:`, `ci:`, `chore:`),
on a single `main` branch. A pre-commit hook in `.githooks/` runs lint, format and typecheck.

## Reporting a vulnerability

See [SECURITY.md](SECURITY.md). Please do not open a public issue for security reports.
