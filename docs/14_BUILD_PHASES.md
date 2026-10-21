# 14 — Build Phases and Verification Gates

Work strictly in order. At the end of every phase run its **gate**; continue only when it is green. Commit after each phase (`git commit -m "<type>: phase N — <summary>"`).

---

## Phase 0 — Scaffold & tooling
1. `git init -b main`. Create the folder tree from `03` §2 (empty modules are fine).
2. `package.json` with scripts from `03` §8; install dependencies (check current stable versions):
   - runtime: `react react-dom zod express helmet express-rate-limit compression @google/genai @fontsource-variable/fraunces @fontsource-variable/instrument-sans @fontsource-variable/jetbrains-mono`
   - dev: `typescript vite @vitejs/plugin-react tsx concurrently vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom vitest-axe supertest @types/supertest @types/express @types/compression @types/node @types/react @types/react-dom fast-check @playwright/test @axe-core/playwright eslint typescript-eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y globals prettier`
3. `tsconfig.json`, `tsconfig.server.json`, `vite.config.ts` (proxy `/api` → `http://localhost:8080`, `build.outDir: dist/client`), `vitest.config.ts` (coverage thresholds from `10`), `playwright.config.ts`, `eslint.config.js`, `.prettierrc`, `.editorconfig`, `.nvmrc` (`22`), `.gitignore`, `.dockerignore`, `.env.example`.
4. Minimal `src/server/index.ts` serving `/api/health` and `src/client/main.tsx` rendering "Mehfil".

**Gate 0:** `npm run lint && npm run typecheck && npm run build` succeed; `npm run dev` serves the page and `/api/health`.

## Phase 1 — Shared schemas & primitives
1. `shared/schema/{brief,plan,ai}.ts` exactly per `03` §4–5 and `05`.
2. `engine/money.ts` (minor units, largest remainder, `formatMoney`), `engine/dates.ts` (parse, add days, diff days, weekday/month names, all UTC), `shared/text.ts` (`sanitizeText`), stable string hash (FNV-1a, 32-bit, hex) in `shared/hash.ts`.
3. Unit tests for all of the above.

**Gate 1:** `npm test -- tests/unit` green; coverage for these files ≥ 98%.

## Phase 2 — Decision engine
1. Data tables in `engine/data/` (`allocations`, `benchmarks`, `milestones`, `vendors`, `runsheets`) exactly as `04`.
2. `budget.ts` (moveShare, modifiers R01–R08, rounding, rebalance), `feasibility` (+R10–R12), `timeline.ts` (+R20), `vendors.ts` (+R30), `runsheet.ts`, `insights.ts`, `actions.ts`, `index.ts` (`buildPlan`).
3. All engine tests + property tests from `10` §3.

**Gate 2:** all engine and property tests green; `src/shared/engine/**` coverage ≥ 98% lines / 95% branches; persona fixtures produce sensible outputs (print them once and sanity-check against `02` personas — e.g. Ananya = workable, has accessibility line and step-free questions; Rahul = R30 nut warning, kids supervisors task; Meera = R06 safety ≥ 10 and permits critical; Sam = GBP formatting).

