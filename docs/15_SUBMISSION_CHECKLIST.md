# 15 — Submission Checklist (mapped to scoring)

For each item, the agent shows evidence (command output or `file:line`). Every box must be ticked before submission.

## Problem Statement Alignment — High impact
- [ ] Weddings, birthdays and community events each have distinct sub-types, allocations, milestones, vendors, run sheets and fallback ideas (`src/shared/engine/data/*`).
- [ ] Budgets: Ledger tab with exact totals, editable allocations, per-guest figures, feasibility verdict.
- [ ] Timelines: Timetable tab with compression for short lead times, rushed/overdue flags, .ics export.
- [ ] Vendor checklists: context-aware vendors with reasons, book-by dates, questions, status tracking.
- [ ] Personalised ideas: Gemini ideas tied to the brief ("fits because"), dietary/access conflicts filtered, labelled source, library fallback.
- [ ] Smart, dynamic assistant: Planner answers about *this* plan and proposes whitelisted actions the user can apply.
- [ ] Logical decisions: insights with rule ids visible in the UI explaining every automatic change.
- [ ] Sample briefs on the front page let a judge see a full plan in one click.
- [ ] README "How it meets the brief" table points to real code paths.

## Security — High impact
- [ ] No API key in client bundle: `grep -rE "GEMINI_API_KEY|AIza" dist/client` returns nothing.
- [ ] `.env` ignored; only `.env.example` committed; CI secret scan step present.
- [ ] CSP without `unsafe-inline`/`unsafe-eval`; helmet headers; `x-powered-by` disabled; Permissions-Policy set (API test proves it).
- [ ] Rate limits on AI routes and globally (test proves 429).
- [ ] zod validation on all bodies, `.strict()`, size limit 16 kB, 415 on wrong content type (tests).
- [ ] Prompt-injection defences and tests; action whitelist; no `dangerouslySetInnerHTML` (lint rule on).
- [ ] Errors never leak stack traces (test).
- [ ] `npm audit --omit=dev --audit-level=high` clean.
- [ ] `SECURITY.md` with threat model, OWASP LLM mapping, data handling.
- [ ] Container runs as non-root.

## Code Quality — High impact
- [ ] `npm run lint` zero warnings; `npm run typecheck` clean; `npm run format` clean.
- [ ] No `any`, `@ts-ignore`, `eslint-disable` without justification (`grep -rn "any\b\|ts-ignore\|eslint-disable" src` reviewed).
- [ ] Layer boundaries enforced by lint; engine pure (no `Date.now`, `Math.random`, `fetch` in `src/shared`).
- [ ] Functions/components/files within size limits from `12` §1.
- [ ] TSDoc on public engine/AI functions.
- [ ] Conventional commits; single `main` branch; repo has no build output, binaries or screenshots.

## Testing — Medium impact
- [ ] `npm test` green with thresholds met (paste coverage summary).
- [ ] Property tests present and passing.
- [ ] API tests cover success, validation, security headers, rate limit, AI failure fallbacks.
- [ ] Component tests with axe for every component.
- [ ] `npm run test:e2e` green (create plan, keyboard, ledger persistence, export, a11y, CSP, reflow).
- [ ] No test calls the network.

## Efficiency — Medium impact
- [ ] Bundle budgets pass (`scripts/check-bundle.mjs` output).
- [ ] Engine performance test passes.
- [ ] Ideas cache + in-flight de-dup implemented and tested.
- [ ] Lazy-loaded tabs (check `dist/client/assets` has separate chunks).
- [ ] Token caps and timeouts configured.
- [ ] Lighthouse scores recorded in README.

## Accessibility — Low impact (needed for a perfect score)
- [ ] Zero axe violations across all screens, themes and viewports.
- [ ] Keyboard-only flows pass; visible focus everywhere; skip link works.
- [ ] Live announcements for plan ready, ideas loaded, changes applied.
- [ ] Reflow at 320px; reduced motion; forced colors; text-size control.
- [ ] Contrast test passes for both themes.

## UI distinctiveness (your own goal)
- [ ] `06_DESIGN_SYSTEM.md` §10 checklist fully ticked.
- [ ] Style-guard test passes (no emoji, no banned fonts, no stray gradients/radii).
- [ ] Voice and microcopy follow `06` §9 (no "Oops!", no exclamation marks in UI chrome).

## Deployment & docs
- [ ] Deployed to Cloud Run; `/api/health` shows `ai: enabled`; live URL in README.
- [ ] README follows the template in `12` §7, every claim matches the code.
- [ ] `docs/` folder kept in repo (shows the design process).

## Final report (the agent prints this)
```
Tests: <n> unit/component/API · <n> property · <n> e2e — all passing
Coverage: lines <x>% · branches <x>% · engine <x>%
Bundle: initial <x> kB gz · total <x> kB gz · CSS <x> kB gz
Axe: 0 violations on <n> screen/theme/viewport combinations
Lighthouse (mobile): Perf <x> · A11y <x> · BP <x> · SEO <x>
Live URL: <url>
```
