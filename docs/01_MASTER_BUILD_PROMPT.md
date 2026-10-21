# Master Build Prompt

Copy everything inside the block below and paste it into your coding agent, opened in the project root (the folder that contains `docs/`).

---

```text
You are a senior full-stack engineer building "Mehfil", a GenAI-powered Celebration & Event
Planner, for a judged coding challenge. An AI evaluator will score the repository on:
Code Quality, Security, Efficiency, Testing, Accessibility and Problem Statement Alignment.
The target is a perfect score on every criterion.

The complete specification is in ./docs. It is authoritative. Before writing any code:

1. Read every file in ./docs in numeric order (00 → 15). Do not skim. If two docs ever
   disagree, the more specific doc wins (e.g. 04_DECISION_ENGINE beats 02_PRODUCT_SPEC on
   engine rules), and 08_SECURITY / 09_ACCESSIBILITY override any visual preference.
2. Follow 14_BUILD_PHASES.md exactly, phase by phase. Each phase ends with a verification
   gate (commands that must pass). Do not start the next phase until the gate is green.
   Fix failures at the root cause; never delete, skip or weaken a test to get green.
3. UI: if a Stitch MCP server is connected (check your tool list for Stitch tools such as
   create_project / generate_screen_from_text / get_screen), follow 07_STITCH_UI_PROMPTS.md
   to generate the screens, then translate them into React components that use the tokens
   in 06_DESIGN_SYSTEM.md. Stitch output is a visual reference only: never paste its
   Tailwind/HTML directly. If Stitch is not available, build the UI directly from
   06_DESIGN_SYSTEM.md. Either way, obey its "Never do" list — the UI must not look
   AI-generated or templated.

Non-negotiable rules:
- TypeScript strict everywhere. No `any`, no `@ts-ignore`, no disabled lint rules without a
  one-line justification comment.
- All money/date/checklist logic lives in the pure, deterministic decision engine
  (src/shared/engine). The LLM never produces numbers that enter the budget or dates.
- The Gemini API key exists only on the server, read from env. Never ship it to the client,
  never log it, never commit it. Commit .env.example only.
- Every external input (HTTP bodies, localStorage, LLM output) is validated with zod.
- The app must fully work, and all tests must pass, with no GEMINI_API_KEY set
  (deterministic fallback). Tests never call the real Gemini API.
- Keep the repository small: no build output, no node_modules, no screenshots or binaries
  committed. One branch (main).
- Accessibility target: WCAG 2.2 AA. Automated axe checks must report zero violations.
- Write the README exactly per the template in 12_CODE_QUALITY.md.

Working style:
- Use a task list mirroring the phases in 14_BUILD_PHASES.md and tick items off.
- Commit at the end of each phase with a Conventional Commit message.
- When everything is done, run the full audit in 15_SUBMISSION_CHECKLIST.md, fix anything
  that fails, and report the final results (test counts, coverage %, bundle size, axe
  results, Lighthouse scores if you can run them) in a short summary.

Start now with Phase 0.
```

---

## If the agent stops midway

Paste this to resume:

```text
Continue building Mehfil. Re-read docs/14_BUILD_PHASES.md, check which phase gates already
pass by running their verification commands, and resume from the first failing or
unfinished phase. Same rules as before.
```

## If you want a final hardening pass

```text
Run docs/15_SUBMISSION_CHECKLIST.md item by item against the current repository. For each
item, show the evidence (command output or file:line). Fix every item that fails, then
re-run the whole checklist and the full test suite.
```

## If the UI drifts toward a generic look

```text
Audit every screen against the "Never do" list and the signature components in
docs/06_DESIGN_SYSTEM.md. List each violation with file:line, then fix them. The UI must
read as a printed almanac (letterpress paper, ruled ledger, timetable, ticket stubs,
postcards), not as a SaaS dashboard.
```
