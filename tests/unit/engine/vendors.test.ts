import { describe, expect, it } from 'vitest';

import { addDays } from '../../../src/shared/engine/dates.js';
import { buildPlan } from '../../../src/shared/engine/index.js';
import { buildVendors } from '../../../src/shared/engine/vendors.js';
import { maxOffsetFor } from '../../../src/shared/engine/timeline.js';
import { EVENT_SUBTYPES, fixedToday, minimalBrief } from '../../fixtures/briefs.js';

const vendors = (overrides: Record<string, unknown> = {}) =>
  buildPlan(minimalBrief(overrides), fixedToday).vendors;
const idsOf = (overrides: Record<string, unknown> = {}) => vendors(overrides).map((v) => v.id);
const questionsOf = (id: string, overrides: Record<string, unknown> = {}) =>
  vendors(overrides).find((v) => v.id === id)?.questions ?? [];

describe('core vendor lists', () => {
  it('wedding core list', () => {
    expect(idsOf({ subType: 'court-and-reception', guestCount: 50 })).toEqual([
      'venue',
      'caterer',
      'decor',
      'photographer',
      'music',
      'invitations',
    ]);
    expect(idsOf({ subType: 'destination' })).toEqual(
      expect.arrayContaining(['travel-agent', 'guest-transport']),
    );
    expect(idsOf({ subType: 'traditional' })).toEqual(
      expect.arrayContaining(['makeup', 'officiant']),
    );
  });

  it('guest transport follows the 80-guest threshold', () => {
    expect(idsOf({ guestCount: 80, subType: 'intimate' })).not.toContain('guest-transport');
    expect(idsOf({ guestCount: 81, subType: 'intimate' })).toContain('guest-transport');
  });

  it('small birthdays get a home/society hall instead of a venue', () => {
    const small = vendors({ eventType: 'birthday', subType: 'adult', guestCount: 15 });
    expect(small.map((v) => v.id)).toContain('home-hall');
    expect(small.find((v) => v.id === 'home-hall')?.label).toBe('Home / society hall booking');
    expect(small.map((v) => v.id)).not.toContain('venue');
    expect(small.map((v) => v.id)).toContain('snacks');
  });

  it('larger birthdays get a venue and, above 20, a caterer', () => {
    const mid = idsOf({ eventType: 'birthday', subType: 'adult', guestCount: 20 });
    expect(mid).toContain('venue');
    expect(mid).toContain('snacks');
    expect(idsOf({ eventType: 'birthday', subType: 'adult', guestCount: 21 })).toContain('caterer');
  });

  it('birthday photographer for milestones or more than 50 guests; gifts for kids', () => {
    const b = { eventType: 'birthday', guestCount: 30 };
    expect(idsOf({ ...b, subType: 'adult' })).not.toContain('photographer');
    expect(idsOf({ ...b, subType: 'milestone' })).toContain('photographer');
    expect(idsOf({ ...b, subType: 'adult', guestCount: 51 })).toContain('photographer');
    expect(idsOf({ ...b, subType: 'kids' })).toContain('return-gifts');
  });

  it('community core list with crowd-dependent safety vendors', () => {
    const c = { eventType: 'community', subType: 'festival', setting: 'indoor' };
    expect(idsOf({ ...c, guestCount: 100 })).not.toContain('first-aid');
    expect(idsOf({ ...c, guestCount: 200 })).toContain('first-aid');
    expect(idsOf({ ...c, guestCount: 100, setting: 'outdoor' })).toContain('first-aid');
    expect(idsOf({ ...c, guestCount: 300 })).not.toContain('marshals');
    expect(idsOf({ ...c, guestCount: 301 })).toContain('marshals');
  });

  it('first-aid reason names its trigger', () => {
    const c = { eventType: 'community', subType: 'festival' };
    const reason = (o: Record<string, unknown>) =>
      vendors({ ...c, ...o }).find((v) => v.id === 'first-aid')?.reason;
    expect(reason({ guestCount: 250 })).toContain('200 or more');
    expect(reason({ guestCount: 50, setting: 'outdoor' })).toContain('outdoors');
  });
});

