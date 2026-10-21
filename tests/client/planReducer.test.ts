import { describe, expect, it } from 'vitest';

import {
  initialPlansState,
  openPlan,
  plansReducer,
  type PlansState,
} from '../../src/client/lib/planReducer';
import { rebalance } from '../../src/shared/engine/budget.js';
import { buildPlan } from '../../src/shared/engine/index.js';
import { toMinor } from '../../src/shared/engine/money.js';
import type { Idea } from '../../src/shared/schema/plan.js';
import { deepFreeze } from '../helpers/freeze';
import { ananya, fixedToday, rahul } from '../fixtures/briefs';

const NOW = '2026-10-22T09:00:00.000Z';
const planA = buildPlan(ananya, fixedToday, { id: 'a', now: '2026-10-21T00:00:00.000Z' });
const planB = buildPlan(rahul, fixedToday, { id: 'b', now: '2026-10-21T00:00:00.000Z' });
const idea = (id: string, over: Partial<Idea> = {}): Idea => ({
  id,
  category: 'food',
  title: id,
  description: 'd',
  costBand: 1,
  fitsBecause: 'f',
  saved: false,
  ...over,
});
const start = (): PlansState => deepFreeze({ plans: [planA, planB], openId: 'a' });
const run = (state: PlansState, ...actions: Parameters<typeof plansReducer>[1][]) =>
  actions.reduce(plansReducer, state);

describe('shelf actions', () => {
  it('loads, opens and closes plans', () => {
    expect(run(initialPlansState, { type: 'loaded', plans: [planA], openId: 'a' })).toEqual({
      plans: [planA],
      openId: 'a',
    });
    expect(openPlan(start())?.id).toBe('a');
    expect(run(start(), { type: 'open', id: 'b' }).openId).toBe('b');
    expect(openPlan(run(start(), { type: 'open', id: undefined }))).toBeUndefined();
  });

  it('saves new plans to the front, replaces existing ones and opens them', () => {
    const c = buildPlan(ananya, fixedToday, { id: 'c', now: NOW });
    expect(run(start(), { type: 'save', plan: c }).plans.map((p) => p.id)).toEqual(['c', 'a', 'b']);
    const edited = { ...planA, updatedAt: NOW };
    const replaced = run(start(), { type: 'save', plan: edited });
    expect(replaced.plans.map((p) => p.id)).toEqual(['a', 'b']);
    expect(replaced.plans[0]?.updatedAt).toBe(NOW);
  });

  it('removes plans and clears the open id only when it was removed', () => {
    expect(run(start(), { type: 'remove', id: 'a' })).toMatchObject({ openId: undefined });
    expect(run(start(), { type: 'remove', id: 'b' })).toMatchObject({ openId: 'a' });
    expect(run(start(), { type: 'remove', id: 'b' }).plans).toHaveLength(1);
  });

  it('ignores edits when no plan is open', () => {
    const closed = run(start(), { type: 'open', id: undefined });
    expect(run(closed, { type: 'toggleTask', id: 'book-venue', now: NOW })).toBe(closed);
  });
});

describe('editing the open plan', () => {
  it('replaces the ledger, stamps updatedAt and leaves other plans alone', () => {
    const ledger = rebalance(planA.ledger, 'photo', 14, toMinor(ananya.budget));
    const next = run(start(), { type: 'setLedger', ledger, now: NOW });
    const plan = openPlan(next);
    expect(plan?.ledger).toBe(ledger);
    expect(plan?.updatedAt).toBe(NOW);
    expect(next.plans[1]).toBe(planB);
  });

  it('sets and clears committed amounts', () => {
    const set = run(start(), { type: 'setCommitted', id: 'venue', minor: 500_000, now: NOW });
    expect(openPlan(set)?.ledger.find((l) => l.id === 'venue')?.committedMinor).toBe(500_000);
    expect(openPlan(set)?.ledger.find((l) => l.id === 'decor')).not.toHaveProperty(
      'committedMinor',
    );
    const cleared = run(set, { type: 'setCommitted', id: 'venue', minor: undefined, now: NOW });
    expect(openPlan(cleared)?.ledger.find((l) => l.id === 'venue')).not.toHaveProperty(
      'committedMinor',
    );
  });

  it('toggles tasks both ways', () => {
    const once = run(start(), { type: 'toggleTask', id: 'book-venue', now: NOW });
    expect(openPlan(once)?.timeline.find((m) => m.id === 'book-venue')?.done).toBe(true);
    const twice = run(once, { type: 'toggleTask', id: 'book-venue', now: NOW });
    expect(openPlan(twice)?.timeline.find((m) => m.id === 'book-venue')?.done).toBe(false);
  });

  it('updates vendor status and contact', () => {
    const next = run(
      start(),
      { type: 'setVendorStatus', id: 'caterer', status: 'booked', now: NOW },
      {
        type: 'setVendorContact',
        id: 'caterer',
        contact: { name: 'Sharma', phone: '98' },
        now: NOW,
      },
    );
    expect(openPlan(next)?.vendors.find((v) => v.id === 'caterer')).toMatchObject({
      status: 'booked',
      contact: { name: 'Sharma' },
    });
  });

  it('toggles a saved idea', () => {
    const withIdeas = { ...start(), plans: [{ ...planA, ideas: [idea('x')] }, planB] };
    const saved = run(withIdeas, { type: 'toggleIdeaSaved', id: 'x', now: NOW });
    expect(openPlan(saved)?.ideas[0]?.saved).toBe(true);
    expect(
      openPlan(run(saved, { type: 'toggleIdeaSaved', id: 'x', now: NOW }))?.ideas[0]?.saved,
    ).toBe(false);
  });
});

describe('setIdeas', () => {
  const withIdeas = (): PlansState => ({
    plans: [
      {
        ...planA,
        ideas: [
          idea('keep', { saved: true }),
          idea('drop'),
          idea('theme-1', { category: 'theme' }),
        ],
      },
      planB,
    ],
    openId: 'a',
  });

  it('replaces unsaved ideas for a full request and keeps saved ones', () => {
    const next = run(withIdeas(), {
      type: 'setIdeas',
      planId: 'a',
      ideas: [idea('new'), idea('keep', { saved: false })],
      focus: 'all',
      source: 'gemini',
      now: NOW,
    });
    const plan = openPlan(next);
    expect(plan?.ideas.map((i) => i.id)).toEqual(['keep', 'new']);
    expect(plan?.ideas[0]?.saved).toBe(true);
    expect(plan?.ideasSource).toBe('gemini');
  });

  it('replaces only the focused category for a focused request', () => {
    const next = run(withIdeas(), {
      type: 'setIdeas',
      planId: 'a',
      ideas: [idea('more', { category: 'food' })],
      focus: 'food',
      source: 'library',
      now: NOW,
    });
    expect(openPlan(next)?.ideas.map((i) => i.id)).toEqual(['keep', 'theme-1', 'more']);
  });

  it('writes to the plan it was requested for even if another is now open', () => {
    const switched = { ...withIdeas(), openId: 'b' };
    const next = run(switched, {
      type: 'setIdeas',
      planId: 'a',
      ideas: [idea('late')],
      focus: 'all',
      source: 'library',
      now: NOW,
    });
    expect(next.plans[0]?.ideas.map((i) => i.id)).toContain('late');
    expect(next.plans[1]).toBe(planB);
  });
});
