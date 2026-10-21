# 09 — Accessibility (WCAG 2.2 AA)

Accessibility is both a judged criterion and part of Mehfil's product idea: guests' access needs drive the plan itself (`04` rules R04 and vendor cross-cuts). The interface must match that standard.

## 1. Global requirements

- `<html lang="en">`; `<title>` updates per view: "The Invitation — Mehfil", "Ananya & Kabir · Ledger — Mehfil".
- Landmarks: one `<header>` (banner), `<nav aria-label="Plan sections">` for tabs, one `<main id="main">`, `<aside aria-label="Letters to the Planner">` when open, `<footer>`.
- **Skip link** "Skip to content" as first focusable element, visible on focus.
- Exactly one `<h1>` per view; headings never skip levels (h1 masthead → h2 tab panel title → h3 items).
- Colour contrast per `06` §3 — enforced by `tests/unit/contrast.test.ts` and axe.
- Information never by colour alone: stamps, severities, rushed/overdue flags and selected chips all carry text or a glyph + text.
- Focus visible on every interactive element (3px peacock outline, offset 2px); never `outline: none` without replacement. Focus not obscured by sticky headers (`scroll-padding-top` equal to sticky height) — WCAG 2.4.11.
- Target size ≥ 24×24 CSS px (WCAG 2.5.8); steppers and checkboxes use 32px hit areas.
- Reflow: no horizontal page scroll at 320 CSS px; content readable at 200% zoom; text spacing overrides (WCAG 1.4.12) must not clip content — avoid fixed heights on text containers.
- Text-size preference (100/115/130%) scales `--text-scale` on `:root`.
- `prefers-reduced-motion` honoured (06 §3.5). `forced-colors: active`: stamps/borders use `CanvasText`, focus uses `Highlight`, paper texture removed.
- Language: currency formatted with `Intl`; for INR amounts screen readers read digits correctly (no visual-only separators).
- No time limits; telegram slips auto-dismiss only when not hovered/focused and their content is also reflected in the page state.

## 2. Live announcements (`useAnnouncer`)

Two visually hidden regions mounted once in `App`: `aria-live="polite"` and `aria-live="assertive"` (assertive only for errors blocking the user).

| Event | Message (polite) |
|---|---|
| Plan generated | "Your almanac is ready. 6 notices, 18 tasks, 11 vendors. Ideas are being drafted." |
| Ideas loaded | "{n} ideas added, from {Gemini / the Mehfil library}." |
| Ledger change | "Décor & flowers now 9.5 percent, ₹1,71,000. Other categories adjusted. Total unchanged." |
| Task toggled | "Book venue marked done. 17 tasks remain." |
| Vendor status | "Caterer marked booked." |
| Planner reply | "The Planner replied." (+ the reply is in a region the user can navigate to) |
| Action applied | the notice text from `applyAction` |
| Save | "Plan saved on this device." (debounced, max once per 10 s) |

## 3. Component requirements

**Invitation sentence (intake)**
- The sentence is a `<fieldset>` with `<legend>` "Event details" (visually hidden); each blank is an `<input>`/`<select>` with its own `<label>` (visually hidden, e.g. "Number of guests") — the visible sentence text around it is **not** used as the label.
- `inputmode="numeric"` for guests; budget field accepts digits and separators, parsed safely; date uses `<input type="date">`.
- Hints via `aria-describedby`. Errors: `aria-invalid="true"`, message element id in `aria-describedby`, error summary at top of form (`role="alert"` on submit failure) with links that move focus to each field.
- Required fields marked `required` and "(required)" in the hidden label.

**Chip groups** — `<fieldset><legend>` + buttons with `aria-pressed`; for max-3 vibe, when the limit is reached the remaining unpressed chips get `aria-disabled="true"` and a visible note "Up to three".

**Tabs** — `role="tablist"` with `aria-label="Plan sections"`, `role="tab"` with `aria-selected`, `aria-controls`, roving `tabindex`; panels `role="tabpanel"` `aria-labelledby` the tab, `tabindex="0"`. Keys: ←/→, Home/End. Hash sync must not move focus unexpectedly.

**Focus management**
- After intake submit: focus moves to the plan `<h1>` (`tabindex="-1"`).
- On view change: focus to the new view's `<h1>`.
- Dialogs: native `<dialog>.showModal()`, initial focus on first field, focus returns to the trigger on close.
- After "Apply" on a planner action: focus stays on the slip, which is replaced by the notice text.
- Deleting a shelf item: focus to the next item or the "Begin a plan" button.

**Ledger** — `<table>` with `<caption>` ("Budget allocation, total ₹18,00,000"), `<th scope="col">` and `<th scope="row">`. Stepper buttons with explicit names ("Increase Venue by 0.5 percent"). The % input labelled "Venue share in percent". Tally bars are `aria-hidden` (the number is in the cell).

**Timetable** — a list per phase (`<section aria-labelledby>` + `<ol>`). Each task's checkbox is a native `<input type="checkbox">` labelled by the task title; due date and T-minus are text in the label's description (`aria-describedby`). "RUSHED"/"OVERDUE" tags are text.

**Vendors** — each ticket is an `<article aria-labelledby>`; status is a `role="radiogroup"` of native radios (visually segmented); questions list behind `<details><summary>`. Contact fields labelled; note that they stay on this device.

**Ideas** — postcards are `<article>` with `<h3>`; cost band has text alternative: visually "₹₹", accessible "Cost: medium". "Keep" is a toggle with `aria-pressed`. Loading region has `aria-busy`.

**Planner** — the conversation is an `<ol aria-label="Correspondence">`; each answer has a heading-level-free kicker. Input `<textarea>` labelled "Your question for the Planner", `maxlength=500` with a live character count only announced at 450+. Suggested action slips are `<article>` with clear button names ("Apply: move 3% from Décor & flowers to Contingency").

**Stamps / ornaments** — decorative SVGs `aria-hidden="true"`; status text available as normal text.

**Print** — print CSS keeps headings and table semantics.

## 4. Inclusive content
- Plain language; abbreviations expanded ("T–90" has `aria-label="90 days before the event"` on its span, via `<abbr title>` or sr-only text).
- Dates shown as "Fri 12 Mar 2027" with `<time datetime="2027-03-12">`.
- Errors explain how to fix ("Enter a date from today up to three years ahead").

## 5. Testing (also in `10_TESTING.md`)
- `vitest-axe` on every component and every tab panel in both themes (toggle `data-theme`).
- Playwright + `@axe-core/playwright` on: front page, intake (with errors shown), each almanac tab, planner open, mobile viewport 375px, `prefers-reduced-motion`, dark scheme. Zero violations required (tags `wcag2a, wcag2aa, wcag21aa, wcag22aa`).
- Keyboard e2e: complete flow 1 (create plan) and flow 3 (apply a planner action) using only `Tab`, `Shift+Tab`, `Enter`, `Space`, arrows.
- Contrast unit test from tokens.

## 6. `ACCESSIBILITY.md` (short section in README is enough)
State: target WCAG 2.2 AA, what was tested (axe automated + keyboard e2e + reflow at 320px + reduced motion + forced colors), and known limitations (if any).
