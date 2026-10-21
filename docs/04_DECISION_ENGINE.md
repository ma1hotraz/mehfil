# 04 — The Decision Engine (deterministic, pure, tested)

The engine is the "logical decision making based on user context" the challenge asks for. It lives in `src/shared/engine`, is **pure** (no I/O, no `Date.now()`, no randomness — `today` and ids are inputs or derived by hashing), runs on the client for instant results and is fully unit- and property-tested.

```ts
export function buildPlan(brief: EventBrief, today: string /* YYYY-MM-DD */): Plan
export function rebalance(ledger: LedgerLine[], id: CategoryId, newPercent: number, totalMinor: number): LedgerLine[]
export function applyAction(plan: Plan, action: SuggestedAction, today: string): { plan: Plan; notice: string } | { error: string }
export function feasibility(brief: EventBrief): Feasibility
```

Every rule that alters the plan **must** push an `Insight` with a stable `ruleId` so the UI can explain *why*. Tests assert both the effect and the insight.

---

## 1. Budget categories

```ts
type CategoryId =
  | 'venue' | 'catering' | 'decor' | 'photo' | 'attire' | 'entertainment' | 'invitations'
  | 'transport' | 'travel' | 'favors' | 'permits' | 'logistics' | 'safety' | 'outreach'
  | 'supplies' | 'weatherCover' | 'accessibility' | 'contingency';
```
Labels (UI): Venue · Food & drink · Décor & flowers · Photo & video · Attire & beauty · Music & entertainment · Invitations & stationery · Guest transport · Travel & stays · Favours & return gifts · Permits & licences · Logistics (seating, power, sound) · Safety & first aid · Publicity & outreach · Supplies · Weather cover · Accessibility · Contingency.

## 2. Base allocations (percent; each row sums to exactly 100)

| Type / sub-type | Allocation |
|---|---|
| wedding / traditional | venue 22, catering 30, decor 12, photo 10, attire 9, entertainment 5, invitations 2, transport 3, contingency 7 |
| wedding / intimate | venue 20, catering 32, decor 10, photo 14, attire 10, entertainment 4, invitations 2, contingency 8 |
| wedding / destination | venue 18, catering 25, travel 15, decor 9, photo 10, attire 8, entertainment 4, invitations 2, contingency 9 |
| wedding / court-and-reception | venue 25, catering 35, decor 8, photo 12, attire 8, entertainment 4, invitations 1, contingency 7 |
| birthday / kids | venue 15, catering 30, decor 12, entertainment 22, favors 8, photo 5, invitations 2, contingency 6 |
| birthday / teen | venue 20, catering 30, decor 8, entertainment 25, favors 5, photo 5, invitations 1, contingency 6 |
| birthday / adult | venue 25, catering 40, decor 8, entertainment 12, photo 5, invitations 2, contingency 8 |
| birthday / milestone | venue 25, catering 35, decor 10, entertainment 12, photo 8, invitations 2, contingency 8 |
| community / festival | venue 12, permits 6, logistics 18, catering 20, entertainment 14, safety 8, outreach 7, supplies 7, contingency 8 |
| community / fundraiser | venue 20, catering 25, outreach 15, entertainment 10, logistics 10, supplies 5, permits 3, safety 4, contingency 8 |
| community / cultural-night | venue 20, entertainment 20, logistics 15, catering 18, outreach 8, decor 5, safety 4, permits 3, contingency 7 |
| community / drive | supplies 30, logistics 20, outreach 15, catering 12, safety 8, permits 5, contingency 10 |

A unit test asserts every row sums to 100.

## 3. Context modifiers (applied in this order)

Helper: `moveShare(alloc, targetId, pct, sources: CategoryId[])` adds `pct` to `targetId` (creating it if absent) and removes the same total from `sources` **proportionally to their current size**, skipping absent sources; if all sources are absent, it takes proportionally from every non-contingency category. Never drives a category below 0.

Region for season rules is derived from currency: `INR → india`, `GBP|EUR → europe`, `USD → us`.

