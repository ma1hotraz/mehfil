# 06 — Design System: "The Almanac"

## 1. Concept

Mehfil looks like a **printed planning almanac** — the kind of thick, letterpressed booklet a family keeps on the shelf before a wedding: cream stock, black ink, a vermilion (sindoor) second colour, ruled ledgers, railway-style timetables, ticket stubs and postcards. It borrows from Indian wedding-card stationery and from editorial print design, not from SaaS dashboards.

Three words to judge every screen against: **printed · ruled · warm.**

If a screen could be swapped into any other AI demo without anyone noticing, it is wrong.

## 2. Never do (the anti-generic list)

The evaluator and other entrants will have seen these a thousand times. None may appear:

1. No gradients of any kind (backgrounds, buttons, text). No purple, indigo or electric blue anywhere.
2. No glassmorphism, blur backdrops, neumorphism or glowing shadows. Shadows: at most one hard, offset "print" shadow (see tokens).
3. No emoji, no sparkle/magic-wand "AI" icons, no robot avatars, no chat bubbles with tails.
4. No Inter, Roboto, Poppins, Montserrat or system-ui as the visible font.
5. No grid of identical rounded cards with an icon on top, a bold title and grey text.
6. No pill-shaped primary buttons; no `border-radius` above 4px except stamps (circles) and chips (2px).
7. No centred hero with a big headline + sub-headline + two buttons + blob illustration.
8. No skeleton shimmer loaders; no spinners. Loading uses the "typesetting" pattern (§7.10).
9. No stock illustrations or 3D renders. Ornament comes from typographic rules and small SVG motifs drawn in code.
10. No dark-blue-grey "dashboard" dark mode. Dark mode is warm lamplight (§3.2).
11. No toast stacks in a corner with coloured left borders. Notices use the "Telegram slip" (§7.9).
12. No copy like "Unleash", "Elevate", "Seamless", "AI-powered magic", "Let's get started!". Voice rules in §9.

## 3. Tokens (`src/client/styles/tokens.css`)

All contrast ratios below were measured (WCAG relative luminance). Normal text needs ≥ 4.5:1, large text and UI boundaries ≥ 3:1.

### 3.1 Paper (light) — default

| Token | Value | Use | Contrast on `--paper` |
|---|---|---|---|
| `--paper` | `#F3EBDD` | page background (cream stock) | — |
| `--paper-raised` | `#FAF5EC` | tickets, postcards, inputs | — |
| `--paper-sunk` | `#E9DECB` | table header bands, tab strip | — |
| `--ink` | `#1E1915` | body text, rules | 14.7:1 |
| `--ink-soft` | `#4F453C` | secondary text, captions | 7.9:1 |
| `--sindoor` | `#A8301C` | second ink: headings accents, primary button fill, critical stamp, links | 5.7:1 (6.2 on raised, 5.1 on sunk) |
| `--peacock` | `#1D5A55` | "booked" stamp, positive state, focus ring | 6.7:1 |
| `--leaf` | `#3D6527` | "paid"/done state | 5.7:1 |
| `--umber` | `#7A4A12` | warning text | 6.3:1 |
| `--marigold` | `#D99A2B` | **fill only** (highlight bars, tab underline, ornaments). Never text. Ink text on marigold = 7.1:1 | — |
| `--rule` | `#CDBFA8` | hairline decorative rules (non-essential) | — |
| `--rule-strong` | `#7D6B55` | input borders, table borders (UI boundary) | 4.3:1 |
| `--on-sindoor` | `#FAF5EC` | text on sindoor buttons | 6.2:1 |

### 3.2 Lamplight (dark)

| Token | Value |
|---|---|
| `--paper` | `#17130F` |
| `--paper-raised` | `#221C16` |
| `--paper-sunk` | `#100D0A` |
| `--ink` | `#EFE6D6` (14.9:1) |
| `--ink-soft` | `#BCAE9B` (8.5:1) |
| `--sindoor` | `#F08468` (7.2:1) |
| `--peacock` | `#78C2B7` |
| `--leaf` | `#9CC97F` |
| `--umber` | `#E0A866` |
| `--marigold` | `#E9B04A` |
| `--rule` | `#3A3128` |
| `--rule-strong` | `#8E7C66` (4.6:1) |
| `--on-sindoor` | `#17130F` (7.2:1) |

Theme switching: `:root` = Paper; `@media (prefers-color-scheme: dark) { :root:not([data-theme="paper"]) { …lamplight } }`; `:root[data-theme="lamplight"] { …lamplight }`. `body { background: var(--paper); color: var(--ink); }`.

