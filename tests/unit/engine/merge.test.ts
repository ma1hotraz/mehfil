import { describe, expect, it } from 'vitest';

import { applyAction } from '../../../src/shared/engine/actions.js';
import { rebalance } from '../../../src/shared/engine/budget.js';
import { buildPlan } from '../../../src/shared/engine/index.js';
import { carryOverState } from '../../../src/shared/engine/merge.js';
import { toMinor } from '../../../src/shared/engine/money.js';
import { eventLine, planTitle } from '../../../src/shared/labels.js';
import { planToText } from '../../../src/shared/planText.js';
import type { Plan } from '../../../src/shared/schema/plan.js';
import { ananya, fixedToday, minimalBrief, rahul } from '../../fixtures/briefs.js';

const base = buildPlan(ananya, fixedToday);

function edited(): Plan {
  const withTask = applyAction(
    base,
    {
      type: 'addTask',
      title: 'Call the florist',
      daysBeforeEvent: 20,
      category: 'decor',
      rationale: 'x',
    },
    fixedToday,
  );
  if ('error' in withTask) {
    throw new Error(withTask.error);
  }
  return {
    ...withTask.plan,
    timeline: withTask.plan.timeline.map((m, i) => ({ ...m, done: i < 2 })),
    vendors: withTask.plan.vendors.map((v, i) =>
      i === 0 ? { ...v, status: 'booked', contact: { name: 'Sharma Caterers' } } : v,
    ),
    ledger: rebalance(withTask.plan.ledger, 'photo', 14, toMinor(ananya.budget)).map((l) =>
      l.id === 'venue' ? { ...l, committedMinor: 5000 } : l,
    ),
    ideas: [
      {
        id: 'idea-1',
        category: 'theme',
        title: 'Kept',
        description: 'd',
        costBand: 1,
        fitsBecause: 'f',
        saved: true,
      },
      {
        id: 'idea-2',
        category: 'food',
        title: 'Dropped',
        description: 'd',
        costBand: 1,
        fitsBecause: 'f',
        saved: false,
      },
    ],
    ideasSource: 'library',
  };
}

describe('carryOverState', () => {
  const previous = edited();
  const fresh = buildPlan({ ...ananya, budget: 2_400_000, guestCount: 300 }, fixedToday);
  const merged = carryOverState(previous, fresh);

  it('keeps identity, done tasks, vendor status and contacts', () => {
    expect(merged.id).toBe(previous.id);
    expect(merged.createdAt).toBe(previous.createdAt);
    expect(
      merged.timeline
        .filter((m) => m.done)
        .map((m) => m.id)
        .sort(),
    ).toEqual(
      previous.timeline
        .filter((m) => m.done)
        .map((m) => m.id)
        .sort(),
    );
    expect(merged.vendors[0]).toMatchObject({
      status: 'booked',
      contact: { name: 'Sharma Caterers' },
    });
  });

  it('keeps custom tasks, committed amounts and saved ideas only', () => {
    expect(merged.timeline.some((m) => m.id.startsWith('custom-'))).toBe(true);
    expect(merged.ledger.find((l) => l.id === 'venue')?.committedMinor).toBe(5000);
    expect(merged.ideas.map((i) => i.title)).toEqual(['Kept']);
    expect(merged.ideasSource).toBe('pending');
  });

  it('re-applies custom shares to the new budget with exact totals', () => {
    expect(merged.ledger.find((l) => l.id === 'photo')?.percent).toBe(14);
    expect(merged.ledger.reduce((s, l) => s + l.amountMinor, 0)).toBe(toMinor(2_400_000));
    expect(merged.brief.guestCount).toBe(300);
  });

  it('uses fresh recommendations when the budget lines changed or nothing was edited', () => {
    const indoor = buildPlan({ ...ananya, setting: 'indoor' }, fixedToday);
    expect(carryOverState(previous, indoor).ledger.map((l) => l.percent)).toEqual(
      indoor.ledger.map((l) => l.percent),
    );
    const untouched = carryOverState(base, buildPlan({ ...ananya, budget: 3_000_000 }, fixedToday));
    expect(untouched.ledger.map((l) => l.percent)).toEqual(
      buildPlan({ ...ananya, budget: 3_000_000 }, fixedToday).ledger.map((l) => l.percent),
    );
  });

  it('does not duplicate custom tasks already present and leaves plain vendors alone', () => {
    const twice = carryOverState(merged, merged);
    expect(twice.timeline.filter((m) => m.id.startsWith('custom-'))).toHaveLength(1);
    const swapped = carryOverState(previous, buildPlan(rahul, fixedToday));
    expect(
      swapped.vendors.every(
        (v) => v.status === 'to-find' || previous.vendors.some((p) => p.id === v.id),
      ),
    ).toBe(true);
  });
});

describe('labels', () => {
  it('titles a plan by its title or a plain description', () => {
    expect(planTitle(ananya)).toBe('Ananya & Kabir');
    expect(planTitle(minimalBrief())).toBe('A traditional wedding');
    expect(planTitle({ ...minimalBrief({ eventType: 'birthday', subType: 'adult' }) })).toBe(
      'An adult birthday',
    );
    expect(planTitle({ ...minimalBrief(), subType: 'mystery' })).toBe('A mystery wedding');
  });

  it('writes the mono event line', () => {
    expect(eventLine(minimalBrief({ date: '2027-03-12', city: 'Delhi' }))).toBe(
      'WEDDING · TRADITIONAL · 100 GUESTS · DELHI · FRI 12 MAR 2027',
    );
    expect(eventLine({ ...minimalBrief(), subType: 'mystery' })).toContain('MYSTERY');
  });
});

describe('planToText', () => {
  it('summarises every section as plain text', () => {
    const text = planToText(base);
    expect(text.split('\n')[0]).toBe('Ananya & Kabir');
    for (const heading of ['LEDGER', 'TIMETABLE (open tasks)', 'VENDORS', 'RUN SHEET']) {
      expect(text).toContain(heading);
    }
    expect(text).toContain('Venue: 18.8%');
    expect(text).toContain('Caterer: to find, book by');
    expect(text).toMatch(/\[rushed\]/);
  });

  it('leaves out completed tasks', () => {
    const done = { ...base, timeline: base.timeline.map((m) => ({ ...m, done: true })) };
    expect(planToText(done)).not.toContain('Book the venue');
  });
});