describe('cross-cutting vendors', () => {
  it('outdoor with 120 guests gets a canopy and portable restrooms; with 80 only a canopy', () => {
    expect(idsOf({ setting: 'outdoor', guestCount: 120 })).toEqual(
      expect.arrayContaining(['canopy', 'restrooms']),
    );
    const small = idsOf({ setting: 'outdoor', guestCount: 80 });
    expect(small).toContain('canopy');
    expect(small).not.toContain('restrooms');
    expect(idsOf({ setting: 'mixed', guestCount: 80 })).toContain('canopy');
    expect(idsOf({ setting: 'indoor' })).not.toContain('canopy');
  });

  it('adds vendors and questions for each access need', () => {
    expect(idsOf({ accessibility: ['hearing-support'] })).toContain('interpreter');
    expect(idsOf({ accessibility: ['visual-support'] })).toContain('signage');
    expect(questionsOf('venue', { accessibility: ['step-free'] }).join('|')).toMatch(
      /step-free entry/,
    );
    expect(questionsOf('venue', { accessibility: ['sensory-friendly'] }).join('|')).toMatch(
      /quiet room/,
    );
    expect(questionsOf('music', { accessibility: ['sensory-friendly'] }).join('|')).toMatch(
      /85 dB/,
    );
    const seat = questionsOf('venue', { accessibility: ['elderly-guests', 'seating-rest-areas'] });
    expect(seat.filter((q) => q.includes('back support'))).toHaveLength(1);
  });

  it('seating questions go to tents and seating for community events', () => {
    const q = questionsOf('tents-seating', {
      eventType: 'community',
      subType: 'festival',
      accessibility: ['elderly-guests'],
    });
    expect(q.join('|')).toMatch(/back support/);
    expect(
      questionsOf('venue', {
        eventType: 'community',
        subType: 'festival',
        accessibility: ['elderly-guests'],
      }).join('|'),
    ).not.toMatch(/back support/);
  });

  it('adds a caterer question per dietary need, and R30 for nut allergy', () => {
    const diets = {
      jain: /onion, garlic/,
      halal: /halal/,
      vegetarian: /vegetarian/,
      vegan: /vegan/,
      'gluten-free': /cross-contamination/,
      'nut-allergy': /nut-free kitchen/,
      'kids-menu': /kids’ menu/,
    } as const;
    for (const [diet, pattern] of Object.entries(diets)) {
      expect(questionsOf('caterer', { dietary: [diet] }).join('|')).toMatch(pattern);
    }
    const nut = buildPlan(minimalBrief({ dietary: ['nut-allergy'] }), fixedToday);
    expect(nut.insights.find((i) => i.ruleId === 'R30')?.severity).toBe('warning');
    expect(
      buildPlan(minimalBrief({ dietary: ['jain'] }), fixedToday).insights.some(
        (i) => i.ruleId === 'R30',
      ),
    ).toBe(false);
  });
});

describe('every vendor', () => {
  it.each(EVENT_SUBTYPES)(
    '%s / %s vendors have a reason and at least three questions',
    (type, sub) => {
      const list = vendors({
        eventType: type,
        subType: sub,
        guestCount: 350,
        setting: 'outdoor',
        accessibility: [
          'step-free',
          'hearing-support',
          'visual-support',
          'sensory-friendly',
          'elderly-guests',
        ],
        dietary: ['jain', 'halal', 'vegan'],
      });
      expect(list.length).toBeGreaterThanOrEqual(6);
      for (const v of list) {
        expect(v.reason).toMatch(/^Added because/);
        expect(v.questions.length).toBeGreaterThanOrEqual(3);
        expect(v.status).toBe('to-find');
        expect(new Set(v.questions).size).toBe(v.questions.length);
      }
      expect(new Set(list.map((v) => v.id)).size).toBe(list.length);
    },
  );

  it('book-by dates use the timeline compression', () => {
    const brief = minimalBrief({ date: addDays(fixedToday, 150) });
    const { vendors: list } = buildVendors(brief, 150, maxOffsetFor(brief));
    const venue = list.find((v) => v.id === 'venue');
    expect(venue?.bookByDate).toBe(addDays(brief.date, -Math.round((270 * 150) / 300)));
    expect((venue?.bookByDate ?? '') >= fixedToday).toBe(true);
  });
});
