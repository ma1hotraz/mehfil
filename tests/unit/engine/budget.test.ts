import { describe, expect, it } from 'vitest';

import {
  allocate,
  buildLedger,
  rebalance,
  withContingencyBounds,
} from '../../../src/shared/engine/budget.js';
import { safetyRule } from '../../../src/shared/engine/budgetRules.js';
import { addDays } from '../../../src/shared/engine/dates.js';
import { buildPlan } from '../../../src/shared/engine/index.js';
import { toMinor } from '../../../src/shared/engine/money.js';
import { clampContingency, moveShare } from '../../../src/shared/engine/moveShare.js';
import type { Plan } from '../../../src/shared/schema/plan.js';
import { ananya, fixedToday, minimalBrief } from '../../fixtures/briefs.js';

const line = (plan: Plan, id: string): number | undefined =>
  plan.ledger.find((l) => l.id === id)?.percent;
const rule = (plan: Plan, ruleId: string) => plan.insights.find((i) => i.ruleId === ruleId);
const plan = (overrides: Record<string, unknown>, today = fixedToday) =>
  buildPlan(minimalBrief(overrides), today);

describe('moveShare', () => {
  it('adds to the target and removes proportionally from the sources', () => {
    const result = moveShare({ decor: 10, venue: 30, contingency: 5 }, 'weatherCover', 4, [
      'decor',
      'venue',
    ]);
    expect(result).toEqual({ decor: 9, venue: 27, contingency: 5, weatherCover: 4 });
  });

  it('never drives a category below zero', () => {
    const result = moveShare({ decor: 1, venue: 1, catering: 10, contingency: 5 }, 'photo', 5, [
      'decor',
      'venue',
    ]);
    expect(result.decor).toBe(0);
    expect(result.venue).toBe(0);
    expect(result.catering).toBeCloseTo(7, 10);
    expect(result.photo).toBeCloseTo(5, 10);
  });

  it('falls back to every non-contingency category when the sources are absent', () => {
    const result = moveShare({ catering: 10, venue: 10, contingency: 5 }, 'decor', 4, ['photo']);
    expect(result.catering).toBeCloseTo(8, 10);
    expect(result.venue).toBeCloseTo(8, 10);
    expect(result.contingency).toBe(5);
    expect(result.decor).toBeCloseTo(4, 10);
  });

  it('moves nothing when nothing can be taken, and does not mutate its input', () => {
    const input = { contingency: 5 };
    expect(moveShare(input, 'decor', 3, ['venue'])).toEqual({ contingency: 5, decor: 0 });
    expect(input).toEqual({ contingency: 5 });
  });
});

