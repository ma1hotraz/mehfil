# 11 — Efficiency & Performance

"Optimal use of resources" — CPU, network, tokens, money and the user's time.

## 1. Budgets (verified in Phase 8 and reported in README)

| Metric | Budget |
|---|---|
| Initial JS (gzip) | ≤ 95 kB (React + app shell + intake) |
| Total JS (gzip, all lazy chunks) | ≤ 160 kB |
| CSS (gzip) | ≤ 20 kB |
| Fonts | 3 variable woff2, latin subset only, ≤ 180 kB total, `font-display: swap`; only Fraunces + Instrument Sans preloaded |
| Engine `buildPlan` | < 5 ms average (test), < 50 ms worst case |
| Time to first plan after submit | no network wait (engine is local) |
| Lighthouse (mobile, production build) | Performance ≥ 95, Accessibility 100, Best Practices 100, SEO ≥ 90 |
| Container image | ≤ 200 MB |
| Cold start (Cloud Run) | < 1.5 s to first byte |

Add a tiny script `scripts/check-bundle.mjs` (run in `npm run check` after build) that gzips each file in `dist/client/assets` and fails if budgets are exceeded. No new dependency needed (`node:zlib`).

## 2. Frontend techniques
- Engine runs client-side → instant plan; AI ideas fetched after first paint and never block UI.
- Tabs are lazy (`React.lazy` + `Suspense` with the typesetting fallback) — Ledger, Timetable, Vendors, Ideas, Run sheet and Planner are separate chunks; prefetch the next likely tab on idle (`requestIdleCallback` with fallback).
- `useMemo` for derived data (sorted milestones, totals); `useReducer` for plan updates with immutable, structural sharing (only changed arrays are copied).
- Lists are short (< 60 rows) — no virtualisation library needed; do not add one.
- Debounce persistence writes (500 ms) and slider/stepper announcements.
- No UI library, no icon library, no date library (date-only UTC helpers ~40 lines), no lodash, no state library, no router library.
- `fetch` with `AbortController`: cancel in-flight ideas request when the brief changes or the view unmounts; client timeout 25 s.
- Images: none besides inline SVG. Favicon is SVG.
- `vite build` with `build.target: 'es2022'`, `cssCodeSplit: true`, manual chunk for `react`/`react-dom` so app updates don't bust the vendor cache.

## 3. Server techniques
- Stateless; Cloud Run scales to zero. `compression()` for JSON and static text.
- LRU+TTL cache for ideas (see `05` §6) — implemented in ~50 lines, no dependency.
- **In-flight de-duplication:** if an identical ideas request (same cache key) is already pending, await the same promise instead of calling Gemini twice.
- Gemini: smallest adequate model by default (Flash family), `maxOutputTokens` 2048 for ideas / 700 for assistant, lowest thinking level supported, prompts kept compact (plan digest, not full plan; ≤ 10 history turns).
- Timeouts and one bounded retry only.
- Static assets: hashed filenames, `Cache-Control: public, max-age=31536000, immutable`; `index.html` `no-cache`.
- Graceful shutdown on `SIGTERM` (Cloud Run): stop accepting, finish in-flight within 10 s.

## 4. Developer-resource efficiency
- Single package, single `tsconfig` base, one test runner for all non-e2e tests.
- CI caches `~/.npm`; Playwright installs only chromium.

## 5. README "Efficiency" section
List: local engine (zero-latency plans), lazy tabs, tiny dependency set (list them), caching + de-dup of AI calls, token caps, bundle sizes from the last build, Lighthouse scores.
