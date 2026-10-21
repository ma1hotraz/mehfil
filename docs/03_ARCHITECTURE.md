# 03 — Architecture

## 1. Stack (and why)

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript 5 (strict) end to end | One type system for client, server and shared engine |
| Frontend | React 19 + Vite 6 | Small, fast, no framework lock-in; lazy-loaded tabs |
| Styling | Plain CSS with custom properties + CSS Modules | Distinctive design, zero runtime, tiny CSS; no Tailwind/MUI/shadcn look |
| Routing | Minimal hash/state router written in-house (`useRoute`) — 3 views | Avoids a routing dependency |
| State | React state + `useReducer` for the plan; a tiny typed store module for persistence | Predictable, testable |
| Validation | `zod` (shared schemas) | Same contract client and server |
| Server | Node 22 + Express 5 | Small surface, mature security middleware |
| AI | Google Gemini via `@google/genai` SDK, model from env `GEMINI_MODEL` (default `gemini-3.6-flash`; `gemini-3.5-flash-lite` is a faster/cheaper alternative) | Structured JSON output support; Google stack |
| Security middleware | `helmet`, `express-rate-limit`, `compression` | CSP, headers, abuse limits |
| Fonts | `@fontsource-variable/fraunces`, `@fontsource-variable/instrument-sans`, `@fontsource-variable/jetbrains-mono` (self-hosted woff2, latin subset) | No third-party font calls → strict CSP, faster |
| Tests | Vitest, @testing-library/react, vitest-axe, supertest, fast-check, Playwright + @axe-core/playwright | Unit, property, component, API, e2e, a11y |
| Lint/format | ESLint 9 flat config (typescript-eslint strictTypeChecked, react-hooks, jsx-a11y), Prettier | Code quality signals |
| Deploy | Docker multi-stage → Google Cloud Run; key in Secret Manager | Practical, scalable, Google services |

Pin exact major versions in `package.json`; use `npm` with a committed `package-lock.json`. Before installing, the agent should check the current stable versions; if a listed major has moved on, use the current stable and adjust code.

> Model note: Gemini model IDs change. Keep the ID only in env/config (`src/server/config.ts`). If the API rejects a request parameter (HTTP 400) on a newer model, remove that parameter rather than downgrading the model. Do not hard-code `temperature`/`topP` unless the docs for the chosen model allow them.

## 2. Repository layout