| Rule | Condition | Effect | Insight (severity) |
|---|---|---|---|
| R01 weather cover | `setting = outdoor` | `moveShare(weatherCover, 5, [decor, venue])` | info: "Outdoor events need a rain/heat plan — 5% set aside for canopy, fans or heaters." |
| R02 weather cover (mixed) | `setting = mixed` | `moveShare(weatherCover, 3, [decor, venue])` | info |
| R03 risky season | setting ≠ indoor AND month of `date` in risk months (india: Jun–Sep monsoon, Apr–May heat; europe: Nov–Mar; us: Dec–Feb) | `moveShare(weatherCover, 3, [decor, entertainment])` | warning: "{Month} in {region} is {monsoon/peak heat/cold} season. Book a covered backup space." |
| R04 accessibility | `accessibility.length ≥ 1` | `moveShare(accessibility, 2 (+1 if ≥3 needs), [decor, entertainment])` | advice: lists the needs and what the money covers (ramps, interpreter, signage, quiet room) |
| R05 large crowd | wedding/birthday and `guestCount > 150` | `moveShare(transport or logistics, 2, [decor])` (transport for wedding, logistics otherwise) | advice: crowd flow, parking, staggered food service |
| R06 crowd safety | community and `guestCount > 300` | ensure `safety ≥ 10` via `moveShare(safety, 10 - safety, [entertainment, decor, supplies])` | warning: "Over 300 attendees: plan marshals, first-aid post and two exits." |
| R07 rush | lead days < rush threshold (wedding 60, birthday 7, community 21) | `moveShare(contingency, 3, [decor, entertainment])` | warning: "Short notice: expect rush fees; 3% added to contingency." |
| R08 contingency bounds | always, last | clamp contingency to [5, 15] by moving from/to largest category | none unless clamped |

After modifiers: round each percent to 1 decimal using **largest-remainder** so the total is exactly 100.0.

## 4. Money

- `totalMinor = round(budget × 100)`.
- `amountMinor` per line by largest-remainder over `percent × totalMinor / 100` so `Σ amountMinor === totalMinor` **exactly** (AC1; property-tested with fast-check over random budgets and allocations).
- `perGuestMinor = floor(totalMinor / guestCount)`.
- Format with `Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 })`. Locales: `en-IN` for INR (lakh/crore grouping), `en-US` for USD, `en-GB` for GBP, `en-IE` for EUR (keeps formatting English).

## 5. Feasibility

Illustrative mid-market **minimum workable budget per guest** (whole currency units). Shown in UI with the label "indicative benchmark" and a footnote that local prices vary.

| sub-type | INR | USD |
|---|---|---|
| wedding traditional | 3,500 | 150 |
| wedding intimate | 4,000 | 180 |
| wedding destination | 9,000 | 300 |
| wedding court-and-reception | 2,500 | 100 |
| birthday kids | 800 | 25 |
| birthday teen | 1,000 | 30 |
| birthday adult | 1,500 | 50 |
| birthday milestone | 2,500 | 80 |
| community festival | 250 | 12 |
| community fundraiser | 600 | 30 |
| community cultural-night | 300 | 15 |
| community drive | 100 | 5 |

EUR = round(USD × 0.92), GBP = round(USD × 0.79) — computed once at module load and documented as indicative.

`ratio = perGuest / benchmark` →
- `≥ 1.5` **comfortable**: "Room for upgrades."
- `≥ 1.0` **workable**
- `≥ 0.6` **tight** → insights R10
- `< 0.6` **unrealistic** → insights R10 + R11

| Rule | Condition | Insight |
|---|---|---|
| R10 lean mode | tight or unrealistic | advice list: daytime event, buffet/thali over plated, weekday date, digital invitations, borrow décor; all specific to type |
| R11 guest/budget fix | unrealistic | critical: "To reach a workable plan, either raise the budget to {benchmark×guests} or trim the list to about {floor(budget/benchmark)} guests." (both numbers computed) |
| R12 upgrade | ratio ≥ 2.0 | info: suggests 1–2 upgrades by type (e.g. wedding → photo +3%, a live band) |

## 6. Timeline

