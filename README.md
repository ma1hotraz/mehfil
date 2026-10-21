# Mehfil — a planning almanac for celebrations

> GenAI-powered planner for weddings, birthdays and community events: budgets, timelines,
> vendor checklists and personalised ideas — with an assistant that reasons about your plan.

**Live demo:** _not deployed yet — see [Deploy](#deploy-vercel)_ · **Challenge:** [Challenge 5] Celebration & Event Planner

## What it does

- **The Invitation** — one sentence ("We are planning a wedding — traditional — for 250 guests in
  Jaipur on …") captures the event; optional margins add vibe, dietary and access needs.
- **The Almanac** — a plan with six tabs: Overview (verdict, notices, key figures), Ledger,
  Timetable, Vendors, Ideas and Run Sheet. The plan appears instantly because the decision
  engine runs in the browser.
- **Ask the Planner** — an assistant that reads your plan and proposes typed actions
  (shift budget, add a task, mark a vendor). Nothing changes until you press Apply.
- **Exports** — `.ics` calendar of open tasks, a print stylesheet, "copy plan as text".
- **Saved plans** — kept in your browser (`localStorage`), validated on load, restored on refresh.
- **Works without AI** — with no `GEMINI_API_KEY` (or no server at all) ideas come from a
  hand-written library of 156 ideas and the Planner answers with deterministic rules.

## How it meets the brief

| Challenge expectation                     | Implementation                                                                                                                                                | Code                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Smart, dynamic assistant                  | Planner answers about this plan; whitelisted, engine-validated actions; ideas regenerate per category                                                         | `src/server/ai/assistant.ts`, `src/shared/planner.ts`, `src/client/features/almanac/planner/` |
| Logical decision making from user context | Rule engine R01–R12, R20, R30 adapts budget, timeline, vendors and risks to type, sub-type, guests, budget, lead time, setting, season, diet and access needs | `src/shared/engine/`                                                                          |
| Practical, real-world usability           | Calendar export, print, saved plans, editable allocations, four currencies, offline fallback, run sheet                                                       | `src/shared/ics.ts`, `src/client/lib/storage.ts`, `src/client/features/almanac/`              |
| Clean, maintainable code                  | Pure engine behind typed schemas, DI for clock/AI/logger/storage, enforced layer boundaries, strict TypeScript                                                | `src/shared/`, `eslint.config.js`                                                             |

## Design decision: AI for creativity, rules for arithmetic

| Concern                                                             | Who decides                                                       | Why                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| Budget numbers, dates, vendor list, risks                           | Decision engine                                                   | Must be correct, explainable and testable |
| Ideas: themes, décor, menus, activities, favours, inclusion touches | Gemini                                                            | Creativity and personalisation            |
| Free-form questions about the plan                                  | Gemini, with a rule-based fallback                                | Natural language reasoning                |
| Changing the plan                                                   | The user clicking Apply on a whitelisted, engine-validated action | Safety and agency                         |

The model never produces a number that enters the ledger or a date that enters the timetable.
Every automatic change comes with an insight that names its rule, so the user can see why.

## Decision rules (summary)

| Rule      | Condition                                                                     | Effect                                                                       |
| --------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| R01 / R02 | Outdoor / mixed setting                                                       | 5% / 3% weather cover                                                        |
| R03       | Outdoor or mixed in a risky month (India Apr–Sep, Europe Nov–Mar, US Dec–Feb) | +3% weather cover, warning                                                   |
| R04       | Any access need                                                               | 2% (3% for three or more needs) for ramps, interpreters, signage, quiet room |
| R05       | Wedding or birthday over 150 guests                                           | +2% to transport / logistics                                                 |
| R06       | Community event over 300 attendees                                            | Safety raised to at least 10%, warning                                       |
| R07       | Lead time under 60 / 7 / 21 days (wedding / birthday / community)             | +3% contingency, warning                                                     |
| R08       | Always                                                                        | Contingency kept within 5–15%                                                |
| R10–R12   | Per-guest budget under 1.0× the indicative benchmark / under 0.6× / over 2.0× | Lean tips, critical guest-or-budget fix, upgrade tips                        |
| R20       | Critical milestone compressed by a short lead time                            | Warning per task (max 3, then a summary)                                     |
| R30       | Nut allergy                                                                   | Warning; caterer question                                                    |

Percentages use largest-remainder rounding so the ledger always sums to exactly 100.0% and to
the budget in minor units (property-tested).

## Architecture

```
Browser                                   Server (Vercel function / Node)   Gemini
Intake → zod parse brief
       → engine.buildPlan(brief, today)   (instant, local, lazy chunk)
       → render Almanac, save locally
       → POST /api/ideas {brief}  ──────► validate → cache? ──hit──► return
                                          miss → prompt → generateContent ───► JSON
                                          ◄── zod-validate, filter, fall back
       ◄── {ideas, source}
Planner: POST /api/assistant {...}        validate → prompt → JSON → whitelist actions
       ◄── {answer, suggestedActions, source}
Apply  → engine.applyAction(plan, action) → new plan
```

If the server is unreachable the browser runs the same fallback logic locally.

```
src/shared/   pure and isomorphic: schemas (zod/mini), engine, ics, text, planner rules
src/server/   Express app, security middleware, AI client + prompts, routes
src/client/   React views, design-system components, hooks (usePlans, usePreferences, …)
api/index.ts  Vercel serverless entry (the same Express app)
tests/        unit, property, api, components, client, e2e
```

| Layer      | Choice                                                                            |
| ---------- | --------------------------------------------------------------------------------- |
| Language   | TypeScript 6 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)   |
| Frontend   | React 19 + Vite 8, CSS Modules and design tokens, in-house hash router            |
| Validation | zod 4 (`zod/mini` in shared code for a small bundle)                              |
| Server     | Node 22 + Express 5, helmet, express-rate-limit, compression                      |
| AI         | `@google/genai`, model from `GEMINI_MODEL` (default `gemini-3.6-flash`)           |
| Tests      | Vitest, Testing Library, vitest-axe, supertest, fast-check, Playwright + axe-core |

## Security

- The Gemini key lives only in the server environment; the client bundle is checked for it.
- Strict CSP (no `unsafe-inline` or `unsafe-eval`), HSTS, nosniff, Referrer- and
  Permissions-Policy; the same headers are set in `vercel.json` for static files.
- Per-IP rate limits, a 16 kB JSON-only body limit, timeouts, response caching.
- zod validation on every HTTP body (`.strict()`), on localStorage reads and on model output.
- Prompt-injection defences: sanitising, delimited data, schema output, an action whitelist
  and conflict filters (e.g. no nut ideas for a nut allergy). No `dangerouslySetInnerHTML`.
- No personal data stored on the server; the model sees a budget band, never the amount.

Details, the threat model and the OWASP LLM mapping are in [SECURITY.md](SECURITY.md).

## Accessibility

Target: **WCAG 2.2 AA**. Tested with axe-core on every screen in both themes at 1280 px and
375 px, with reduced motion and with forced colours (zero violations), plus keyboard-only
end-to-end flows, reflow at 320 px, a contrast test over the design tokens and Lighthouse (100).

- Skip link, one `<h1>` per view, focus moved to the new heading on navigation.
- Tabs follow the WAI-ARIA pattern: ←/→ move between tabs, Home/End jump, Tab enters the panel.
- Live regions announce "plan ready", ideas loaded, ledger changes, task and vendor changes.
- Status is never colour alone (stamps and tags carry text); native `<dialog>`, radios and checkboxes.
- Text size control (100/115/130%), Paper and Lamplight themes, reduced motion, forced colours.
- Inclusive engine rules: guests' access and dietary needs change the budget, tasks and vendor
  questions themselves, not only the UI.

## Efficiency

| Metric                       | Budget              | Measured                                                  |
| ---------------------------- | ------------------- | --------------------------------------------------------- |
| Initial JS (gzip)            | ≤ 95 kB             | 90.8 kB                                                   |
| Total JS (gzip, all chunks)  | ≤ 160 kB            | 132.0 kB                                                  |
| CSS (gzip)                   | ≤ 20 kB             | 11.0 kB                                                   |
| Fonts (woff2, latin subsets) | ≤ 180 kB            | 160.3 kB                                                  |
| Lighthouse mobile            | 95 / 100 / 100 / 90 | 97 / 100 / 100 / 100 (perf / a11y / best practices / SEO) |
| `buildPlan`                  | < 5 ms average      | asserted in a test (1,000 runs, 5,000 guests)             |

Local engine (zero-latency plans, loaded as a lazy chunk and prefetched when idle), lazy tabs
and Planner, three self-hosted variable fonts, ideas cache with TTL plus in-flight
de-duplication, `maxOutputTokens` caps and timeouts. Runtime (server) dependencies: zod, express, helmet, express-rate-limit, compression and `@google/genai`. React and the three
self-hosted font packages are build-time only: Vite bundles them into the client.
`node scripts/check-bundle.mjs` enforces the budgets.

## Testing

```bash
npm test          # Vitest with coverage thresholds
npm run test:e2e  # Playwright against the production build (no API key)
```

**531** unit, component, client and API tests · **4** property tests (fast-check, 500 runs) ·
**20** end-to-end tests. No test touches the network.

| Coverage            | Lines | Branches | Functions |
| ------------------- | ----- | -------- | --------- |
| All measured source | 98.9% | 95.8%    | 98.9%     |
| `src/shared/engine` | 100%  | 99.1%    | 100%      |

Covered: every engine rule and boundary, money invariants, the AI client (fake and mocked
SDK), prompt sanitising, fallbacks, caching, security headers, rate limits, validation, every
component with axe in both themes, keyboard flows, persistence across reload and `.ics` export.

## Run locally

```bash
npm ci
cp .env.example .env     # optionally add GEMINI_API_KEY
npm run dev              # http://localhost:5173 (API on :8080)
```

Other commands: `npm run check` (lint, types, tests, build, bundle budgets), `npm start`
(serve the production build; the server is bundled to `dist/server.mjs` with esbuild).

## Deploy (Vercel)

The static client is served from Vercel's CDN and `api/index.ts` runs the Express app as a
single serverless function (`vercel.json` rewrites `/api/*` to it and sets the security headers).

```bash
npm i -g vercel
vercel link
vercel env add GEMINI_API_KEY      # optional; without it the app uses the offline library
vercel env add GEMINI_MODEL        # optional, default gemini-3.6-flash
vercel --prod
```

Then check `/api/health` (`"ai":"enabled"` when the key is set) and run the Jaipur sample.
Note: on serverless the rate limiter and ideas cache are per instance (see SECURITY.md). A
`Dockerfile` (Alpine, non-root, one bundled server file) is included for running the production
server in a container; the image is 197 MB.

## Responsible AI

- Ideas are labelled with their source ("Drafted by Gemini" or "From the Mehfil library").
- Money and dates are never AI-generated; benchmarks are labelled indicative.
- Only the event description is sent to the model; nothing is stored server-side.
- Safety-critical topics (permits, allergies, crowd safety) carry a "confirm locally" note.
- Defences against prompt injection: delimiters, data-not-instructions, output schema,
  whitelist, conflict filters, length caps.

## Out of scope

Payments, a real vendor marketplace or booking, user accounts, multi-user collaboration and
server-side storage of personal data (privacy by design and scope focus).

## Google services used

Gemini API (ideas and the Planner, structured JSON output). The UI was built directly from
`docs/06_DESIGN_SYSTEM.md`; no Stitch MCP server was connected in this build.
