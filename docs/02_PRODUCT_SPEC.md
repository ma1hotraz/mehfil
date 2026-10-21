# 02 — Product Specification

## 1. Problem statement (verbatim intent)

> Create a GenAI-powered planning assistant that helps users organize **weddings, birthdays, and community events** with **budgets, timelines, vendor checklists, and personalized ideas**.

Expectations the product must visibly demonstrate:

| Expectation | How Mehfil demonstrates it | Where |
|---|---|---|
| Smart, dynamic assistant | "Ask the Planner" assistant that reads the current plan and proposes typed changes; ideas regenerate when context changes | §4.6, `05_AI_INTEGRATION.md` |
| Logical decision making based on user context | Deterministic engine adapts budget split, timeline, vendors and risks to event type, sub-type, guests, budget, lead time, venue setting, season, dietary & accessibility needs | `04_DECISION_ENGINE.md` |
| Practical, real-world usability | Calendar export, printable run sheet, saved plans, editable allocations, multi-currency, works without AI | §4.7–4.9 |
| Clean, maintainable code | Layered architecture, pure engine, typed contracts, tests | `03`, `12` |

Every one of the four nouns in the problem statement — **budgets, timelines, vendor checklists, personalised ideas** — is a first-class section of the plan. Every one of the three event kinds — **wedding, birthday, community** — has its own rules, sub-types, templates and fallback ideas.

## 2. Users (personas)

1. **Ananya, 29, planning her own wedding in Jaipur** — 250 guests, ₹18 lakh, 7 months away, a parent who uses a wheelchair. Needs: a realistic split of money, what to book first, a reminder that venues need step-free access.
2. **Rahul, 38, dad planning a 7th birthday** — 25 kids, ₹40,000, 3 weeks away, two kids with nut allergies. Needs: fast plan, kid-friendly ideas, allergy-safe catering checklist.
3. **Meera, 45, resident-welfare association secretary** — Diwali community mela in a public park, 400 attendees, ₹2.5 lakh, volunteers. Needs: permits, safety/medical, crowd logistics, a day-of run sheet to share with volunteers.
4. **Sam, 33, in London** — milestone 40th birthday dinner, 40 guests, £3,000. Needs: currency other than INR, elegant ideas.

## 3. Information captured (Event Brief)

Required (the "invitation sentence"):
- `eventType`: `wedding | birthday | community`
- `subType` (depends on type):
  - wedding: `traditional | intimate | destination | court-and-reception`
  - birthday: `kids | teen | adult | milestone`
  - community: `festival | fundraiser | cultural-night | drive` (drive = cleanup/donation drive)
- `title` (optional, e.g. "Ananya & Kabir") — max 80 chars
- `date` (ISO, must be today or later, max 3 years ahead)
- `guestCount` (integer 1–5000)
- `budget` (positive number, max 10^10) + `currency` (`INR | USD | EUR | GBP`)
- `city` (free text, max 60 chars)
- `setting`: `indoor | outdoor | mixed`

Optional ("the margins"):
- `vibe`: up to 3 of `classic, playful, minimalist, festive, rustic, elegant, eco-conscious, cultural`
- `dietary`: multi-select `vegetarian, vegan, jain, halal, gluten-free, nut-allergy, kids-menu`
- `accessibility`: multi-select `step-free, hearing-support, visual-support, seating-rest-areas, sensory-friendly, elderly-guests`
- `traditions` (free text, max 200) — e.g. "Mehendi and sangeet, Rajasthani customs"
- `mustHaves` (free text, max 300) — e.g. "live ghazal singer, no plastic"

## 4. Features

### 4.1 Front page (landing)
- Masthead with product name, issue line ("Vol. I · A planning almanac"), one-paragraph pitch.
- Primary action: "Begin a plan". Secondary: "Open a saved plan" (shelf of saved plans from localStorage, newest first, each with title, type, date, days-to-go, delete with confirmation).
- Three sample briefs ("Try: a Jaipur wedding / a 7th birthday / a Diwali mela") that prefill the intake — makes the demo instant for judges.

### 4.2 Intake ("The Invitation")
- The required fields are presented as a **fill-in sentence** ("We are planning a [wedding ▾] — [traditional ▾] — for [250] guests in [Jaipur] on [12 Mar 2027], [outdoors ▾], with a budget of [₹ 18,00,000]."). Each blank is a real labelled form control.
- Below: "In the margins" — optional fields as chip groups and two textareas.
- Validation: inline, on blur and on submit, messages linked via `aria-describedby`; summary of errors at top on submit with links to fields.
- Submit → plan is generated instantly by the engine (client side); AI ideas requested in background.

### 4.3 The Almanac (plan view) — sections as tabs
Header strip: title, event line, date, **days to go**, a **Feasibility verdict** stamp (`Comfortable / Workable / Tight / Unrealistic`) with one-line reason.