Milestone templates: `{ id, title, detail, category, idealOffsetDays, critical, when?: (brief) => boolean }`. Offsets are days **before** the event; negative = after.

**Wedding** — set budget & draft guest list 300 (critical) · book venue 270 (critical, venue) · book photo/video 240 (photo) · book caterer + tasting 210 (critical, catering) · book décor 180 (decor; `when` subType ≠ court-and-reception) · finalise attire 150 (attire) · book music/entertainment 150 · send save-the-dates 120 (invitations) · arrange guest transport & stays 90 (transport) · send invitations 60 (critical) · finalise menu & dietary list 30 · confirm final headcount to caterer 14 (critical) · confirm every vendor & payment schedule 10 (critical) · write run sheet & assign roles 7 · pack emergency kit 2 · **event day 0** · settle final payments & review vendors −7 · thank-you notes −14.
Destination adds: hold room block & travel 240 (travel, critical), send travel info pack 90.
Traditional adds: book pandit/officiant & confirm muhurat 200 (critical); book mehendi & makeup artists 120 (attire).

**Birthday** — set budget & guest list 45 · book venue 40 (critical; `when` guestCount > 15) · choose theme 35 · book entertainer/activities 30 · send invitations 21 (critical) · order cake 10 (critical) · collect RSVPs & dietary needs 7 · buy décor & favours 7 · confirm vendors 3 (critical) · prepare playlist & run sheet 2 · **day 0** · thank-you messages −3.
Kids adds: collect allergy info from parents 10 (critical); arrange adult supervisors (1 per 6 children) 5. Milestone adds: memory slideshow / guest messages 21.

**Community** — form committee & assign roles 90 (critical) · apply for permits (public space, police, fire, noise) 75 (critical, permits) · book ground/venue 70 (critical) · line up sponsors 60 (`when` fundraiser or festival) · book sound, power & lighting 45 (logistics) · book performers 45 (`when` ≠ drive) · procure supplies (gloves, bags, collection boxes) 21 (`when` drive) · arrange food stalls / caterer (registered food vendors) 40 · publicity: posters, social, resident groups 30 (outreach) · safety plan: first aid, extinguishers, exits 21 (critical, safety) · volunteer roster & briefing 14 · waste & recycling plan 10 · final site walkthrough 2 (critical) · **day 0** · clean-up & lost-and-found −1 · accounts & thank sponsors −7.

Cross-cutting adds: `accessibility.length ≥ 1` → "Accessibility walkthrough of venue" 30 (critical); `setting ≠ indoor` → "Book backup cover / check forecast" 7; `dietary` non-empty → "Share dietary list with caterer" 14.

**Scheduling algorithm** (`lead = daysBetween(today, date)`, must be ≥ 0):
- `maxOffset = max(positive offsets of applicable milestones)`.
- For each milestone with offset `o > 0`:
  - if `lead ≥ maxOffset`: `due = date − o`, `rushed = false`.
  - else: `o' = round(o × lead / maxOffset)`; `due = date − o'`; `rushed = o > lead`.
- `o = 0` → `due = date`. `o < 0` → `due = date + |o|`.
- Sort by `due`, then by `critical` first, then template order.
- Phase from `o'` (effective offset): `≥180` "Six months out" · `90–179` "Three to six months" · `30–89` "One to three months" · `8–29` "The final month" · `1–7` "Final week" · `0` "The day" · `<0` "Afterwards".
- **R20**: each milestone that is `critical && rushed` → warning insight "Usually done ~{o} days ahead; you have {lead}. Do it this week." (max 3 such insights, then one summary insight "+N more rushed tasks").
- Invariant tests: no due date < today (for o ≥ 0); none > date (for o ≥ 0); order preserved relative to ideal offsets.

## 7. Vendor checklist

Catalog entries: `{ id, label, category, appliesTo: EventType[], when?: (brief) => boolean, reason: (brief) => string, bookByOffset, questions: (brief) => string[] }`. `bookByDate` uses the same compression as the timeline.

