import { describe, expect, it } from 'vitest';

import { buildPlan } from '../../../src/shared/engine/index.js';
import { Plan } from '../../../src/shared/schema/plan.js';
import { ananya, fixedToday, meera, minimalBrief, rahul, sam } from '../../fixtures/briefs.js';

const facts = (brief: typeof ananya) => {
  const plan = buildPlan(brief, fixedToday);
  return {
    verdict: plan.feasibility.verdict,
    ledger: plan.ledger.map((l) => l.id),
    milestones: plan.timeline.length,
    vendors: plan.vendors.length,
    rules: [...new Set(plan.insights.map((i) => i.ruleId))].sort(),
  };
};

describe('buildPlan personas', () => {
  it('Ananya: comfortable, accessibility line and step-free venue question', () => {
    expect(facts(ananya)).toMatchInlineSnapshot(`
      {
        "ledger": [
          "venue",
          "catering",
          "decor",
          "photo",
          "attire",
          "entertainment",
          "invitations",
          "transport",
          "weatherCover",
          "accessibility",
          "contingency",
        ],
        "milestones": 23,
        "rules": [
          "R01",
          "R03",
          "R04",
          "R05",
          "R12",
          "R20",
        ],
        "vendors": 11,
        "verdict": "comfortable",
      }
    `);
    const venue = buildPlan(ananya, fixedToday).vendors.find((v) => v.id === 'venue');
    expect(venue?.questions.join('|')).toMatch(/step-free entry/);
  });

  it('Rahul: nut warning and supervisors task', () => {
    const plan = buildPlan(rahul, fixedToday);
    expect(plan.insights.some((i) => i.ruleId === 'R30')).toBe(true);
    expect(plan.timeline.some((m) => m.id === 'supervisors')).toBe(true);
    expect(facts(rahul).vendors).toBe(7);
  });

  it('Meera: safety at least 10% and permits critical', () => {
    const plan = buildPlan(meera, fixedToday);
    expect(plan.ledger.find((l) => l.id === 'safety')?.percent).toBeGreaterThanOrEqual(10);
    expect(plan.timeline.find((m) => m.id === 'apply-permits')?.critical).toBe(true);
    expect(plan.insights.some((i) => i.ruleId === 'R06')).toBe(true);
  });

  it('Sam: formatted in pounds and workable', () => {
    const plan = buildPlan(sam, fixedToday);
    expect(plan.feasibility.verdict).toBe('workable');
    expect(plan.feasibility.reason).toContain('£75');
  });
});

describe('buildPlan contract', () => {
  it('is deterministic', () => {
    expect(buildPlan(ananya, fixedToday)).toEqual(buildPlan(ananya, fixedToday));
  });

  it('produces a plan the Plan schema accepts', () => {
    for (const brief of [ananya, rahul, meera, sam]) {
      expect(Plan.safeParse(buildPlan(brief, fixedToday)).success).toBe(true);
    }
  });

  it('uses injected id and timestamp when given, and sorts insights by severity', () => {
    const plan = buildPlan(ananya, fixedToday, { id: 'abc', now: '2026-10-21T10:00:00.000Z' });
    expect(plan.id).toBe('abc');
    expect(plan.updatedAt).toBe('2026-10-21T10:00:00.000Z');
    const rank = { critical: 0, warning: 1, advice: 2, info: 3 } as const;
    const ranks = plan.insights.map((i) => rank[i.severity]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('treats a past event date as zero lead time instead of failing', () => {
    const plan = buildPlan(minimalBrief({ date: '2026-10-01' }), fixedToday);
    expect(plan.timeline.filter((m) => m.idealOffsetDays > 0).every((m) => m.rushed)).toBe(true);
  });

  it('builds a 5,000-guest plan in well under 5 ms on average', () => {
    const brief = minimalBrief({ guestCount: 5000, budget: 9e9 });
    const runs = 1000;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) {
      buildPlan(brief, fixedToday);
    }
    expect((performance.now() - start) / runs).toBeLessThan(5);
  });
});
