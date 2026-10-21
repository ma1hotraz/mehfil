import { describe, expect, it } from 'vitest';

import { ALLOCATIONS, allocationKey } from '../../../src/shared/engine/data/allocations.js';
import { benchmarkPerGuest } from '../../../src/shared/engine/data/benchmarks.js';
import { applicableMilestones } from '../../../src/shared/engine/data/milestones.js';
import { slotTemplatesFor } from '../../../src/shared/engine/data/runsheets.js';
import { buildPlan } from '../../../src/shared/engine/index.js';
import { at } from '../../../src/shared/util.js';
import { EVENT_SUBTYPES, fixedToday, minimalBrief } from '../../fixtures/briefs.js';

describe('base allocations', () => {
  it.each(Object.entries(ALLOCATIONS))('%s sums to exactly 100', (_key, row) => {
    expect(Object.values(row).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it.each(EVENT_SUBTYPES)('%s / %s has an allocation, benchmarks and templates', (type, sub) => {
    const brief = minimalBrief({ eventType: type, subType: sub, guestCount: 60 });
    expect(ALLOCATIONS[allocationKey(type, sub)]).toBeDefined();
    expect(benchmarkPerGuest('INR', allocationKey(type, sub))).toBeGreaterThan(0);
    expect(applicableMilestones(brief).length).toBeGreaterThanOrEqual(8);
    expect(slotTemplatesFor(brief).length).toBeGreaterThanOrEqual(6);
  });

  it.each(EVENT_SUBTYPES)('%s / %s yields a full plan for a minimal brief', (type, sub) => {
    const plan = buildPlan(
      minimalBrief({ eventType: type, subType: sub, guestCount: 1, budget: 1 }),
      fixedToday,
    );
    expect(plan.ledger.length).toBeGreaterThan(0);
    expect(plan.timeline.length).toBeGreaterThanOrEqual(8);
    expect(plan.vendors.length).toBeGreaterThanOrEqual(6);
    expect(plan.runSheet.length).toBeGreaterThanOrEqual(6);
  });
});

describe('at', () => {
  it('returns items and throws on a miss', () => {
    expect(at([1, 2], 1)).toBe(2);
    expect(() => at([1], 3)).toThrow(RangeError);
  });
});
