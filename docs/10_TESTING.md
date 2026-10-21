# 10 — Testing

Goal: an evaluator opening `tests/` should immediately see that every requirement is verified — engine rules, invariants, security behaviour, AI fallbacks, accessibility and user flows. Tests are named after the behaviour they prove.

## 1. Tooling
- **Vitest** (unit, property, component, API) with `@vitest/coverage-v8`.
- **@testing-library/react** + `@testing-library/user-event` + **vitest-axe** (jsdom environment for `tests/components/**`, node for the rest — set per-file via `// @vitest-environment` or `environmentMatchGlobs`/projects).
- **supertest** against `createApp({ ai: FakeAiClient, clock: fixedClock, logger: silentLogger })`.
- **fast-check** for property tests.
- **Playwright** (chromium only, to keep CI fast) + **@axe-core/playwright**, running against the production build (`npm run build && npm start` via `webServer` in `playwright.config.ts`), with `GEMINI_API_KEY` unset.

No test may hit the network. Add a Vitest setup that replaces `globalThis.fetch` in node tests with a function that throws "network disabled in tests" unless a test stubs it.

## 2. Coverage gates (`vitest.config.ts`)
```
coverage: {
  provider: 'v8',
  include: ['src/shared/**', 'src/server/**', 'src/client/lib/**', 'src/client/components/**', 'src/client/features/**'],
  exclude: ['src/server/index.ts', 'src/client/main.tsx', '**/*.d.ts'],
  thresholds: { lines: 90, functions: 90, statements: 90, branches: 85,
                'src/shared/engine/**': { lines: 98, branches: 95 } },
}
```

## 3. Required test files and cases

### `tests/unit/engine/allocations.test.ts`
- every base allocation row sums to exactly 100
- every subType of every eventType has an allocation, milestones, vendors, run sheet and ≥ 12 fallback ideas

### `tests/unit/engine/budget.test.ts`
- `moveShare` adds to target and removes proportionally from sources; never below 0; falls back to all non-contingency when sources absent
- R01 outdoor adds weatherCover 5% and emits insight R01
- R02 mixed adds 3%
- R03 India + outdoor + July → extra 3% and warning mentioning monsoon; India + indoor + July → no R03
- R03 Europe + outdoor + January → cold-season warning; US + outdoor + July → none
- R04 accessibility 1 need → 2%; 3 needs → 3%; insight lists the needs
- R05 wedding 200 guests → transport +2; birthday 200 → logistics +2; 150 guests → none (boundary)
- R06 community 301 guests → safety ≥ 10; 300 → unchanged (boundary)
- R07 wedding 59 days → +3 contingency + warning; 60 days → none (boundary); birthday 6 vs 7; community 20 vs 21
- R08 contingency clamped to [5, 15]
- percentages sum to exactly 100.0 after rounding
- `rebalance`: target set exactly; others proportional; total 100; minor-unit sum equals total; setting to current value is a no-op; clamps 0..90

### `tests/unit/engine/money.test.ts`
- largest-remainder distributes remainders to the largest fractional parts, ties broken by order
- formatting: INR shows lakh grouping (`₹18,00,000`), USD `$12,000`, GBP `£3,000`, EUR `€2,500`
- per-guest floor division

### `tests/unit/engine/feasibility.test.ts`
- verdict boundaries at ratios 0.6, 1.0, 1.5 (just below / at / above)
- R10 only for tight/unrealistic; R11 numbers computed correctly (e.g. ₹5,00,000, 250 guests, traditional: suggested guests = 142, needed budget ₹8,75,000); R12 at ratio ≥ 2
- EUR/GBP benchmarks derived from USD table

### `tests/unit/engine/timeline.test.ts`
- lead ≥ maxOffset → due = date − offset, none rushed
- lead 45 for a wedding → offsets compressed proportionally; rushed exactly where offset > 45; order preserved
- lead 0 (event today) → all positive-offset tasks due today, all rushed; event-day task due today; after-tasks after date
- conditional milestones: destination/traditional/kids/milestone/drive/fundraiser adds; accessibility/outdoor/dietary cross-cutting adds
- phases assigned by effective offset
- R20 emits at most 3 rushed-critical insights + summary

### `tests/unit/engine/vendors.test.ts`
- wedding core list; birthday ≤ 15 guests gets "Home / society hall booking" instead of venue; > 20 gets caterer
- outdoor + 120 guests → canopy + portable restrooms; outdoor + 80 → canopy only
- each accessibility need adds the specified vendor or question
- each dietary item adds its caterer question; nut-allergy also emits R30
- every vendor has a non-empty `reason` naming its trigger and ≥ 3 questions

### `tests/unit/engine/runsheet.test.ts`
- default start times per type/subType; slots sorted; outdoor/accessibility/large-community modifiers; times wrap correctly before midnight (e.g. 07:00 − 300 min → 02:00 same day, labelled; never negative)

### `tests/unit/engine/actions.test.ts`
- shiftBudget valid → percents/amounts updated, totals exact, notice text formatted
- shiftBudget more than available → clamped; contingency never below 3
- shiftBudget unknown category / same from-to → `{ error }`
- addTask within lead / beyond lead (clamped + rushed) / duplicate id deduped
- markVendor valid / unknown id / invalid status
- applyAction never mutates the input plan (deep-freeze input in test)

