import { at } from '../util.js';
import type { EventBrief } from '../schema/brief.js';
import { CATEGORY_IDS, type CategoryId, type Insight, type LedgerLine } from '../schema/plan.js';

import {
  type Allocation,
  ALLOCATIONS,
  CATEGORY_LABELS,
  CATEGORY_NOTES,
  allocationKey,
} from './data/allocations.js';
import { MAX_LINE_PERCENT } from './data/rules.js';
import { RULES, insight } from './budgetRules.js';
import { amountsFromPercents, apportion, roundPercents } from './money.js';
import { amountOf, clampContingency, sum } from './moveShare.js';

export { clampContingency, moveShare } from './moveShare.js';

/**
 * Runs the context rules R01–R08 over the base allocation for the brief.
 * @returns unrounded percentages (summing to 100) and the insight each rule produced.
 */
export function allocate(
  brief: EventBrief,
  leadDays: number,
): { percents: Allocation; insights: Insight[] } {
  let alloc: Allocation = { ...(ALLOCATIONS[allocationKey(brief.eventType, brief.subType)] ?? {}) };
  const insights: Insight[] = [];
  for (const rule of RULES) {
    const outcome = rule({ brief, leadDays }, alloc);
    if (outcome) {
      alloc = outcome.alloc;
      insights.push(outcome.insight);
    }
  }
  return withContingencyBounds(alloc, insights);
}

/** R08: applies the contingency bounds and records an insight when it had to clamp. */
export function withContingencyBounds(
  alloc: Allocation,
  insights: readonly Insight[],
): { percents: Allocation; insights: Insight[] } {
  const clamp = clampContingency(alloc);
  const extra = clamp.clamped
    ? [
        insight(
          'R08',
          'info',
          'Contingency adjusted',
          'Contingency is kept between 5% and 15% of the budget.',
        ),
      ]
    : [];
  return { percents: clamp.alloc, insights: [...insights, ...extra] };
}

/** Builds ledger lines (1-decimal percents summing to 100.0, exact minor-unit amounts). */
export function buildLedger(percents: Allocation, totalMinor: number): LedgerLine[] {
  const ids = CATEGORY_IDS.filter((id) => amountOf(percents, id) > 0);
  const rounded = roundPercents(ids.map((id) => amountOf(percents, id)));
  const amounts = amountsFromPercents(rounded, totalMinor);
  return ids.map((id, index) => ({
    id,
    label: CATEGORY_LABELS[id],
    percent: at(rounded, index),
    amountMinor: at(amounts, index),
    recommendedPercent: at(rounded, index),
    note: CATEGORY_NOTES[id],
  }));
}

/**
 * Sets one ledger line to `newPercent` (clamped to 0..90, 1 decimal) and spreads the rest over the
 * other lines in proportion to their size. The total stays exactly 100% and `totalMinor`.
 * @example rebalance(ledger, 'photo', 13, 180000000)
 */
export function rebalance(
  ledger: readonly LedgerLine[],
  id: CategoryId,
  newPercent: number,
  totalMinor: number,
): LedgerLine[] {
  const target = ledger.find((line) => line.id === id);
  if (!target) {
    return [...ledger];
  }
  const tenths = Math.round(Math.min(MAX_LINE_PERCENT, Math.max(0, newPercent)) * 10);
  if (tenths === Math.round(target.percent * 10)) {
    return [...ledger];
  }
  const others = ledger.filter((line) => line.id !== id);
  if (others.length === 0) {
    return [...ledger];
  }
  const restTenths = 1000 - tenths;
  const weight = sum(others.map((line) => line.percent));
  const shares = apportion(
    others.map((line) =>
      weight > 0 ? (line.percent / weight) * restTenths : restTenths / others.length,
    ),
    restTenths,
  );
  const percents = ledger.map((line) =>
    line.id === id ? tenths / 10 : at(shares, others.indexOf(line)) / 10,
  );
  const amounts = amountsFromPercents(percents, totalMinor);
  return ledger.map((line, index) => ({
    ...line,
    percent: at(percents, index),
    amountMinor: at(amounts, index),
  }));
}