describe('context rules', () => {
  it('R01 outdoor adds 5% weather cover and an insight', () => {
    const p = plan({ setting: 'outdoor' });
    expect(line(p, 'weatherCover')).toBe(5);
    expect(rule(p, 'R01')?.severity).toBe('info');
  });

  it('R02 mixed adds 3%', () => {
    const p = plan({ setting: 'mixed' });
    expect(line(p, 'weatherCover')).toBe(3);
    expect(rule(p, 'R02')).toBeDefined();
    expect(rule(p, 'R01')).toBeUndefined();
  });

  it('R03 India + outdoor + July adds 3% more and warns about monsoon', () => {
    const p = plan({ setting: 'outdoor', date: '2027-07-15' });
    expect(line(p, 'weatherCover')).toBe(8);
    expect(rule(p, 'R03')?.severity).toBe('warning');
    expect(rule(p, 'R03')?.detail).toMatch(/monsoon/i);
  });

  it('R03 does not fire for India + indoor + July', () => {
    const p = plan({ setting: 'indoor', date: '2027-07-15' });
    expect(rule(p, 'R03')).toBeUndefined();
    expect(line(p, 'weatherCover')).toBeUndefined();
  });

  it('R03 covers India peak heat and mixed settings', () => {
    const p = plan({ setting: 'mixed', date: '2027-05-10' });
    expect(rule(p, 'R03')?.detail).toMatch(/peak heat/);
    expect(line(p, 'weatherCover')).toBe(6);
  });

  it('R03 Europe + outdoor + January warns about the cold season', () => {
    const p = plan({ setting: 'outdoor', date: '2027-01-15', currency: 'EUR' });
    expect(rule(p, 'R03')?.detail).toMatch(/cold season/);
  });

  it('R03 US + outdoor + July does not fire; US + January does', () => {
    expect(
      rule(plan({ setting: 'outdoor', date: '2027-07-15', currency: 'USD' }), 'R03'),
    ).toBeUndefined();
    expect(
      rule(plan({ setting: 'outdoor', date: '2027-01-15', currency: 'USD' }), 'R03'),
    ).toBeDefined();
  });

  it('R04 gives 2% for one need and 3% for three, and lists the needs', () => {
    const one = plan({ accessibility: ['step-free'] });
    const three = plan({ accessibility: ['step-free', 'hearing-support', 'elderly-guests'] });
    expect(line(one, 'accessibility')).toBe(2);
    expect(line(three, 'accessibility')).toBe(3);
    expect(rule(three, 'R04')?.detail).toContain('hearing-support');
  });

  it('R05 sends 2% to transport for weddings and logistics for birthdays, but not at 150', () => {
    expect(line(plan({ guestCount: 200 }), 'transport')).toBe(5);
    expect(
      line(plan({ eventType: 'birthday', subType: 'adult', guestCount: 200 }), 'logistics'),
    ).toBe(2);
    expect(line(plan({ guestCount: 150 }), 'transport')).toBe(3);
    expect(rule(plan({ guestCount: 150 }), 'R05')).toBeUndefined();
    expect(rule(plan({ guestCount: 151 }), 'R05')).toBeDefined();
  });

  it('R06 lifts community safety to at least 10% above 300 guests only', () => {
    const base = { eventType: 'community', subType: 'festival' };
    const big = plan({ ...base, guestCount: 301 });
    const edge = plan({ ...base, guestCount: 300 });
    expect(line(big, 'safety')).toBeGreaterThanOrEqual(10);
    expect(rule(big, 'R06')?.severity).toBe('warning');
    expect(line(edge, 'safety')).toBe(8);
    expect(rule(edge, 'R06')).toBeUndefined();
  });

  it('R06 leaves safety alone when it is already high enough', () => {
    const outcome = safetyRule(
      {
        brief: minimalBrief({ eventType: 'community', subType: 'festival', guestCount: 400 }),
        leadDays: 100,
      },
      { safety: 12, venue: 88 },
    );
    expect(outcome?.alloc).toEqual({ safety: 12, venue: 88 });
  });

  it.each([
    ['wedding', 'traditional', 60],
    ['birthday', 'adult', 7],
    ['community', 'festival', 21],
  ] as const)('R07 %s rush threshold is %i days (boundary)', (type, sub, days) => {
    const over = { eventType: type, subType: sub };
    const rushed = plan({ ...over, date: addDays(fixedToday, days - 1) });
    const fine = plan({ ...over, date: addDays(fixedToday, days) });
    expect(rule(rushed, 'R07')?.severity).toBe('warning');
    expect(rule(fine, 'R07')).toBeUndefined();
  });

  it('R07 adds 3% to contingency', () => {
    expect(line(plan({ date: addDays(fixedToday, 30) }), 'contingency')).toBe(10);
  });

  it('R08 clamps contingency to [5, 15]', () => {
    expect(clampContingency({ venue: 97, contingency: 3 })).toEqual({
      alloc: { venue: 95, contingency: 5 },
      clamped: true,
    });
    expect(clampContingency({ venue: 80, contingency: 20 })).toEqual({
      alloc: { venue: 85, contingency: 15 },
      clamped: true,
    });
    expect(clampContingency({ venue: 90, contingency: 10 }).clamped).toBe(false);
  });

  it('R08 records an insight only when it clamped', () => {
    const clamped = withContingencyBounds({ venue: 98, contingency: 2 }, []);
    expect(clamped.percents.contingency).toBe(5);
    expect(clamped.insights.map((i) => i.ruleId)).toEqual(['R08']);
    expect(withContingencyBounds({ venue: 90, contingency: 10 }, []).insights).toEqual([]);
  });

  it('R08 inside allocate emits an info insight only when it clamped', () => {
    const brief = minimalBrief({
      eventType: 'community',
      subType: 'drive',
      date: addDays(fixedToday, 3),
    });
    expect(allocate(brief, 3).insights.find((i) => i.ruleId === 'R08')).toBeUndefined();
    expect(plan({}).insights.find((i) => i.ruleId === 'R08')).toBeUndefined();
  });

  it('keeps ledger percentages summing to exactly 100.0 after rounding', () => {
    const p = buildPlan(ananya, fixedToday);
    const tenths = p.ledger.reduce((sum, l) => sum + Math.round(l.percent * 10), 0);
    expect(tenths).toBe(1000);
  });
});