A unit test (`tests/unit/contrast.test.ts`) parses `tokens.css`, computes ratios for every text/background pair listed here in both themes and fails below threshold.

### 3.3 Typography

| Role | Family | Settings |
|---|---|---|
| Display (mastheads, section titles, numerals in stamps) | **Fraunces Variable** | `opsz` 72–144, `SOFT` 50, `WONK` 1 for the masthead only, weights 400/600 |
| Text (body, UI) | **Instrument Sans Variable** | 400/500/600 |
| Figures (money, dates, times, T-minus counters, percentages) | **JetBrains Mono Variable** | 400/600, `font-variant-numeric: tabular-nums` |

Scale (rem; root 16px, multiplied by user text-size preference via `--text-scale`):
`--fs-xs .8125` · `--fs-sm .9375` · `--fs-md 1.0625` (body) · `--fs-lg 1.3125` · `--fs-xl 1.75` · `--fs-2xl 2.5` · `--fs-3xl clamp(2.75rem, 6vw, 4.5rem)` (masthead).
Line-height: body 1.55, display 1.05. Measure: body text max 68ch.
Labels and tab names use **small caps** (`font-variant-caps: all-small-caps; letter-spacing: .06em`) — the single most effective "printed" signal.
Numbered sections use the section sign: "§ 2 The Ledger".

### 3.4 Space, rules, shape

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 72, 112. Generous vertical rhythm; content sits on a **12-column asymmetric grid** with a fixed left "margin column" (≈ 22%) for marginalia (labels, notes, the Planner on wide screens).
- Rules: `--hairline: 1px solid var(--rule)`; `--rule-double: 3px double var(--ink)` (ledger totals, masthead underline); `--rule-dotted: 1px dotted var(--rule-strong)` (leader lines between label and amount, like a menu).
- Radius: `--r-0: 0` default; `--r-1: 2px` chips/inputs; stamps are circles.
- Print shadow (the only shadow): `--shadow-print: 3px 3px 0 var(--ink)` on hover/focus of tickets & postcards (they "lift" like a card off a press).
- Paper texture: a single inline SVG `feTurbulence` noise as a `background-image` data URI at 4% opacity on `body` (< 1 kB). Disabled in `forced-colors` and print.

### 3.5 Motion
- Durations: 120ms (state), 240ms (enter). Easing `cubic-bezier(.2,.7,.2,1)`.
- Signature motions: **ink-in** (opacity 0→1 + 2px y-translate) for new content; **stamp** (scale 1.15→1, rotate −8°→−4°) when a vendor status changes; **turn the page** (tab change: content slides 8px from the side it came from).
- `@media (prefers-reduced-motion: reduce)`: all transitions 0ms, no transforms.

