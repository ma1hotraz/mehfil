import { stableHash } from '../hash.js';
import { conflictsWithBrief } from '../conflicts.js';
import type { EventBrief } from '../schema/brief.js';
import type { Feasibility, Idea, IdeaCategory } from '../schema/plan.js';
import { IDEA_CATEGORIES } from '../schema/plan.js';

import { FALLBACK_IDEAS, type FallbackIdea } from './data/fallbackIdeas.js';

export type BudgetBand = 'low' | 'mid' | 'high';

/** Budget band sent to the model and used to rank library ideas; never the exact amount. */
export function budgetBand(fit: Pick<Feasibility, 'verdict'>): BudgetBand {
  if (fit.verdict === 'comfortable') {
    return 'high';
  }
  return fit.verdict === 'workable' ? 'mid' : 'low';
}

const BAND_COST: Record<BudgetBand, number> = { low: 1, mid: 2, high: 3 };

/** Stable id for an idea title. */
export const ideaId = (title: string): string => `idea-${stableHash(title.toLowerCase())}`;

const isAllowed = (idea: FallbackIdea, brief: EventBrief): boolean =>
  ![...brief.dietary, ...brief.accessibility].some((tag) => idea.excludeIf.includes(tag)) &&
  !conflictsWithBrief(`${idea.title} ${idea.description}`, brief);

const score = (idea: FallbackIdea, brief: EventBrief, band: BudgetBand): number =>
  idea.vibes.filter((v) => brief.vibe.includes(v)).length * 2 +
  3 -
  Math.abs(idea.costBand - BAND_COST[band]);

function fitsBecause(brief: EventBrief, idea: FallbackIdea): string {
  const mood = idea.vibes.find((v) => brief.vibe.includes(v));
  const place = brief.city;
  const text = mood
    ? `Suits the ${mood} mood you chose, for ${brief.guestCount} guests in ${place}.`
    : `Works for ${brief.guestCount} guests in ${place}.`;
  return Array.from(text).slice(0, 140).join('');
}

const toIdea = (idea: FallbackIdea, brief: EventBrief): Idea => ({
  id: ideaId(idea.title),
  category: idea.category,
  title: idea.title,
  description: idea.description,
  costBand: idea.costBand,
  fitsBecause: fitsBecause(brief, idea),
  saved: false,
});

/**
 * Picks library ideas for the brief, deterministically. Drops anything that conflicts with the
 * brief's needs or repeats `exclude`, ranks by vibe overlap and cost fit, and for `focus: 'all'`
 * takes one idea per category first (so the set always spans the categories).
 * @example selectFallbackIdeas(brief, 'all', 10, [], feasibility)
 */
export function selectFallbackIdeas(
  brief: EventBrief,
  focus: 'all' | IdeaCategory,
  count: number,
  exclude: readonly string[],
  fit: Pick<Feasibility, 'verdict'>,
): Idea[] {
  const band = budgetBand(fit);
  const skip = new Set(exclude.map((title) => title.toLowerCase()));
  const ranked = (FALLBACK_IDEAS[`${brief.eventType}/${brief.subType}`] ?? [])
    .filter((idea) => isAllowed(idea, brief) && !skip.has(idea.title.toLowerCase()))
    .filter((idea) => focus === 'all' || idea.category === focus)
    .map((idea) => ({ idea, value: score(idea, brief, band) }))
    .sort((a, b) => b.value - a.value || a.idea.title.localeCompare(b.idea.title))
    .map(({ idea }) => idea);
  const leaders =
    focus === 'all'
      ? IDEA_CATEGORIES.flatMap((c) => ranked.filter((i) => i.category === c).slice(0, 1))
      : [];
  const chosen = [...leaders, ...ranked.filter((idea) => !leaders.includes(idea))];
  return chosen.slice(0, count).map((idea) => toIdea(idea, brief));
}