### `tests/unit/engine/buildPlan.test.ts`
- persona fixtures (Ananya, Rahul, Meera, Sam from `02` §2) → snapshot of key facts (verdict, ledger ids, number of milestones, vendors, insights' ruleIds) — use inline snapshots of small derived objects, not whole plans
- determinism: same input twice → deep equal
- performance: 5,000 guests, 1,000 iterations average < 5 ms (guards AC9, generous threshold)

### `tests/property/invariants.test.ts` (fast-check, 500 runs each)
- for any valid brief and today ≤ date ≤ today+1095: Σ amountMinor = totalMinor; Σ percent = 100.0; all percents ≥ 0
- all milestones with offset ≥ 0 have today ≤ due ≤ date
- any sequence of random valid `rebalance` / `shiftBudget` operations preserves the money invariant
- `sanitizeText` output never contains control chars or `<<<`/`>>>` and length ≤ max
- `toICS` output lines ≤ 75 octets and every text field escaped

### `tests/unit/ics.test.ts`, `text.test.ts`, `cache.test.ts`, `storage.test.ts`, `format.test.ts`, `contrast.test.ts`
- ICS: VCALENDAR/VEVENT structure, DTSTART;VALUE=DATE, UID stability, escaping of `,;\` and newlines, CRLF line endings
- cache: hit, miss, TTL expiry with fake timers, LRU eviction order, max size
- storage: round trip; corrupt JSON discarded; wrong schemaVersion discarded; max 20 plans (oldest evicted); quota exception handled
- contrast: every documented pair ≥ threshold in both themes (parses `tokens.css`)

### `tests/unit/server/prompts.test.ts`
- ideas prompt contains all brief fields in the DATA block, budget **band** not amount, no vendor contacts
- injection strings inside `mustHaves` are sanitised: delimiters removed, control chars removed, length clamped
- assistant prompt includes ledger ids and vendor ids, ≤ 10 history turns, each ≤ 600 chars

### `tests/unit/server/ideas.test.ts` (FakeAiClient)
- valid model JSON → ideas with ids, source gemini
- malformed JSON / schema mismatch / throw / timeout (AbortSignal fired) → library fallback, source library
- URL/email/phone in idea → idea dropped
- nut-allergy brief + model returns "Almond barfi" → dropped; topped up to ≥ 6
- duplicates by title removed
- cache: second identical request does not call the client

### `tests/unit/server/assistant.test.ts`
- valid response → answer + actions
- invalid action types, unknown category/vendor ids, out-of-range percent → those actions dropped, others kept
- > 3 actions → truncated to 3
- AI disabled → rules fallback with "Offline planner mode" prefix; each intent (cut, next, vendor, weather, diet, other) produces the expected kind of answer/action

### `tests/api/*.test.ts` (supertest)
- `GET /api/health` → 200, `ai` reflects client
- security headers present: CSP without unsafe-inline/eval, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, `frame-ancestors 'none'`, no `X-Powered-By`
- `/api/*` responses have `Cache-Control: no-store`
- POST with invalid body → 400 with `fields`; unknown keys → 400; body > 16 kB → 413; wrong content type → 415
- date in the past / > 3 years → 400
- rate limit: 21st request in a minute → 429 JSON
- unknown route → 404 JSON; thrown error → 500 JSON without stack, with requestId
- AI client throwing never produces 5xx on `/api/ideas` (fallback 200)
- SPA fallback: `GET /some/path` returns index.html in production mode; `GET /api/nope` returns 404 JSON

### `tests/components/*.test.tsx` (RTL + vitest-axe, both themes)
- `InvitationSentence`: renders labelled controls; subType options change with eventType; validation errors announced and linked; summary links focus fields
- `Tabs`: keyboard navigation (arrows/Home/End), aria-selected, hash sync
- `LedgerTab`: + / − changes value, total row unchanged, announcement fired
- `TimetableTab`: checkbox toggles, rushed/overdue tags render text
- `VendorsTab`: status radio changes stamp text; filter works
- `IdeasTab`: loading state `aria-busy`; source label; Keep toggles `aria-pressed`
- `PlannerPanel`: submit question (mock api) → reply rendered; Apply calls engine and shows notice; Dismiss removes slip
- `FrontPage`: sample slip prefills intake; shelf delete asks for confirmation
- every component: `expect(await axe(container)).toHaveNoViolations()`

### `tests/e2e/*.spec.ts` (Playwright, production build, no API key)
1. **create-plan.spec**: front → sample "Jaipur wedding" → intake prefilled → submit → plan heading focused → ideas show "FROM THE MEHFIL LIBRARY"
2. **keyboard.spec**: full flow 1 and flow 3 with keyboard only
3. **ledger.spec**: increase a category; total unchanged; reload page → change persisted (AC10)
4. **export.spec**: click "Add to calendar" → download `.ics` whose content starts with `BEGIN:VCALENDAR`
5. **a11y.spec**: axe on every screen/tab, light + dark, 1280px and 375px, reduced motion → zero violations
6. **csp.spec**: collect console messages during flows → no CSP violation errors
7. **reflow.spec**: at 320px width `document.documentElement.scrollWidth <= 320`

## 4. Fixtures
`tests/fixtures/briefs.ts` exports the four personas + edge briefs (1 guest, 5,000 guests, budget 1, event today, event in 3 years, every accessibility need, every dietary need). `fixedToday = '2026-10-21'`.

## 5. Commands & CI
- `npm test` → vitest with coverage (must meet thresholds)
- `npm run test:e2e` → playwright
- CI runs both; e2e uploads report only on failure (not committed).

## 6. README "Testing" section
Show the commands, the number of tests, coverage table (from the final run) and the list of what is covered in 6–8 bullets.
