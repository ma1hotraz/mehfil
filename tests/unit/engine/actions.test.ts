import { describe, expect, it } from 'vitest';

import { applyAction } from '../../../src/shared/engine/actions.js';
import { addDays } from '../../../src/shared/engine/dates.js';
import { buildPlan } from '../../../src/shared/engine/index.js';
import { toMinor } from '../../../src/shared/engine/money.js';
import type { SuggestedAction } from '../../../src/shared/schema/ai.js';
import type { Plan } from '../../../src/shared/schema/plan.js';
import { deepFreeze } from '../../helpers/freeze.js';
import { ananya, fixedToday, minimalBrief } from '../../fixtures/briefs.js';

const plan = deepFreeze(buildPlan(ananya, fixedToday));
const shift = (
  over: Partial<Extract<SuggestedAction, { type: 'shiftBudget' }>>,
): SuggestedAction => ({
  type: 'shiftBudget',
  from: 'decor',
  to: 'contingency',
  percent: 1,
  rationale: 'because',
  ...over,
});
const ok = (r: ReturnType<typeof applyAction>): { plan: Plan; notice: string } => {
  if ('error' in r) {
    throw new Error(r.error);
  }
  return r;
};
const pct = (p: Plan, id: string) => p.ledger.find((l) => l.id === id)?.percent ?? 0;

describe('shiftBudget', () => {
  it('moves points, keeps totals exact and words the notice', () => {
    const { plan: next, notice } = ok(applyAction(plan, shift({ percent: 3 }), fixedToday));
    expect(pct(next, 'decor')).toBeCloseTo(pct(plan, 'decor') - 3, 5);
    expect(pct(next, 'contingency')).toBeCloseTo(pct(plan, 'contingency') + 3, 5);
    expect(next.ledger.reduce((s, l) => s + l.amountMinor, 0)).toBe(toMinor(ananya.budget));
    expect(notice).toBe('Moved 3% (₹36,000) from Décor & flowers to Contingency.');
  });

  it('clamps to what the source has, and keeps contingency at 3% or more', () => {
    const big = ok(applyAction(plan, shift({ percent: 20 }), fixedToday));
    expect(pct(big.plan, 'decor')).toBe(0);
    const fromContingency = ok(
      applyAction(plan, shift({ from: 'contingency', to: 'photo', percent: 20 }), fixedToday),
    );
    expect(pct(fromContingency.plan, 'contingency')).toBeGreaterThanOrEqual(3);
  });

  it('creates contingency, accessibility or weather cover when absent', () => {
    const indoor = deepFreeze(buildPlan(minimalBrief({ setting: 'indoor' }), fixedToday));
    const next = ok(applyAction(indoor, shift({ to: 'weatherCover', percent: 2 }), fixedToday));
    expect(pct(next.plan, 'weatherCover')).toBe(2);
    expect(next.plan.ledger.map((l) => l.id).at(-1)).toBe('contingency');
  });

  it('rejects bad requests with an error value', () => {
    expect('error' in applyAction(plan, shift({ from: 'decor', to: 'decor' }), fixedToday)).toBe(
      true,
    );
    expect('error' in applyAction(plan, shift({ from: 'safety' }), fixedToday)).toBe(true);
    expect('error' in applyAction(plan, shift({ to: 'safety' }), fixedToday)).toBe(true);
    const empty = ok(applyAction(plan, shift({ percent: 20 }), fixedToday)).plan;
    expect('error' in applyAction(empty, shift({ percent: 1 }), fixedToday)).toBe(true);
  });
});

describe('addTask', () => {
  const task = (days: number, title = 'Book a backup band'): SuggestedAction => ({
    type: 'addTask',
    title,
    daysBeforeEvent: days,
    category: 'entertainment',
    rationale: 'Safer',
  });

  it('adds a task within the lead time, sorted by date', () => {
    const { plan: next, notice } = ok(applyAction(plan, task(20), fixedToday));
    const added = next.timeline.find((m) => m.id.startsWith('custom-'));
    expect(added?.dueDate).toBe(addDays(ananya.date, -20));
    expect(added?.rushed).toBe(false);
    expect(notice).toContain('Book a backup band');
    const dates = next.timeline.map((m) => m.dueDate);
    expect(dates).toEqual([...dates].sort());
  });

  it('clamps beyond the lead time and marks the task rushed', () => {
    const lead = 203;
    const { plan: next } = ok(applyAction(plan, task(500), fixedToday));
    const added = next.timeline.find((m) => m.id.startsWith('custom-'));
    expect(added?.dueDate).toBe(addDays(ananya.date, -lead));
    expect(added?.rushed).toBe(true);
  });

  it('does not duplicate a task and rejects empty titles', () => {
    const once = ok(applyAction(plan, task(20), fixedToday)).plan;
    const twice = ok(applyAction(once, task(20), fixedToday));
    expect(twice.plan.timeline).toHaveLength(once.timeline.length);
    expect(twice.notice).toMatch(/already on your list/);
    expect('error' in applyAction(plan, task(5, '<<< >>>'), fixedToday)).toBe(true);
  });

  it('falls back to a default detail when the rationale is empty', () => {
    const action: SuggestedAction = {
      type: 'addTask',
      title: 'Call the florist',
      daysBeforeEvent: 5,
      category: 'general',
      rationale: '',
    };
    const added = ok(applyAction(plan, action, fixedToday)).plan.timeline.find((m) =>
      m.id.startsWith('custom-'),
    );
    expect(added?.detail).toBe('Added from the Planner.');
  });
});

describe('markVendor', () => {
  it('updates the status and words the notice', () => {
    const r = ok(
      applyAction(
        plan,
        { type: 'markVendor', vendorId: 'caterer', status: 'booked', rationale: '' },
        fixedToday,
      ),
    );
    expect(r.plan.vendors.find((v) => v.id === 'caterer')?.status).toBe('booked');
    expect(r.notice).toBe('Caterer marked booked.');
  });

  it('rejects unknown vendors', () => {
    expect(
      'error' in
        applyAction(
          plan,
          { type: 'markVendor', vendorId: 'nope', status: 'paid', rationale: '' },
          fixedToday,
        ),
    ).toBe(true);
  });

  it('words the to-find status with a space', () => {
    const r = ok(
      applyAction(
        plan,
        { type: 'markVendor', vendorId: 'caterer', status: 'to-find', rationale: '' },
        fixedToday,
      ),
    );
    expect(r.notice).toBe('Caterer marked to find.');
  });
});