Tabs (ARIA tabs pattern, URL hash synced, e.g. `#ledger`):
1. **Overview** — verdict explanation, the top 3–6 **insights** (risks and recommendations from the engine, each with severity and "why"), key numbers (per-guest budget, contingency, next 3 deadlines).
2. **Ledger** (budgets) — table of categories: allocation %, amount, per-guest amount, note. User can adjust any category with a stepper/slider; other categories rebalance proportionally, total stays exact; "Reset to recommended". Shows "spent/committed" input per line (optional) and remaining.
3. **Timetable** (timelines) — milestones from today to the event day grouped by phase ("6+ months", "3 months", "1 month", "Final week", "Day of", "After"); each with due date, relative label ("T–90 days"), category, done checkbox; overdue and "rushed" flags; export `.ics`.
4. **Vendors** (vendor checklists) — ticket-stub cards per vendor type: why it's needed (rule reason), when to book, 3–5 questions to ask, status cycle `To find → Enquired → Booked → Paid`, optional name/phone/notes (stored locally only). Filter by status.
5. **Ideas** (personalised ideas) — AI postcards in categories: Theme, Décor, Food & Drink, Activities, Favours/Keepsakes, plus "Inclusion touches". Each card: title, 1–2 sentence description, estimated cost band (`₹ / ₹₹ / ₹₹₹` relative, not numbers), "fits because…" line tying it to the brief. Actions: save to shortlist, "More like this", "Regenerate section". Badge showing source: "Drafted by Gemini" or "From the Mehfil library" (fallback).
6. **Run Sheet** — day-of schedule (engine template adjusted for type and setting), roles column, printable layout.

### 4.4 Plan editing
- "Edit brief" reopens intake prefilled; on save, the engine regenerates; user edits that are still valid (done tasks, vendor statuses, custom allocations) are preserved by id where possible.

### 4.5 Insights (decision visibility)
Every engine decision that changes the plan produces an `Insight` with `{id, severity: info|advice|warning|critical, title, detail, ruleId}` — so the user sees *why* (e.g. "Outdoor in monsoon season → 5% set aside for weather cover").

### 4.6 Ask the Planner (assistant)
- Opens as a side "margin" panel (dialog on mobile).
- User asks free-text questions ("Can I cut decor to afford a photographer?").
- Server sends Gemini a compact plan summary + question; reply is structured: `answer` (≤ 120 words) + up to 3 `suggestedActions` from a whitelist:
  - `shiftBudget {fromCategory, toCategory, percent}`
  - `addTask {title, daysBeforeEvent, category}`
  - `markVendor {vendorId, status}`
- Each action is shown as a card with "Apply" / "Dismiss". Applying goes through the engine (validates, rebalances). Nothing changes without a click.
- Conversation kept in memory for the session (max 10 turns sent as context, truncated).
- Without an API key: assistant answers with a rule-based reply for common intents (budget cut, add task, what next) and states it is in offline mode.

### 4.7 Exports
- `.ics` file of all incomplete timetable milestones (all-day events, RFC 5545, escaped text).
- Print stylesheet: Overview + Ledger + Timetable + Vendors + Run Sheet, paper-friendly.
- "Copy plan as text" (plain text summary to clipboard).

### 4.8 Persistence
- Plans saved automatically to `localStorage` (key `mehfil:v1:plans`), schema-versioned, validated with zod on load; corrupt entries discarded with a notice. Max 20 plans. No server storage of personal data.

### 4.9 Theme & preferences
- Light ("Paper") and dark ("Lamplight") themes; respects `prefers-color-scheme`, user toggle persisted.
- Respects `prefers-reduced-motion`.
- Text size control (100% / 115% / 130%).

## 5. Primary flows

1. **First plan:** Front page → Begin → fill sentence → Submit → Almanac Overview (focus moves to plan heading; live region announces "Plan ready. Ideas are being drafted.") → ideas arrive (live region: "6 ideas added").
2. **Adjust budget:** Ledger → increase Photography +3% → others rebalance → total unchanged → insight updates if feasibility changes.
3. **Ask:** Open Planner → "We're short by ₹50,000, what should I cut?" → answer + `shiftBudget` suggestions → Apply one → Ledger reflects change, toast "Moved 3% from Décor to Contingency".
4. **Track:** Timetable → tick tasks → Overview "next 3 deadlines" updates → export .ics.
5. **Return:** Front page → saved shelf → open plan.

## 6. Acceptance criteria (testable)

- AC1: For any valid brief, the ledger amounts sum **exactly** to the budget (in minor units).
- AC2: Every event type × sub-type combination produces non-empty ledger, timetable (≥ 8 milestones), vendors (≥ 6), run sheet (≥ 6 slots) and ≥ 6 ideas (AI or fallback).
- AC3: Lead time shorter than a milestone's ideal offset compresses it and marks it `rushed`; no milestone is ever dated before today or after the event (except "After" phase).
- AC4: Context rules fire as specified in `04_DECISION_ENGINE.md` (e.g. outdoor + monsoon month in India → weather-cover line + warning insight).
- AC5: With no API key, every feature works, ideas are labelled "From the Mehfil library".
- AC6: Invalid input never reaches the engine or the LLM; the API returns 400 with field errors.
- AC7: Assistant suggested actions are only from the whitelist; invalid ones are dropped server-side.
- AC8: Keyboard-only users can complete flows 1–5; axe reports zero violations on every screen.
- AC9: Plan generation (engine) < 50 ms for 5,000 guests on a mid-range laptop; first plan visible without waiting for the network.
- AC10: Refreshing the page restores the open plan.

## 7. Out of scope (state this in README)
Payments, real vendor marketplace/booking, user accounts, multi-user collaboration, server-side storage of personal data. (Rationale: privacy by design and scope focus.)
