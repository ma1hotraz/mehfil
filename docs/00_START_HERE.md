# Mehfil — Build Doc Pack (Start Here)

> **Mehfil** (Hindi/Urdu: *a gathering*) — a GenAI planning almanac for weddings, birthdays and community events. It turns one sentence about your event into a costed budget ledger, a countdown timetable, a context-aware vendor checklist, personalised ideas and a day-of run sheet — plus an assistant that reasons about *your* plan.

This folder is a complete specification. A coding agent (Claude Code, Antigravity, Cursor, Gemini CLI, Codex) can build, test and deploy the whole project from it. You only paste the master prompt.

---

## How to use this pack (3 steps)

1. Create an empty folder, e.g. `mehfil/`, and copy this whole folder into it as `docs/`.
2. (Recommended) Connect the **Stitch MCP** to your coding agent — see `07_STITCH_UI_PROMPTS.md` §1. If you skip it, the agent builds the UI straight from `06_DESIGN_SYSTEM.md`, which is fully specified on its own.
3. Open the agent in `mehfil/` and paste the contents of **`01_MASTER_BUILD_PROMPT.md`**. That's it.

Have ready: a **Gemini API key** (Google AI Studio) and, for deployment, a **Google Cloud project** (Cloud Run). The app runs and passes every test *without* a key — AI features fall back to a curated local library.

---

## Doc index (the agent reads them in this order)

| # | File | Defines | Criterion it serves |
|---|------|---------|---------------------|
| 00 | `00_START_HERE.md` | This index | — |
| 01 | `01_MASTER_BUILD_PROMPT.md` | The one prompt you paste | All |
| 02 | `02_PRODUCT_SPEC.md` | Problem, users, features, flows, acceptance criteria | Problem Statement Alignment |
| 03 | `03_ARCHITECTURE.md` | Stack, folder tree, data models, API contracts | Code Quality, Efficiency |
| 04 | `04_DECISION_ENGINE.md` | Deterministic rules: budget, timeline, vendors, risks | Alignment ("logical decision making") |
| 05 | `05_AI_INTEGRATION.md` | Gemini prompts, JSON schemas, guardrails, fallback | Alignment, Security |
| 06 | `06_DESIGN_SYSTEM.md` | Visual language, tokens, components, anti-generic rules | UI/UX, Accessibility |
| 07 | `07_STITCH_UI_PROMPTS.md` | Stitch MCP setup + screen-by-screen prompts | UI/UX distinctiveness |
| 08 | `08_SECURITY.md` | Threat model + mandatory controls | Security |
| 09 | `09_ACCESSIBILITY.md` | WCAG 2.2 AA requirements per component | Accessibility |
| 10 | `10_TESTING.md` | Test strategy, required cases, coverage gates | Testing |
| 11 | `11_PERFORMANCE.md` | Budgets, caching, bundle limits | Efficiency |
| 12 | `12_CODE_QUALITY.md` | Conventions, lint, CI, README template | Code Quality |
| 13 | `13_DEPLOYMENT.md` | Docker, Cloud Run, secrets | Practical usability |
| 14 | `14_BUILD_PHASES.md` | Ordered phases with verification gates | All |
| 15 | `15_SUBMISSION_CHECKLIST.md` | Final audit mapped to scoring | All |

---

## Why this stands out from other submissions

Most entries will be a chat box + a Gemini call + a purple-gradient card grid. Mehfil differs on purpose:

1. **AI for creativity, rules for arithmetic.** Budgets, dates and checklists come from a tested, deterministic decision engine. Gemini writes ideas and answers questions; its suggestions can only change the plan through a whitelist of typed actions the user confirms. That is the strongest answer to "logical decision making" *and* "safe and responsible implementation".
2. **Instant first result.** The engine runs in the browser — the plan appears in under 100 ms; AI ideas arrive afterwards. Efficiency the user can feel.
3. **A UI that looks printed, not generated.** An editorial "almanac" language: letterpress paper, ruled ledgers, a railway-timetable countdown, perforated vendor tickets with ink stamps, postcards for ideas. No gradients, glassmorphism, emoji, sparkle icons or Inter.
4. **Inclusive by default.** Guests' accessibility needs (step-free access, hearing support, dietary needs) feed the decision engine itself, not only the UI.
5. **Real-world outputs.** Calendar (.ics) export, printable run sheet, local saves that survive refresh, INR/USD/EUR/GBP.