Core per type:
- **Wedding:** venue · caterer · décor & florist · photographer/videographer · makeup & mehendi artist (traditional) · music (DJ/band/dhol) · officiant/pandit (traditional) · invitation printer / e-invite designer · guest transport (guests > 80 or destination) · travel agent & room block (destination).
- **Birthday:** venue (guests > 15; otherwise item "Home / society hall booking" ) · cake baker · caterer (guests > 20; else "Snacks & groceries run") · entertainer (kids: magician/games host; teen: DJ/gaming; adult & milestone: band or DJ) · décor & balloons · photographer (milestone or guests > 50) · return-gift supplier (kids).
- **Community:** ground/venue · permits office (municipal, police NOC, fire) · sound & lighting · generator/power backup · food stalls or caterer · tents & seating · first aid / ambulance standby (guests ≥ 200 or outdoor) · marshals/security (guests > 300) · waste-management partner · printing & publicity.

Cross-cutting (any type):
- `setting ≠ indoor` → tent/canopy rental. `setting = outdoor && guests > 100` → portable restrooms.
- `step-free` → venue questions gain "Is there step-free entry, a ramp and an accessible restroom?"
- `hearing-support` → vendor "Sign-language interpreter or live captioning".
- `visual-support` → vendor "Large-print & high-contrast signage".
- `sensory-friendly` → venue question "Is there a quiet room away from speakers?"; music question "Can volume be kept under ~85 dB?"
- `elderly-guests` or `seating-rest-areas` → logistics question "Seating with back support near the stage and restrooms?"
- Dietary → caterer questions per item: jain "Can you cook without onion, garlic and root vegetables in a separate kitchen?"; halal "Is the meat certified halal?"; vegan; gluten-free "How do you prevent cross-contamination?"; nut-allergy (also **R30 warning** insight) "Can you guarantee a nut-free kitchen and label every dish?"; kids-menu.

Every vendor's `reason` names the rule, e.g. "Added because the event is outdoors with 250 guests."

## 8. Run sheet

Default start time: wedding 18:00 (traditional 10:00 ceremony variant listed as slot), birthday kids 16:00, teen 17:00, adult/milestone 20:00, community 16:00 (drive 07:00). Slots are `{offsetMinutes, title, owner}` relative to start, e.g. Wedding: −360 vendors arrive & décor setup (Décor lead) · −180 sound check (Music) · −120 caterer setup & tasting (Catering lead) · −60 family photos (Photographer) · 0 guest arrival & welcome (Hosts) · +45 ceremony / main programme · +150 dinner service · +240 music & dance · +330 send-off · +360 vendor pack-down (Venue manager).
Birthday kids: −90 setup · −15 entertainer arrives · 0 guests arrive & free play · +30 games/show · +75 cake & song · +90 food · +120 return gifts & pickup. Community: −300 stall & stage setup · −120 safety briefing for volunteers · −60 sound check · 0 gates open · +30 opening address · +60 programme · +180 food peak · +270 close & announcements · +300 clean-up crew.
Modifiers: outdoor → add −240 "Weather check & go/no-go for backup" (Event lead); accessibility → −120 "Accessibility walkthrough"; community guests > 300 → −30 "Marshals at entry/exit positions".

## 9. Insight ordering & limits
Sort by severity (critical → warning → advice → info), then ruleId. Overview shows top 6 with "Show all".

## 10. `applyAction`
- `shiftBudget`: both categories must exist (or `to` may be created if it is `contingency`/`accessibility`/`weatherCover`); `from ≠ to`; clamp percent so `from` stays ≥ 0 and contingency ≥ 3 → recompute amounts with largest remainder; notice "Moved 3% (₹54,000) from Décor to Contingency."
- `addTask`: `daysBeforeEvent ≤ lead` else clamp to lead and mark rushed; id = `custom-` + stable hash of title+offset; dedupe by id.
- `markVendor`: vendor id must exist; status must be valid.
- Returns `{ error }` (never throws) for invalid actions; UI shows the error politely.

## 11. Ids & determinism
Plan id = `crypto.randomUUID()` created **outside** the engine (client) and passed in or set after. Milestone/vendor ids are template ids; custom ids are hashed. `buildPlan(brief, today)` called twice returns deep-equal results (tested).
