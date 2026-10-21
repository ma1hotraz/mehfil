import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { rebalance } from '../../src/shared/engine/budget.js';
import { addDays } from '../../src/shared/engine/dates.js';
import { applyAction } from '../../src/shared/engine/actions.js';
import { buildPlan } from '../../src/shared/engine/index.js';
import { toMinor } from '../../src/shared/engine/money.js';
import { sanitizeText } from '../../src/shared/text.js';
import { CATEGORY_IDS } from '../../src/shared/schema/plan.js';
import type { SuggestedAction } from '../../src/shared/schema/ai.js';
import type { Plan } from '../../src/shared/schema/plan.js';
import { EventBrief, SUB_TYPES } from '../../src/shared/schema/brief.js';
import { VENDOR_STATUSES } from '../helpers/constants.js';
import { fixedToday } from '../fixtures/briefs.js';

const NUM_RUNS = 500;

const types = ['wedding', 'birthday', 'community'] as const;
const briefArb = fc
  .record({
    eventType: fc.constantFrom(...types),
    pick: fc.nat(3),
    lead: fc.integer({ min: 0, max: 1095 }),
    guestCount: fc.integer({ min: 1, max: 5000 }),
    budget: fc.integer({ min: 1, max: 1_000_000_000 }),
    currency: fc.constantFrom('INR', 'USD', 'EUR', 'GBP'),
    setting: fc.constantFrom('indoor', 'outdoor', 'mixed'),
    accessibility: fc.subarray([
      'step-free',
      'hearing-support',
      'visual-support',
      'elderly-guests',
    ] as const),
    dietary: fc.subarray(['jain', 'vegan', 'nut-allergy', 'halal'] as const),
  })
  .map(({ pick, lead, eventType, ...rest }) => ({
    lead,
    brief: EventBrief.parse({
      ...rest,
      eventType,
      subType: SUB_TYPES[eventType][pick % SUB_TYPES[eventType].length],
      date: addDays(fixedToday, lead),
      city: 'Testville',
    }),
  }));

type Op =
  | { kind: 'rebalance'; id: number; value: number }
  | { kind: 'shift'; from: number; to: number; value: number }
  | { kind: 'vendor'; status: number };

const pick = <T>(items: readonly T[], index: number, fallback: T): T =>
  items[index % items.length] ?? fallback;

function applyOp(plan: Plan, op: Op, total: number): Plan {
  if (op.kind === 'rebalance') {
    const id = plan.ledger[op.id % plan.ledger.length]?.id ?? 'venue';
    return { ...plan, ledger: rebalance(plan.ledger, id, op.value, total) };
  }
  const action: SuggestedAction =
    op.kind === 'shift'
      ? {
          type: 'shiftBudget',
          rationale: '',
          from: pick(CATEGORY_IDS, op.from, 'venue'),
          to: pick(CATEGORY_IDS, op.to, 'venue'),
          percent: op.value,
        }
      : {
          type: 'markVendor',
          rationale: '',
          vendorId: plan.vendors[0]?.id ?? 'x',
          status: pick(VENDOR_STATUSES, op.status, 'paid'),
        };
  const result = applyAction(plan, action, fixedToday);
  return 'plan' in result ? result.plan : plan;
}

describe('engine invariants', () => {
  it('ledger amounts sum to the budget exactly and percents sum to 100.0', () => {
    fc.assert(
      fc.property(briefArb, ({ brief }) => {
        const plan = buildPlan(brief, fixedToday);
        expect(plan.ledger.reduce((s, l) => s + l.amountMinor, 0)).toBe(toMinor(brief.budget));
        expect(plan.ledger.reduce((s, l) => s + Math.round(l.percent * 10), 0)).toBe(1000);
        expect(plan.ledger.every((l) => l.percent >= 0)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('keeps every before-the-event milestone between today and the event', () => {
    fc.assert(
      fc.property(briefArb, ({ brief }) => {
        for (const m of buildPlan(brief, fixedToday).timeline) {
          if (m.idealOffsetDays >= 0) {
            expect(m.dueDate >= fixedToday && m.dueDate <= brief.date).toBe(true);
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('preserves the money invariant under random rebalance and shiftBudget operations', () => {
    const op = fc.oneof(
      fc.record({
        kind: fc.constant('rebalance'),
        id: fc.nat(17),
        value: fc.double({ min: -10, max: 120, noNaN: true }),
      }),
      fc.record({
        kind: fc.constant('shift'),
        from: fc.nat(17),
        to: fc.nat(17),
        value: fc.double({ min: 0.5, max: 20, noNaN: true }),
      }),
      fc.record({ kind: fc.constant('vendor'), status: fc.nat(3) }),
    );
    fc.assert(
      fc.property(briefArb, fc.array(op, { maxLength: 12 }), ({ brief }, ops) => {
        let plan = buildPlan(brief, fixedToday);
        const total = toMinor(brief.budget);
        for (const o of ops) {
          plan = applyOp(plan, o, total);
          expect(plan.ledger.reduce((s, l) => s + l.amountMinor, 0)).toBe(total);
          expect(plan.ledger.reduce((s, l) => s + Math.round(l.percent * 10), 0)).toBe(1000);
          expect(plan.ledger.every((l) => l.percent >= 0)).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('sanitizeText invariants', () => {
  it('never leaves control characters or delimiters and respects the length cap', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), fc.integer({ min: 0, max: 200 }), (input, max) => {
        const out = sanitizeText(`${input}<<<${input}>>>`, max);
        expect(Array.from(out).every((ch) => ch === '\n' || !/\p{Cc}/u.test(ch))).toBe(true);
        expect(out.includes('<<<') || out.includes('>>>')).toBe(false);
        expect(Array.from(out).length).toBeLessThanOrEqual(max);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
