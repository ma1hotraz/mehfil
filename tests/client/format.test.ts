import { describe, expect, it } from 'vitest';

import { localToday, nowIso } from '../../src/client/lib/clock';
import { cx } from '../../src/client/lib/cx';
import {
  costLabel,
  costMarks,
  daysToGo,
  money,
  offsetFromEvent,
  plural,
  tMinus,
  tMinusSpoken,
} from '../../src/client/lib/format';
import { sampleBriefs } from '../../src/client/lib/samples';
import { Plan } from '../../src/shared/schema/plan.js';
import { buildPlan } from '../../src/shared/engine/index.js';
import { fileSlug } from '../../src/client/lib/exports';
import { ananya, fixedToday } from '../fixtures/briefs';

describe('format helpers', () => {
  it('formats money, plurals and counters', () => {
    expect(money(180_000_000, 'INR')).toBe('₹18,00,000');
    expect(plural(1, 'task')).toBe('1 task');
    expect(plural(2, 'task')).toBe('2 tasks');
    expect(plural(2, 'notice', 'notices')).toBe('2 notices');
    expect(tMinus(90)).toBe('T–90');
    expect(tMinus(0)).toBe('T–0');
    expect(tMinus(-7)).toBe('T+7');
    expect(tMinusSpoken(90)).toBe('90 days before the event');
    expect(tMinusSpoken(1)).toBe('1 day before the event');
    expect(tMinusSpoken(0)).toBe('on the day of the event');
    expect(tMinusSpoken(-3)).toBe('3 days after the event');
    expect(offsetFromEvent('2027-03-12', '2026-12-12')).toBe(90);
    expect(daysToGo('2026-10-21', '2027-03-12')).toBe(142);
    expect(daysToGo('2027-03-13', '2027-03-12')).toBe(0);
  });

  it('describes cost bands as marks and as text', () => {
    expect(costMarks('INR', 2)).toBe('₹₹');
    expect(costMarks('GBP', 3)).toBe('£££');
    expect(costLabel(1)).toBe('Cost: low');
    expect(costLabel(2)).toBe('Cost: medium');
    expect(costLabel(3)).toBe('Cost: high');
  });

  it('joins class names and reads the local date', () => {
    expect(cx('a', false, undefined, 'b', null)).toBe('a b');
    expect(localToday(new Date(2027, 2, 5))).toBe('2027-03-05');
    expect(nowIso(new Date('2026-10-21T10:00:00Z'))).toBe('2026-10-21T10:00:00.000Z');
    expect(localToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(nowIso()).toMatch(/T/);
  });

  it('builds file names from plan titles', () => {
    expect(fileSlug(buildPlan(ananya, fixedToday))).toBe('ananya-kabir');
    expect(fileSlug({ ...buildPlan(ananya, fixedToday), brief: { ...ananya, title: '!!!' } })).toBe(
      'mehfil-plan',
    );
  });
});

describe('sample briefs', () => {
  it('are valid, relative to today and cover all three event types', () => {
    const samples = sampleBriefs(fixedToday);
    expect(samples.map((s) => s.brief.eventType)).toEqual(['wedding', 'birthday', 'community']);
    for (const sample of samples) {
      expect(Plan.safeParse(buildPlan(sample.brief, fixedToday)).success).toBe(true);
      expect(sample.brief.date >= fixedToday).toBe(true);
    }
    expect(samples[0]?.label).toBe('A Jaipur wedding · 250 guests');
  });
});