```
mehfil/
├─ docs/                         # this spec (keep it; evaluators like seeing it)
├─ src/
│  ├─ shared/                    # pure, isomorphic — NO DOM, NO node APIs
│  │  ├─ schema/
│  │  │  ├─ brief.ts             # EventBrief zod schema + types
│  │  │  ├─ plan.ts              # Plan, LedgerLine, Milestone, VendorItem, Insight, RunSlot, Idea
│  │  │  ├─ ai.ts                # IdeasResponse, AssistantResponse, SuggestedAction schemas
│  │  │  └─ index.ts
│  │  ├─ engine/
│  │  │  ├─ index.ts             # buildPlan(brief, today): Plan
│  │  │  ├─ budget.ts            # allocate(), rebalance(), feasibility()
│  │  │  ├─ timeline.ts          # buildTimeline()
│  │  │  ├─ vendors.ts           # buildVendors()
│  │  │  ├─ runsheet.ts          # buildRunSheet()
│  │  │  ├─ insights.ts          # collect rule outputs
│  │  │  ├─ actions.ts           # applyAction(plan, action): Result<Plan>
│  │  │  ├─ money.ts             # minor-unit math, largest-remainder rounding, formatting
│  │  │  ├─ dates.ts             # date-only helpers (UTC, no timezone drift)
│  │  │  └─ data/                # typed constant tables (no JSON parsing at runtime)
│  │  │     ├─ allocations.ts
│  │  │     ├─ benchmarks.ts
│  │  │     ├─ milestones.ts
│  │  │     ├─ vendors.ts
│  │  │     ├─ runsheets.ts
│  │  │     └─ fallbackIdeas.ts
│  │  ├─ ics.ts                  # toICS(plan): string
│  │  └─ text.ts                 # sanitizeText(), clamp lengths
│  ├─ server/
│  │  ├─ index.ts                # bootstrap: config → app → listen
│  │  ├─ app.ts                  # createApp(deps): Express (DI for tests)
│  │  ├─ config.ts               # env parsing with zod; fails fast
│  │  ├─ middleware/
│  │  │  ├─ security.ts          # helmet + CSP, rate limits, body limit
│  │  │  ├─ validate.ts          # zod body validator → 400
│  │  │  └─ errors.ts            # notFound + error handler (no stack leaks)
│  │  ├─ routes/
│  │  │  ├─ health.ts            # GET /api/health
│  │  │  ├─ ideas.ts             # POST /api/ideas
│  │  │  └─ assistant.ts         # POST /api/assistant
│  │  ├─ ai/
│  │  │  ├─ client.ts            # AiClient interface + GeminiClient implementation
│  │  │  ├─ prompts.ts           # system instructions + prompt builders
│  │  │  ├─ ideas.ts             # generateIdeas(): validated + fallback
│  │  │  ├─ assistant.ts         # answer(): validated + whitelist + fallback
│  │  │  └─ cache.ts             # tiny LRU with TTL (no dependency)
│  │  └─ logger.ts               # structured JSON logs, redaction
│  └─ client/
│     ├─ main.tsx
│     ├─ App.tsx                 # view switcher + providers + error boundary
│     ├─ styles/
│     │  ├─ tokens.css           # all design tokens (06_DESIGN_SYSTEM)
│     │  ├─ base.css             # reset, typography, focus, paper texture
│     │  └─ print.css
│     ├─ lib/
│     │  ├─ api.ts               # typed fetch wrappers, timeout, zod-parse responses
│     │  ├─ storage.ts           # versioned localStorage with zod
│     │  ├─ useRoute.ts
│     │  ├─ usePlan.ts           # reducer: generate, edit, apply action, toggle task…
│     │  ├─ useAnnouncer.ts      # aria-live polite/assertive
│     │  └─ format.ts            # Intl formatting
│     ├─ components/             # design-system primitives
│     │  ├─ Rule.tsx  Stamp.tsx  Ticket.tsx  Postcard.tsx  LedgerTable.tsx
│     │  ├─ Tabs.tsx  Dialog.tsx  Field.tsx  ChipGroup.tsx  Button.tsx
│     │  ├─ SkipLink.tsx  Toast.tsx  ThemeToggle.tsx  ErrorBoundary.tsx
│     └─ features/
│        ├─ front/FrontPage.tsx
│        ├─ intake/IntakeView.tsx  (+ InvitationSentence.tsx, Margins.tsx)
│        └─ almanac/
│           ├─ AlmanacView.tsx  Masthead.tsx
│           ├─ OverviewTab.tsx  LedgerTab.tsx  TimetableTab.tsx
│           ├─ VendorsTab.tsx   IdeasTab.tsx   RunSheetTab.tsx
│           └─ planner/PlannerPanel.tsx  ActionCard.tsx
├─ tests/
│  ├─ unit/        (engine, money, dates, ics, text, cache, prompts)
│  ├─ property/    (fast-check invariants)
│  ├─ api/         (supertest with FakeAiClient)
│  ├─ components/  (RTL + vitest-axe)
│  └─ e2e/         (Playwright + axe)
├─ public/  favicon.svg  robots.txt
├─ index.html
├─ .env.example  .gitignore  .dockerignore  .editorconfig  .nvmrc
├─ Dockerfile
├─ eslint.config.js  prettier config  tsconfig.json (+ tsconfig.server.json)
├─ vite.config.ts  vitest.config.ts  playwright.config.ts
├─ .github/workflows/ci.yml
├─ SECURITY.md
└─ README.md
```

Import rules (enforced with ESLint `no-restricted-imports`):
- `shared/**` must not import from `client/**` or `server/**`, nor `react`, `express`, `node:*`.
- `client/**` must not import from `server/**`.
- `server/**` must not import from `client/**`.

## 3. Runtime flow

```
Browser                                   Server (Cloud Run)              Gemini
───────                                   ──────────────────              ──────
Intake → zod parse brief
       → engine.buildPlan(brief, today)  (instant, local)
       → render Almanac, save local
       → POST /api/ideas {brief}  ──────► validate → cache? ──hit──► return
                                          miss → prompt → generateContent ───► JSON
                                          ◄── zod-validate, clamp, fallback on error
       ◄── {ideas, source}
Planner: POST /api/assistant {briefSummary, planDigest, history, question}
                                          validate → prompt → JSON → whitelist actions
       ◄── {answer, suggestedActions, source}
User clicks Apply → engine.applyAction(plan, action) → new plan
```

The server never computes or stores the plan. It only (a) drafts ideas, (b) answers questions. This keeps personal data off the server and the server stateless (scales to zero on Cloud Run).

## 4. Data models (zod is the source of truth; types inferred)

```ts
// shared/schema/brief.ts
export const EventType = z.enum(['wedding', 'birthday', 'community']);
export const SubType = { wedding: [...], birthday: [...], community: [...] } as const;
export const Currency = z.enum(['INR', 'USD', 'EUR', 'GBP']);
export const Setting = z.enum(['indoor', 'outdoor', 'mixed']);

export const EventBrief = z.object({
  eventType: EventType,
  subType: z.string(),                          // refined: must belong to eventType
  title: z.string().trim().max(80).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // refined against `today` in buildPlan/route
  guestCount: z.number().int().min(1).max(5000),
  budget: z.number().positive().max(1e10),
  currency: Currency,
  city: z.string().trim().min(1).max(60),
  setting: Setting,
  vibe: z.array(Vibe).max(3).default([]),
  dietary: z.array(Dietary).max(7).default([]),
  accessibility: z.array(Access).max(6).default([]),
  traditions: z.string().trim().max(200).default(''),
  mustHaves: z.string().trim().max(300).default(''),
}).strict().superRefine(subTypeMatchesType);
```

