# 07 — Stitch MCP: Setup and Screen Prompts

Google Stitch generates UI designs from text. Through its MCP server, your coding agent can create a Stitch project, generate screens, read them back and iterate — without you exporting anything. In Mehfil, **Stitch is a design-exploration tool; `06_DESIGN_SYSTEM.md` remains the source of truth.** Stitch output is translated into our React + CSS tokens, never pasted in.

> If you can't connect Stitch, skip this file entirely. The agent builds from `06_DESIGN_SYSTEM.md`, which is complete.

---

## 1. Connect Stitch to your coding agent (one-time, done by you)

Stitch's official MCP endpoint is a remote HTTP server at `https://stitch.googleapis.com/mcp`, authenticated with a Stitch API key (created in Stitch settings) or Google Cloud credentials. Follow the official guide for your agent: **https://stitch.withgoogle.com/docs/mcp/setup** — config formats differ per client and change over time.

Typical shapes (verify against the official page):

**Claude Code**
```bash
claude mcp add stitch --transport http https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: YOUR_STITCH_API_KEY"
claude mcp list        # should show "stitch" as connected
```

**Cursor / Antigravity / VS Code** (`mcp.json` or the agent's MCP panel → raw config)
```json
{
  "mcpServers": {
    "stitch": {
      "url": "https://stitch.googleapis.com/mcp",
      "headers": { "X-Goog-Api-Key": "YOUR_STITCH_API_KEY" }
    }
  }
}
```
If you use Google Cloud credentials instead of a key, the guide also has you enable the service: `gcloud beta services mcp enable stitch.googleapis.com --project=YOUR_PROJECT_ID`.

Restart the agent and confirm tools such as `create_project`, `generate_screen_from_text`, `get_screen` appear. **Never commit the Stitch key**; it lives only in your agent's local config.

---

## 2. Workflow the agent must follow (Phase 5 in `14_BUILD_PHASES.md`)

1. Discover the Stitch tool names actually exposed (they may differ slightly from the names below) and use those.
2. `create_project` named **"Mehfil — The Almanac"**.
3. If a design-system tool exists (e.g. `create_design_system`), create one from §3. Otherwise prepend §3 to every screen prompt.
4. Generate screens in this order, one prompt each (§4): S1 Front page → S2 Invitation → S3 Almanac/Overview → S4 Ledger → S5 Timetable → S6 Vendors → S7 Ideas → S8 Run sheet → S9 Planner → S10 Mobile Almanac.
5. After each screen, read it back (`get_screen` or equivalent), and **review it against `06_DESIGN_SYSTEM.md` §2 (Never do) and §10**. If it violates anything (gradients, pill buttons, card grids with icons, Inter, emoji, blue-grey dark mode…), request an edit with the corrective prompt in §5. Max 3 iterations per screen.
6. When a screen is acceptable, translate its **layout and composition** into React components under `src/client/features/**` using our tokens and components. Do not copy Tailwind classes, inline colours, image URLs or fonts from Stitch. Keep our semantic HTML and ARIA from `09_ACCESSIBILITY.md`.
7. Save a short `docs/design-notes.md` (≤ 60 lines): Stitch project name, screens generated, what was kept, what was changed and why. No screenshots in the repo.

---

## 3. Design-system preamble (paste into Stitch design system, or prefix every prompt)

```
DESIGN SYSTEM — "The Almanac" (Mehfil, an event planner for weddings, birthdays and community events)

Concept: a printed planning almanac / Indian wedding-card stationery meets editorial newspaper
design. Letterpress feel: cream paper, black ink, a vermilion second ink. Printed, ruled, warm.

Colours (light "Paper"): page #F3EBDD, raised paper #FAF5EC, sunk band #E9DECB, ink #1E1915,
soft ink #4F453C, vermilion #A8301C (accents, primary button fill, links), peacock teal #1D5A55
(positive/booked, focus ring), leaf green #3D6527 (paid/done), umber #7A4A12 (warnings),
marigold #D99A2B (ONLY as thin highlight bars/underlines, never text), hairline rule #CDBFA8,
strong rule #7D6B55.
Dark "Lamplight": page #17130F, raised #221C16, ink #EFE6D6, vermilion #F08468, peacock #78C2B7.
Warm brown-black, never blue-grey.

Type: Fraunces (serif display, soft and slightly wonky) for titles and big numerals;
Instrument Sans for body/UI; JetBrains Mono for all money, dates, times, percentages.
Labels and tab names in SMALL CAPS with letter-spacing. Section numbers with "§".

Shape & ornament: square corners (0–2px). Hairline and double rules. Dotted leader lines between
labels and figures like a restaurant menu. Printer's crop marks on cards. Circular ink stamps
for statuses. One hard offset shadow (3px 3px 0 ink) on hover only.
Layout: asymmetric 12-column editorial grid with a left margin column for marginalia.

STRICTLY AVOID: gradients, glassmorphism, blur, glow, purple/indigo/blue, emoji, sparkle or
robot icons, chat bubbles, pill buttons, rounded card grids with icons on top, centred hero
with blob illustration, Inter/Roboto/Poppins, stock illustrations, skeleton shimmer loaders.
```

---

## 4. Screen prompts

### S1 — Front page (desktop 1440)
```
Front page of Mehfil. A newspaper-style masthead: the word MEHFIL very large in a soft wonky
serif, a double ink rule under it, then a monospaced dateline strip: "VOL. I · NO. 294 ·
WEDNESDAY 21 OCTOBER 2026 · A PLANNING ALMANAC FOR THE DAYS WORTH REMEMBERING".
Below, a left-aligned two-column editorial lead: left column a paragraph with a vermilion drop
cap explaining that Mehfil turns one sentence about your wedding, birthday or community event
into a budget ledger, a countdown timetable, a vendor checklist, personalised ideas and a run
sheet. Right column a "Contents" list: §1 The Invitation, §2 The Ledger, §3 The Timetable,
§4 The Vendors, §5 The Ideas, §6 The Run Sheet — each with dotted leader lines to a page number.
A square vermilion button "Begin a plan →". Under it "Or try a sample:" and three ticket-stub
shaped slips with perforated left edges: "A Jaipur wedding · 250 guests", "A seventh birthday ·
25 children", "A Diwali mela · 400 neighbours".
Bottom section "Your shelf": saved plans shown as book spines standing side by side, each a
narrow vertical rectangle with the title rotated, a thin coloured band at the top, and days to
go in monospace. Cream paper background with subtle paper grain.
```

### S2 — The Invitation (intake)
```
Intake screen titled "§ 1 The Invitation". Centre-left, a large raised cream card with an inset
thin double border, like a printed invitation. Inside, one sentence in a large serif with
fill-in blanks shown as underlined fields (no boxes): "We are planning a [wedding ▾] —
[traditional ▾] — for [250] guests in [Jaipur] on [12 March 2027], [outdoors ▾], with a budget
of [₹ 18,00,000]." Blank text in vermilion. One blank is focused showing a small-caps hint
below: "GUESTS — BETWEEN 1 AND 5,000".
Below the card, a section "In the margins" in two columns: chip groups for Vibe (classic,
playful, minimalist, festive, rustic, elegant, eco-conscious, cultural), Dietary needs and
Guest accessibility; chips are rectangular with 2px corners, selected chips are filled ink with
a check mark. Two textareas styled as ruled notepaper: "Traditions to honour" and "Must-haves".
Bottom: square vermilion button "Set it in type →" and a text link "Back".
```

### S3 — Almanac: Overview
```
Plan screen for "Ananya & Kabir". Top masthead strip: the title in a large serif; below it a
monospace line "WEDDING · TRADITIONAL · 250 GUESTS · JAIPUR · FRI 12 MAR 2027". On the right a
huge serif numeral "142" with "DAYS TO GO" in small caps, and a circular double-ringed ink stamp
reading "WORKABLE", slightly rotated.
Under it a tab strip styled like the index tabs on the edge of a book, small caps:
§1 OVERVIEW (selected, marigold underline), §2 LEDGER, §3 TIMETABLE, §4 VENDORS, §5 IDEAS,
§6 RUN SHEET, plus a text button "Ask the Planner" at the far right.
Left margin column: marginalia note explaining the verdict: "₹7,200 per guest against an
indicative ₹3,500 — workable with care."
Main column "Notices": a numbered list like newspaper briefs. Each has a small-caps kicker
(WARNING ·, ADVICE ·, INFO ·) a bold headline and one short paragraph, e.g. "Venue needs
step-free access", "Outdoor in March: book a covered backup".
Then a typographic row of three key figures separated by vertical hairlines (no cards):
"₹7,200 per guest", "₹1,26,000 contingency", "3 tasks due this month" — numbers in monospace.
Then "Next three deadlines" set like a train timetable.
```

### S4 — Ledger
```
"§2 The Ledger" tab of the same plan. A full-width printed accounting ledger table with a
caption, columns: Category · Share · Amount · Per guest · Note. Dotted leader lines between the
category name and the figures; figures right-aligned in monospace (₹ amounts with Indian digit
grouping). Under each category name a thin marigold tally bar proportional to its share, with
the percentage printed beside it. Each row has small square − and + buttons and an editable
percent. A total row with a double rule above it shows ₹18,00,000 and 100.0%. Top right: text
button "Reset to recommended". Left margin marginalia: "Weather cover added: outdoor event in
March." Cream paper, ink, vermilion accents.
```

### S5 — Timetable
```
"§3 The Timetable" tab. Styled like a railway departures board printed on paper. A vertical
2px ink line runs down the left with a dot at each stop. Phase headings appear as sunk bands:
"SIX MONTHS OUT", "THREE TO SIX MONTHS", "ONE TO THREE MONTHS", "THE FINAL MONTH",
"FINAL WEEK", "THE DAY", "AFTERWARDS". Each row: due date in monospace, a "T–90" counter in
monospace (vermilion when critical), the task title, its category in small caps, and a square
checkbox with an ink check. One row shows a small umber "RUSHED" tag. Top right: text buttons
"Add to calendar (.ics)" and "Print".
```

### S6 — Vendors
```
"§4 The Vendors" tab. A filter row of small-caps radio options: ALL, TO FIND, ENQUIRED, BOOKED,
PAID. Below, a two-column grid of ticket stubs on raised cream paper, each with a perforated
left edge. Each ticket: vendor name in serif ("Caterer"), "Book by 3 Dec 2026" in monospace,
an italic reason line "Added because you have 250 guests and Jain and nut-free needs", a
disclosure "Questions to ask (4)", and a segmented status control. In the ticket's top-right
corner a circular rubber ink stamp shows the status: "BOOKED" in peacock teal, "TO FIND"
outlined ink, "ENQUIRED" umber, "PAID" leaf green — slightly rotated.
```

### S7 — Ideas
```
"§5 The Ideas" tab. A small-caps rubber-stamp line at top: "DRAFTED BY GEMINI". Category
filter in small caps: THEME, DÉCOR, FOOD & DRINK, ACTIVITIES, FAVOURS, INCLUSION.
Ideas as landscape postcards with printer's crop marks at the corners. Left half: small-caps
category kicker, serif title ("Marigold-and-mogra canopy aisle"), two-line description. Right
half: a postage-stamp box with a perforated border containing the cost band "₹₹" and a round
postmark with the category initial. Under a hairline, an italic line "Fits because: outdoor
March ceremony with a cultural vibe". Actions as text buttons: "Keep" and "More like this".
One postcard area shows a loading state: grey placeholder word-slugs being replaced by text
("Setting ideas in type…"), no shimmer.
```

### S8 — Run sheet
```
"§6 The Run Sheet" tab. Laid out like a printed order of ceremony on cream paper: a centred
ornamental rule with a small marigold flower motif, then two columns — times in monospace
right-aligned (12:00, 15:00, 16:00 …) and event titles in serif with the owner in small caps
("CATERING LEAD"), joined by dotted leaders. A "Print run sheet" button top right.
```

### S9 — Ask the Planner (side rail, desktop)
```
Right-hand side rail titled "Letters to the Planner" on the Overview screen. NOT a chat UI:
no bubbles, no avatars. Each exchange is set like correspondence: "YOU ASKED" small-caps kicker
with the question in italic serif, then "THE PLANNER REPLIES" with the answer in roman text,
a hairline between exchanges. Under the answer, two suggestion slips with dashed borders on
raised paper: "Move 3% from Décor & flowers to Contingency (₹54,000)" with a one-line
rationale and buttons "Apply" (square vermilion) and "Not now" (text). A small source line
"Answered by Gemini". At the bottom a ruled notepaper textarea "Write to the Planner…" and a
"Send" button.
```

### S10 — Mobile almanac (390 wide), Lamplight dark mode
```
Mobile view (390px wide) of the plan in the dark "Lamplight" theme: warm brown-black paper
#17130F, cream ink #EFE6D6, coral-vermilion accents #F08468. Masthead compressed: title, mono
event line, countdown "142 DAYS TO GO" and the round stamp. Tabs as a horizontally scrollable
small-caps strip with a marigold underline on the selected tab. Content: the timetable with its
vertical rail. A bottom-right text button "Ask the Planner". No blue-grey anywhere.
```

---

## 5. Corrective prompts (use when a screen drifts)

- "Remove every gradient, shadow glow and blur. Use flat cream paper and black ink only, with vermilion accents."
- "Replace the rounded cards with square-cornered printed elements: ticket stubs, postcards or ruled table rows as specified."
- "Replace the font with Fraunces for headings, Instrument Sans for body and JetBrains Mono for numbers. Labels in small caps."
- "Remove icons above titles, emoji and any AI/sparkle imagery."
- "Make the layout asymmetric and editorial with a left margin column; do not centre everything."
- "The dark theme must be warm brown-black (#17130F) with cream text, not blue-grey."

## 6. Translation rules (Stitch → code)
- Keep: composition, hierarchy, spacing rhythm, which ornaments appear where.
- Replace: all colours with `var(--token)`, all fonts with our three families, all icons with our SVG set, all `div` buttons with `<button>`, all fake tables with `<table>`.
- Add: labels, ARIA, focus styles, states (loading, empty, error) per `09_ACCESSIBILITY.md` and `06_DESIGN_SYSTEM.md` §7.
- Drop: any Stitch-generated images, external font links, inline scripts.
