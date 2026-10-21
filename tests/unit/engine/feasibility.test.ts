import { describe, expect, it } from 'vitest';

import { benchmarkPerGuest } from '../../../src/shared/engine/data/benchmarks.js';
import {
  feasibility,
  feasibilityInsights,
  verdictFor,
} from '../../../src/shared/engine/feasibility.js';
import { buildPlan } from '../../../src/shared/engine/index.js';
import { fixedToday, minimalBrief } from '../../fixtures/briefs.js';

// Traditional wedding, 100 guests, INR: benchmark ₹3,500 per guest.
const at = (perGuest: number) =>
  feasibility(minimalBrief({ guestCount: 100, budget: perGuest * 100 }));

describe('feasibility verdicts', () => {
  it.each([
    [2099, 'unrealistic'],
    [2100, 'tight'],
    [3499, 'tight'],
    [3500, 'workable'],
    [5249, 'workable'],
    [5250, 'comfortable'],
  ] as const)('₹%i per guest is %s', (perGuest, verdict) => {
    expect(at(perGuest).verdict).toBe(verdict);
  });

  it('classifies ratios at the exact boundaries', () => {
    expect(verdictFor(0.6)).toBe('tight');
    expect(verdictFor(0.5999)).toBe('unrealistic');
    expect(verdictFor(1)).toBe('workable');
    expect(verdictFor(1.5)).toBe('comfortable');
  });

  it('reports per-guest and benchmark figures in minor units', () => {
    const f = at(3500);
    expect(f.perGuestMinor).toBe(350_000);
    expect(f.benchmarkMinor).toBe(350_000);
    expect(f.reason).toContain('₹3,500');
  });

  it('treats an unknown sub-type as comfortable rather than crashing', () => {
    const odd = { ...minimalBrief(), subType: 'unknown' };
    expect(feasibility(odd).ratio).toBe(99);
  });

  it('derives EUR and GBP benchmarks from the USD table', () => {
    expect(benchmarkPerGuest('USD', 'wedding/traditional')).toBe(150);
    expect(benchmarkPerGuest('EUR', 'wedding/traditional')).toBe(138);
    expect(benchmarkPerGuest('GBP', 'wedding/traditional')).toBe(119);
  });
});

describe('feasibility insights', () => {
  const rules = (perGuest: number) =>
    buildPlan(minimalBrief({ guestCount: 100, budget: perGuest * 100 }), fixedToday)
      .insights.map((i) => i.ruleId)
      .filter((id) => ['R10', 'R11', 'R12'].includes(id));

  it('R10 only appears for tight or unrealistic plans', () => {
    expect(rules(3500)).toEqual([]);
    expect(rules(2100)).toEqual(['R10']);
    expect(rules(2000).sort()).toEqual(['R10', 'R11']);
  });

  it('R11 computes the budget needed and the guests that fit', () => {
    const plan = buildPlan(minimalBrief({ guestCount: 250, budget: 500_000 }), fixedToday);
    const r11 = plan.insights.find((i) => i.ruleId === 'R11');
    expect(r11?.severity).toBe('critical');
    expect(r11?.detail).toContain('₹8,75,000');
    expect(r11?.detail).toContain('142 guests');
  });

  it('R11 never suggests fewer than one guest', () => {
    const plan = buildPlan(minimalBrief({ guestCount: 5000, budget: 10 }), fixedToday);
    expect(plan.insights.find((i) => i.ruleId === 'R11')?.detail).toContain('about 1 guest.');
  });

  it('R12 appears at ratio 2.0 and above, not below', () => {
    expect(rules(7000)).toEqual(['R12']);
    expect(rules(6999)).toEqual([]);
  });

  it('lists type-specific lean tips', () => {
    const brief = minimalBrief({
      eventType: 'community',
      subType: 'festival',
      guestCount: 100,
      budget: 1,
    });
    const r10 = feasibilityInsights(brief, feasibility(brief)).find((i) => i.ruleId === 'R10');
    expect(r10?.detail).toContain('municipal ground');
  });
});