## 4. Iconography & ornament
- No icon font. ~10 hand-coded inline SVG glyphs, 1.5px stroke, square caps: arrow, check, cross, calendar, print, download, plus, minus, pencil, bell. Each `aria-hidden="true"` with visible or sr-only text beside it.
- **Ornamental rule** component: a hairline with a small centred motif — a stylised marigold (8 petals) for weddings, a candle/diya for community, a star for birthdays. Pure SVG, decorative (`role="presentation"`).
- **Corner marks**: four small L-shaped crop marks on postcards and the masthead (like printer's registration marks).

## 5. Layout per breakpoint
- `≥ 1100px`: margin column (left, 22%) + main (center) + Planner rail (right, 320px) when open.
- `720–1099px`: margin column collapses into labels above content; Planner opens as a right sheet (dialog).
- `< 720px`: single column, tabs become a horizontally scrollable strip with visible scroll affordance, Planner is a full-screen dialog. Must reflow at 320px with no horizontal page scroll.

## 6. Screens (what each must look like)

### 6.1 Front page
- A newspaper/almanac **masthead**: "MEHFIL" in Fraunces (wonky axis on), a double rule beneath, and a dateline strip in mono: "VOL. I · NO. {day of year} · {today's date} · A PLANNING ALMANAC FOR THE DAYS WORTH REMEMBERING".
- Left-aligned, two-column editorial lead: a short paragraph (drop cap in sindoor) explaining what Mehfil does, and on the right a "Contents" list (§1 The Invitation … §6 The Run Sheet) with dotted leaders and page-like numbers — this doubles as feature explanation.
- Primary button "Begin a plan →" (sindoor fill, square corners). Below: "Or try a sample:" three **sample slips** styled like torn ticket stubs ("A Jaipur wedding · 250 guests", "A seventh birthday · 25 children", "A Diwali mela · 400 neighbours").
- "Your shelf" — saved plans as **book spines** laid horizontally (thin vertical rectangles with title rotated, type colour band at top, days-to-go in mono). On mobile they become a list. Each spine is a button; a small "Remove" text button with confirm dialog.

### 6.2 Intake — "The Invitation"
- Page title "§ 1 The Invitation".
- The **invitation sentence**, set large (`--fs-xl`, Fraunces 400) on a raised paper card with a thin double border inset (like an invitation card). Blanks are inputs styled as **underlines** (no boxes): bottom border `2px solid var(--ink)`, text in sindoor while editing. Selects show a small caret glyph. Inputs auto-size to content (`field-sizing: content` with a JS fallback via `ch` width).
- Each blank has a real `<label>` (visually hidden) and a small-caps hint under the sentence on focus ("guests — between 1 and 5,000").
- "In the margins" below: two-column on desktop. Chips (`vibe`, `dietary`, `accessibility`) are rectangular, 2px radius, outlined `--rule-strong`; selected = ink fill with paper text and a check glyph (not colour alone). Textareas styled as ruled notepaper (repeating linear background of hairlines aligned to line-height — this is a pattern, not a gradient fill; it is acceptable because it renders as discrete lines).
- Submit: "Set it in type →". Secondary: "Back".

### 6.3 Almanac (plan)
- **Masthead strip**: title in Fraunces `--fs-2xl`; below, one mono line: "WEDDING · TRADITIONAL · 250 GUESTS · JAIPUR · SAT 12 MAR 2027". On the right, a large **countdown numeral** ("142" in Fraunces 600 with "days to go" in small caps) and the **Feasibility stamp**.
- **Feasibility stamp**: circular, double-ringed, text around the ring is not needed — centre text "WORKABLE" in small caps, rotated −4°, coloured by verdict (comfortable = peacock, workable = ink, tight = umber, unrealistic = sindoor). Always has text; colour is secondary.
- **Tab strip** styled like the tabbed index edge of a book: tabs are small-caps labels on `--paper-sunk` with a marigold underline (4px) on the selected tab plus `aria-selected`; tab numbers "§2".
- **Overview**: left margin holds the verdict explanation as marginalia; main column shows "Notices" — insights as a numbered list set like newspaper briefs: severity as a small-caps kicker ("WARNING ·"), bold headline, one-paragraph detail. Then three "Key figures" set as a typographic row (big mono numbers with small-caps labels, separated by vertical hairlines — not cards). Then "Next three deadlines" in timetable style.
- **Ledger**: a real `<table>`. Columns: Category · Share · Amount · Per guest · Note. Dotted leaders between category and figures; figures right-aligned mono. A **tally bar** under each category name: a 6px marigold bar whose width = share (with the % printed — never bar-only). Total row with **double rule** above. Each row has a "−" / "+" stepper (0.5% steps) and an editable % input; "Reset to recommended" text button. Committed/remaining as an expandable row.
- **Timetable**: styled like a **railway departures board printed on paper**: phase headings as "platform" bands on `--paper-sunk`; each row: due date (mono), "T–90" counter (mono, sindoor if critical), task title, category in small caps, and a checkbox drawn as a square with an ink check. Rushed items get a small-caps "RUSHED" tag in umber; overdue get "OVERDUE" in sindoor. A vertical 2px ink rail runs down the left with a dot per stop (the "line"). "Add to calendar (.ics)" and "Print" text buttons at top right.
- **Vendors**: each vendor is a **ticket stub**: raised paper rectangle with a perforated left edge (CSS radial-gradient circles masked — or an SVG edge; must not look like a gradient, it is a dotted cut line), vendor name in Fraunces, "Book by {date}" in mono, the rule reason in italic ink-soft ("Added because the event is outdoors with 250 guests"), a details disclosure "Questions to ask (4)". Status shown as an **ink stamp** in the stub's corner: TO FIND (outlined ink), ENQUIRED (umber), BOOKED (peacock), PAID (leaf) — stamp text always visible. Changing status = a segmented control with the four options (radio group). Filter by status above (radio group). Stubs flow in a 2-column masonry-free grid (fixed heights not required; use CSS grid with `align-items: start`).
- **Ideas**: **postcards**: landscape cards with crop marks; left half = category kicker + title (Fraunces) + description; right half = a hand-drawn-feel SVG "postage stamp" box containing the cost band as `₹`, `₹₹`, `₹₹₹` (or `$`, `£`, `€`) and a small postmark circle with the category initial. "Fits because…" line set in italic beneath a hairline. Actions: "Keep" (toggle, `aria-pressed`), "More like this". Source label above the grid as a small-caps rubber-stamp line: "DRAFTED BY GEMINI" or "FROM THE MEHFIL LIBRARY". While waiting: typesetting loader.
- **Run sheet**: a two-column printed **order of ceremony**: time (mono, right-aligned) | event title + owner in small caps; dotted leaders between. "Print run sheet" button. Print CSS removes everything else.

### 6.4 Ask the Planner
- Not a chat UI. It is a **"Letters to the Planner"** column: each exchange is set like a letter — the user's question in italic with a small-caps "YOU ASKED" kicker; the answer in roman text with "THE PLANNER REPLIES" kicker and a hairline between exchanges. No bubbles, no avatars.
- Suggested actions appear beneath an answer as **slips** (raised paper, dashed border) with the action in plain words ("Move 3% from Décor & flowers to Contingency (₹54,000)") and the rationale, plus "Apply" (primary) and "Not now" (text button).
- Input: a ruled textarea "Write to the Planner…" + "Send". A source line under each answer: "Answered by Gemini" / "Offline planner".

## 7. Component specs (states)

All interactive components: visible focus = `outline: 3px solid var(--peacock); outline-offset: 2px` (≥ 3:1 against both paper colours), never removed. Hit targets ≥ 24×24 CSS px (prefer 44 on touch).

1. **Button** — primary (sindoor fill, on-sindoor text, square), secondary (ink outline), text (underlined sindoor link style). States: hover = print shadow; active = shadow removed + 1px translate; disabled = 45% opacity + `aria-disabled` and still focusable only if explanation is shown.
2. **Field** (input/select/textarea) — underline or boxed variant; error state: sindoor underline + message prefixed "Check:" with icon; `aria-invalid`, `aria-describedby`.
3. **ChipGroup** — `role="group"` + `aria-labelledby`; each chip is a `<button aria-pressed>` (multi) or radio (single).
4. **Tabs** — WAI-ARIA tabs with roving tabindex, Arrow/Home/End keys, manual activation not needed (automatic OK since panels are lazy but cheap).
5. **Stamp** — `<span>` with text; decorative rotation; `forced-colors` safe.
6. **Ticket**, **Postcard** — `<article>` with heading.
7. **LedgerTable** — `<table>` with `<caption>`, `<th scope>`; steppers are buttons with accessible names "Increase Décor & flowers by 0.5 percent".
8. **Dialog** — native `<dialog>` with `showModal()`, focus trapped natively, returns focus to opener, Esc closes, labelled by its heading.
9. **Telegram slip** (notice/toast) — a narrow paper slip that drops in at top-centre of the main column with the text in mono caps ("PLAN SAVED · STOP"). Uses `role="status"`; auto-dismisses after 6s only if not focused/hovered; has a close button; never the only way information is conveyed.
10. **Typesetting loader** — a line of grey "slugs" (short ink-soft rectangles) that are replaced left-to-right by the real words when ready; with reduced motion, static text "Setting ideas in type…". `aria-busy="true"` on the region and a polite live announcement.
11. **ErrorBoundary panel** — a "Misprint" notice: "This page came off the press smudged." + "Try again".

## 8. Print stylesheet
Paper white background, ink black, hide nav/buttons/planner, show URL-free headers, avoid page breaks inside tickets/rows, run sheet starts on new page, `@page { margin: 16mm }`.

## 9. Voice & microcopy
Warm, concise, a little literary, never cute. Address the user as "you". Use the almanac metaphor lightly.
- Empty shelf: "Nothing on the shelf yet. Your first plan will live here."
- Plan ready: "Your almanac is set. Ideas are being drafted."
- AI offline: "Ideas from the Mehfil library — written by people, picked for your event."
- Error: "That didn't go through. Your plan is safe on this device."
- Never: "Oops!", "Awesome!", "Let's go!", exclamation marks in UI chrome.

## 10. Distinctiveness checklist (run before submit)
- [ ] Masthead with double rule and mono dateline on front page and plan.
- [ ] Invitation sentence intake with underline blanks.
- [ ] Ledger table with dotted leaders and tally bars (+ visible %).
- [ ] Timetable with vertical rail and T-minus counters.
- [ ] Ticket stubs with perforated edge and ink stamps.
- [ ] Postcards with crop marks and postage-stamp cost band.
- [ ] Letters-to-the-Planner layout (no chat bubbles).
- [ ] Small-caps labels everywhere; Fraunces + Instrument Sans + JetBrains Mono only.
- [ ] Lamplight dark mode is warm brown-black, not blue-grey.
- [ ] Nothing from the §2 Never-do list anywhere.