```ts
// shared/schema/plan.ts
LedgerLine   { id: CategoryId; label; percent: number /* 0..100, 1 decimal */;
               amountMinor: number /* integer */; recommendedPercent; note; committedMinor?: number }
Milestone    { id; title; detail; category: CategoryId | 'general'; phase: Phase;
               idealOffsetDays: number; dueDate: string; rushed: boolean; critical: boolean; done: boolean }
VendorItem   { id; label; reason: string /* rule explanation */; bookByDate; questions: string[];
               status: 'to-find'|'enquired'|'booked'|'paid'; contact?: { name?; phone?; notes? } }
Insight      { id; ruleId; severity: 'info'|'advice'|'warning'|'critical'; title; detail }
RunSlot      { id; time: 'HH:MM'; title; owner: string; note? }
Idea         { id; category: IdeaCategory; title; description; costBand: 1|2|3; fitsBecause; saved: boolean }
Feasibility  { verdict: 'comfortable'|'workable'|'tight'|'unrealistic'; perGuestMinor; benchmarkMinor; ratio; reason }
Plan         { schemaVersion: 1; id; createdAt; updatedAt; brief: EventBrief; feasibility;
               ledger: LedgerLine[]; timeline: Milestone[]; vendors: VendorItem[];
               runSheet: RunSlot[]; insights: Insight[]; ideas: Idea[]; ideasSource: 'gemini'|'library'|'pending' }
```

Money is always stored in **minor units** (paise/cents/pence) as integers. Formatting only at the edge via `Intl.NumberFormat` (`en-IN` for INR so lakh grouping shows correctly).

Dates are **date-only strings** (`YYYY-MM-DD`) handled with UTC arithmetic to avoid timezone drift. `today` is injected (never call `new Date()` inside the engine) → deterministic tests.

## 5. API contracts

All JSON. Request bodies limited to 16 kB. All responses include `Cache-Control: no-store` on `/api/*`.

### `GET /api/health`
`200 {"status":"ok","ai":"enabled"|"disabled","version":"1.0.0"}`

### `POST /api/ideas`
Request:
```json
{ "brief": EventBrief, "focus": "all" | IdeaCategory, "exclude": ["idea title", "..."] }
```
- `exclude` max 20 items × 80 chars (to avoid repeats on "More like this").
Response 200:
```json
{ "ideas": Idea[], "source": "gemini" | "library" }
```
Errors: 400 `{ "error": "invalid_request", "fields": { "path": "message" } }`, 429 `{ "error": "rate_limited" }`. AI failures are **not** errors to the client: they return 200 with `source: "library"`.

### `POST /api/assistant`
Request:
```json
{
  "brief": EventBrief,
  "plan": PlanDigest,           // compact: ledger [{id,percent,amountMinor}], next 8 open milestones, vendor statuses, feasibility
  "history": [{ "role": "user"|"planner", "text": "..." }],  // max 10, each ≤ 600 chars
  "question": "string ≤ 500 chars"
}
```
Response 200:
```json
{ "answer": "string ≤ 900 chars", "suggestedActions": SuggestedAction[] /* ≤ 3 */, "source": "gemini"|"rules" }
```

`SuggestedAction` (discriminated union):
```ts
{ type: 'shiftBudget', from: CategoryId, to: CategoryId, percent: number /* 0.5..20 */, rationale: string }
{ type: 'addTask', title: string /* ≤ 80 */, daysBeforeEvent: number /* 0..730 */, category: CategoryId|'general', rationale }
{ type: 'markVendor', vendorId: string, status: VendorStatus, rationale }
```
Server drops any action that fails schema or references unknown ids (ids must exist in the digest).

## 6. Error handling
- Client: `ErrorBoundary` around each tab (a broken tab never blanks the page) with a "Try again" button; API wrapper returns `Result<T, ApiError>` — never throws into components.
- Server: central error middleware maps zod errors → 400, rate limit → 429, everything else → 500 `{ "error": "internal_error", "requestId" }`. Stack traces only logged, never sent.

## 7. Configuration (`src/server/config.ts`)
```
PORT=8080
NODE_ENV=production
GEMINI_API_KEY=            # optional; absence → AI disabled, fallbacks used
GEMINI_MODEL=gemini-3.6-flash
AI_TIMEOUT_MS=20000
RATE_LIMIT_PER_MIN=20
CACHE_TTL_SECONDS=3600
CACHE_MAX_ENTRIES=200
```
Parsed with zod at boot; invalid values fail fast with a clear message (never print the key).

## 8. Scripts (`package.json`)
```
dev            concurrently vite + tsx watch src/server/index.ts (vite proxies /api → :8080)
build          vite build && tsc -p tsconfig.server.json  (server → dist/server, client → dist/client)
start          node dist/server/index.js
lint           eslint .
format         prettier --check .
typecheck      tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.server.json
test           vitest run --coverage
test:e2e       playwright test
check          npm run lint && npm run typecheck && npm run test && npm run build
```
In production Express serves `dist/client` statically with long-lived immutable cache for hashed assets and `no-cache` for `index.html`, plus SPA fallback to `index.html` for non-`/api` GETs.
