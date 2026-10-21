import { CATEGORY_IDS, type CategoryId } from '../schema/plan.js';

import type { Allocation } from './data/allocations.js';
import { at } from '../util.js';
import { THRESHOLDS } from './data/rules.js';

export const amountOf = (alloc: Allocation, id: CategoryId): number => alloc[id] ?? 0;
export const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

/** Takes up to `want` points from `pool`, proportionally to each member's size. */
function drain(
  alloc: Allocation,
  pool: readonly CategoryId[],
  want: number,
): { alloc: Allocation; moved: number } {
  const weights = pool.map((id) => amountOf(alloc, id));
  const available = sum(weights);
  const moved = Math.min(want, available);
  if (moved <= 0) {
    return { alloc, moved: 0 };
  }
  const next: Allocation = { ...alloc };
  pool.forEach((id, index) => {
    next[id] = Math.max(0, amountOf(alloc, id) - (moved * at(weights, index)) / available);
  });
  return { alloc: next, moved };
}

/**
 * Moves `pct` points of the budget to `target`, taking them from `sources` in proportion to
 * their size. If the sources cannot cover it, the rest comes proportionally from every other
 * non-contingency category. Never drives a category below zero and never mutates `alloc`.
 * @example moveShare({ decor: 10, venue: 10 }, 'weatherCover', 5, ['decor', 'venue'])
 *   // { decor: 7.5, venue: 7.5, weatherCover: 5 }
 */
export function moveShare(
  alloc: Allocation,
  target: CategoryId,
  pct: number,
  sources: readonly CategoryId[],
): Allocation {
  const present = (current: Allocation, ids: readonly CategoryId[]): CategoryId[] =>
    ids.filter((id) => id !== target && amountOf(current, id) > 0);
  const first = drain(alloc, present(alloc, sources), pct);
  const everyone = CATEGORY_IDS.filter((id) => id !== 'contingency');
  const second =
    first.moved < pct
      ? drain(first.alloc, present(first.alloc, everyone), pct - first.moved)
      : { alloc: first.alloc, moved: 0 };
  return { ...second.alloc, [target]: amountOf(alloc, target) + first.moved + second.moved };
}

/** Largest category other than contingency; ties go to canonical order. */
function largestCategory(alloc: Allocation): CategoryId {
  return CATEGORY_IDS.filter((id) => id !== 'contingency').reduce((best, id) =>
    amountOf(alloc, id) > amountOf(alloc, best) ? id : best,
  );
}

/** R08: keeps contingency within [5, 15] by trading with the largest category. */
export function clampContingency(alloc: Allocation): { alloc: Allocation; clamped: boolean } {
  const current = amountOf(alloc, 'contingency');
  const { contingencyMin: min, contingencyMax: max } = THRESHOLDS;
  const largest = largestCategory(alloc);
  if (current < min) {
    const give = Math.min(min - current, amountOf(alloc, largest));
    return {
      alloc: { ...alloc, [largest]: amountOf(alloc, largest) - give, contingency: current + give },
      clamped: true,
    };
  }
  if (current > max) {
    return {
      alloc: { ...alloc, [largest]: amountOf(alloc, largest) + current - max, contingency: max },
      clamped: true,
    };
  }
  return { alloc, clamped: false };
}
