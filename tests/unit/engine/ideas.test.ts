import { describe, expect, it } from 'vitest';

import { conflictsWithBrief, containsContactDetails } from '../../../src/shared/conflicts.js';
import { FALLBACK_IDEAS } from '../../../src/shared/engine/data/fallbackIdeas.js';
import { feasibility } from '../../../src/shared/engine/feasibility.js';
import { budgetBand, ideaId, selectFallbackIdeas } from '../../../src/shared/engine/ideas.js';
import { ACCESS, DIETARY } from '../../../src/shared/schema/brief.js';
import { IDEA_CATEGORIES } from '../../../src/shared/schema/plan.js';
import { EVENT_SUBTYPES, ananya, minimalBrief, rahul } from '../../fixtures/briefs.js';

const pick = (type: string, sub: string, extra: Record<string, unknown> = {}) =>
  minimalBrief({ eventType: type, subType: sub, guestCount: 60, ...extra });
const select = (
  b: ReturnType<typeof minimalBrief>,
  n = 10,
  focus: 'all' | (typeof IDEA_CATEGORIES)[number] = 'all',
  exclude: string[] = [],
) => selectFallbackIdeas(b, focus, n, exclude, feasibility(b));

describe('fallback library', () => {
  it('has at least 12 ideas per sub-type, two per category, with no duplicate titles anywhere', () => {
    const titles = Object.values(FALLBACK_IDEAS).flatMap((list) =>
      list.map((i) => i.title.toLowerCase()),
    );
    expect(new Set(titles).size).toBe(titles.length);
    for (const [type, sub] of EVENT_SUBTYPES) {
      const list = FALLBACK_IDEAS[`${type}/${sub}`] ?? [];
      expect(list.length).toBeGreaterThanOrEqual(12);
      for (const category of IDEA_CATEGORIES) {
        expect(list.filter((i) => i.category === category).length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('keeps every idea within the schema length limits and free of contact details', () => {
    for (const list of Object.values(FALLBACK_IDEAS)) {
      for (const i of list) {
        expect(i.title.length).toBeLessThanOrEqual(60);
        expect(i.description.length).toBeLessThanOrEqual(240);
        expect(containsContactDetails(`${i.title} ${i.description}`)).toBe(false);
      }
    }
  });
});

describe('selectFallbackIdeas', () => {
  it.each(EVENT_SUBTYPES)(
    '%s / %s: one tag at a time still yields six conflict-free ideas',
    (type, sub) => {
      for (const tag of [...DIETARY, ...ACCESS]) {
        const brief = pick(
          type,
          sub,
          DIETARY.includes(tag as never) ? { dietary: [tag] } : { accessibility: [tag] },
        );
        const ideas = select(brief);
        expect(ideas.length).toBeGreaterThanOrEqual(6);
        for (const idea of ideas) {
          expect(conflictsWithBrief(`${idea.title} ${idea.description}`, brief)).toBe(false);
          const source = (FALLBACK_IDEAS[`${type}/${sub}`] ?? []).find(
            (s) => s.title === idea.title,
          );
          expect(source?.excludeIf.includes(tag)).toBe(false);
        }
      }
    },
  );

  it('spans all six categories for focus all', () => {
    const categories = new Set(select(pick('wedding', 'traditional')).map((i) => i.category));
    expect(categories.size).toBe(6);
  });

  it('honours focus, count and exclude (case-insensitive)', () => {
    const brief = pick('wedding', 'traditional');
    const foods = select(brief, 3, 'food');
    expect(foods).toHaveLength(2);
    expect(foods.every((i) => i.category === 'food')).toBe(true);
    const again = select(brief, 10, 'food', [foods[0]?.title.toUpperCase() ?? '']);
    expect(again.map((i) => i.title)).not.toContain(foods[0]?.title);
  });

  it('is deterministic and ranks vibe matches first', () => {
    const brief = pick('wedding', 'traditional', { vibe: ['eco-conscious'] });
    expect(select(brief)).toEqual(select(brief));
    const favours = select(brief, 2, 'favors');
    expect(favours[0]?.title).toBe('Potted tulsi sapling favour');
    expect(favours[0]?.fitsBecause).toContain('eco-conscious');
  });

  it('writes fits-because lines tied to the brief, within 140 characters', () => {
    const plain = select(rahul)[0];
    expect(plain?.fitsBecause).toMatch(/25 guests in Pune/);
    const long = select(minimalBrief({ city: 'x'.repeat(60), vibe: ['classic'] }), 10);
    expect(long.every((i) => i.fitsBecause.length <= 140)).toBe(true);
  });

  it('returns unsaved ideas with stable ids and nothing for an unknown sub-type', () => {
    const [first] = select(ananya);
    expect(first?.saved).toBe(false);
    expect(first?.id).toBe(ideaId(first?.title ?? ''));
    expect(select({ ...minimalBrief(), subType: 'unknown' })).toEqual([]);
  });

  it('maps feasibility to a budget band', () => {
    expect(budgetBand({ verdict: 'comfortable' })).toBe('high');
    expect(budgetBand({ verdict: 'workable' })).toBe('mid');
    expect(budgetBand({ verdict: 'unrealistic' })).toBe('low');
  });
});

describe('conflictsWithBrief', () => {
  it('flags nuts, animal products and sensory triggers only for matching needs', () => {
    const nut = minimalBrief({ dietary: ['nut-allergy'] });
    expect(conflictsWithBrief('Almond barfi tray', nut)).toBe(true);
    expect(conflictsWithBrief('Almond barfi tray', minimalBrief())).toBe(false);
    for (const diet of ['vegan', 'vegetarian', 'jain']) {
      expect(conflictsWithBrief('Chicken tikka station', minimalBrief({ dietary: [diet] }))).toBe(
        true,
      );
    }
    expect(
      conflictsWithBrief(
        'Strobe lights and fireworks',
        minimalBrief({ accessibility: ['sensory-friendly'] }),
      ),
    ).toBe(true);
    expect(
      conflictsWithBrief('Soft candles', minimalBrief({ accessibility: ['sensory-friendly'] })),
    ).toBe(false);
  });
});

describe('containsContactDetails', () => {
  it.each([
    ['Visit https://example.com today', true],
    ['see www.example.com', true],
    ['mail me at a@b.co', true],
    ['call +91 98765 43210', true],
    ['Marigold garlands for 250 guests', false],
  ])('%s → %s', (text, expected) => {
    expect(containsContactDetails(text)).toBe(expected);
  });
});