## Phase 3 — Fallback ideas & exports
1. `engine/data/fallbackIdeas.ts`: hand-write ≥ 12 ideas per sub-type (12 sub-types → ≥ 144), ≥ 2 per category, tagged with vibes, `excludeIf`, costBand. Make them specific and culturally grounded (e.g. haldi ceremony with marigold-petal toss, kids' "build-your-own pizza" station, mela stall stamp-passport for children, zero-waste steel-plate bank for community events). No duplicates.
2. `selectFallbackIdeas(brief, n, focus, exclude)`.
3. `shared/ics.ts` (`toICS`).
4. Tests.

**Gate 3:** tests green; every sub-type with every single dietary/accessibility tag still yields ≥ 6 ideas with no conflicts.

## Phase 4 — Server & AI
1. `config.ts`, `logger.ts`, `middleware/{security,validate,errors}.ts`, `app.ts` (`createApp(deps)`), `routes/*`, `ai/{client,prompts,ideas,assistant,cache}.ts` per `05` and `08`.
2. `GeminiClient` per `05` §2 (verify current `@google/genai` API names from the installed package's types; adapt).
3. `FakeAiClient` in `tests/helpers/`.
4. All server unit + API tests from `10` §3.

**Gate 4:** tests green; with no key, `curl -X POST localhost:8080/api/ideas -H 'content-type: application/json' -d @tests/fixtures/ananya.json` returns ≥ 6 library ideas; headers check (`curl -I`) shows CSP and no `x-powered-by`. If a real key is available locally, one manual call returns `source: "gemini"` (do not automate this).

## Phase 5 — Design foundation (+ Stitch)
1. If Stitch MCP tools are available: run the workflow in `07` §2 for S1–S10; write `docs/design-notes.md`. If not: skip to step 2.
2. `styles/tokens.css` (both themes, exactly `06` §3), `base.css` (reset, fonts, small caps utility, focus, paper grain, reduced motion, forced colors), `print.css`.
3. Primitives in `client/components/` with CSS Modules: Button, Field, ChipGroup, Tabs, Dialog, Rule (ornamental), Stamp, Ticket, Postcard, LedgerTable, Toast (telegram slip), TypesetLoader, ThemeToggle, TextSizeControl, SkipLink, ErrorBoundary, inline SVG icon set.
4. Contrast unit test + component axe tests.

**Gate 5:** component tests and axe green in both themes; `06` §2 "Never do" grep check: no `linear-gradient(` except the ruled-paper and perforation patterns (each with a comment), no `border-radius` > 4px except stamps/circles, no `Inter|Roboto|Poppins` in CSS, no emoji characters in `src/` (regex check in a test `tests/unit/style-guard.test.ts`).

## Phase 6 — Features
1. `lib/`: `api.ts`, `storage.ts`, `useRoute.ts`, `usePlan.ts` (reducer actions: `create`, `editBrief` (preserve done/status/custom by id), `rebalance`, `toggleTask`, `setVendorStatus`, `setVendorContact`, `applyAction`, `setIdeas`, `toggleIdeaSaved`, `setCommitted`), `useAnnouncer.ts`, `format.ts`.
2. Views: FrontPage (masthead, contents, samples, shelf), IntakeView (InvitationSentence + Margins, validation, error summary), AlmanacView (Masthead, Tabs, six tab panels lazily loaded), PlannerPanel (letters layout, action slips), exports (.ics download via Blob + `URL.createObjectURL`, print, copy as text).
3. Theme + text size preferences persisted.
4. Component tests from `10` §3.

**Gate 6:** all unit/component tests green; manual run-through of flows 1–5 from `02` §5 works in `npm run dev` with and without a key.

## Phase 7 — Accessibility & end-to-end
1. Go through `09` line by line; fix gaps.
2. Playwright specs from `10` §3 (create-plan, keyboard, ledger, export, a11y, csp, reflow).

**Gate 7:** `npm run test:e2e` green with zero axe violations on every screen, both themes, both viewports.

## Phase 8 — Performance
1. Lazy tabs, manual vendor chunk, font subsets, prefetch on idle, request de-dup, `scripts/check-bundle.mjs`.
2. If possible run Lighthouse (`npx lighthouse http://localhost:8080 --preset=desktop` and mobile default) on the production build; fix anything below `11` §1 budgets.

**Gate 8:** `node scripts/check-bundle.mjs` passes; performance test in engine suite passes; Lighthouse numbers recorded.

## Phase 9 — Delivery files
1. `Dockerfile`, `.dockerignore` per `13`; `docker build` succeeds (if Docker available).
2. `.github/workflows/ci.yml` and `dependabot.yml` per `12` §6.
3. `SECURITY.md` per `08` §9.
4. `README.md` per `12` §7 with real numbers (test count, coverage, bundle sizes, Lighthouse).

**Gate 9:** `npm run check` green; `npm run test:e2e` green; README facts match code (spot-check 5 claims with file paths).

## Phase 10 — Final audit
Run `15_SUBMISSION_CHECKLIST.md` completely. Fix, re-run, then report.