describe('allocate', () => {
  it('returns no money for an unknown sub-type instead of crashing', () => {
    const odd = { ...minimalBrief(), subType: 'unknown' };
    expect(Object.values(allocate(odd, 100).percents).reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe('buildLedger', () => {
  it('orders lines canonically with contingency last and exact amounts', () => {
    const ledger = buildLedger({ contingency: 10, venue: 45.55, catering: 44.45 }, 999_999_99);
    expect(ledger.map((l) => l.id)).toEqual(['venue', 'catering', 'contingency']);
    expect(ledger.reduce((s, l) => s + l.amountMinor, 0)).toBe(999_999_99);
  });
});

describe('rebalance', () => {
  const total = toMinor(ananya.budget);
  const ledger = buildPlan(ananya, fixedToday).ledger;
  const tenths = (lines: typeof ledger) =>
    lines.reduce((s, l) => s + Math.round(l.percent * 10), 0);

  it('sets the target exactly and keeps the total at 100% and the budget', () => {
    const next = rebalance(ledger, 'photo', 13, total);
    expect(next.find((l) => l.id === 'photo')?.percent).toBe(13);
    expect(tenths(next)).toBe(1000);
    expect(next.reduce((s, l) => s + l.amountMinor, 0)).toBe(total);
  });

  it('scales the other lines proportionally', () => {
    const next = rebalance(ledger, 'photo', 20, total);
    const venueBefore = ledger.find((l) => l.id === 'venue')?.percent ?? 0;
    const cateringBefore = ledger.find((l) => l.id === 'catering')?.percent ?? 0;
    const venueAfter = next.find((l) => l.id === 'venue')?.percent ?? 0;
    const cateringAfter = next.find((l) => l.id === 'catering')?.percent ?? 0;
    expect(venueAfter / cateringAfter).toBeCloseTo(venueBefore / cateringBefore, 1);
  });

  it('is a no-op when set to the current value', () => {
    const current = ledger.find((l) => l.id === 'photo')?.percent ?? 0;
    expect(rebalance(ledger, 'photo', current, total)).toEqual(ledger);
  });

  it('clamps to 0..90 and ignores unknown ids', () => {
    expect(rebalance(ledger, 'photo', 150, total).find((l) => l.id === 'photo')?.percent).toBe(90);
    expect(rebalance(ledger, 'photo', -5, total).find((l) => l.id === 'photo')?.percent).toBe(0);
    expect(rebalance(ledger, 'safety', 5, total)).toEqual(ledger);
  });

  it('handles a single line and lines whose peers are all zero', () => {
    const only = ledger.slice(0, 1);
    expect(rebalance(only, only[0]?.id ?? 'venue', 50, total)).toEqual(only);
    const zeros = ledger.slice(0, 3).map((l, i) => ({ ...l, percent: i === 0 ? 100 : 0 }));
    const next = rebalance(zeros, zeros[0]?.id ?? 'venue', 50, total);
    expect(tenths(next)).toBe(1000);
    expect(next[1]?.percent).toBe(25);
  });
});
