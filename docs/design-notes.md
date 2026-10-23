# Design Notes — Mehfil: The Almanac (Stitch MCP Integration)

## 1. Stitch MCP Project
- **Project Name:** Mehfil — The Almanac
- **Project Resource ID:** `projects/13336188941587458946`
- **MCP Endpoint:** `https://stitch.googleapis.com/mcp` configured in `.agents/mcp_config.json`
- **Modern Luxury Almanac Screen ID:** `8b86b8a742c0455c93eda489f695c8d8` ("Mehfil — Modern Luxury Editorial Almanac")

## 2. Modern Editorial Aesthetic
- **Canvas & Tone:** Crisp luxury off-white gallery canvas (`--paper: #faf9f6`, cards `--paper-raised: #ffffff`, subtle sunk `--paper-sunk: #f4f2ec`) replacing murky yellow/aged parchment tones.
- **Color Depth:** Deep obsidian ink (`--ink: #18181b`), warm stone secondary (`--ink-soft: #57534e`), rich vibrant crimson (`--sindoor: #b91c1c`) providing WCAG AAA contrast across all light and dark surfaces.
- **Refined Geometry:** Clean 1px hairline structural rules (`--rule: #e5e5e0`, `--rule-strong: #78716c`), modern 4px rounded corners (`--r-1: 4px`), and zero blur drop shadows.
- **Modernized Components:**
  - Modern primary buttons with rich crimson fill and 4px radius.
  - Minimalist tabstrip with 2px crimson active indicator line.
  - Fintech-grade accounting ledger with 4px radius steppers and rounded progress tally bars.
  - Sleek timetable departure boards and clean timeline node markers.
  - Refined vendor cards with 3px crimson left accent lines.
  - Clean postcard idea cards with dashed stamp holders.
  - Crisp ceremonial run-sheet cards and correspondence planner slips.
- **Compliance & Tests:**
  - 100% test pass rate (536 vitest unit/contrast/invariant/style-guard tests, 100% coverage).
  - 20 Playwright e2e tests passed (zero axe-core accessibility violations on desktop light/dark and mobile light/dark).
  - Bundle budgets strictly preserved (Initial JS 91.2 kB <= 95 kB, Total JS 132.6 kB <= 160 kB, CSS 11.9 kB <= 20 kB).
