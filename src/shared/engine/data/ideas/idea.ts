import type { Vibe } from '../../../schema/brief.js';
import type { IdeaCategory } from '../../../schema/plan.js';

/** One hand-written library idea, tagged so the selector can rank and filter it. */
export interface FallbackIdea {
  category: IdeaCategory;
  title: string;
  description: string;
  costBand: 1 | 2 | 3;
  vibes: readonly Vibe[];
  /** Dietary or accessibility tags that rule this idea out. */
  excludeIf: readonly string[];
}

/** Compact constructor for the library tables. */
export const idea = (
  category: IdeaCategory,
  title: string,
  description: string,
  costBand: 1 | 2 | 3,
  vibes: readonly Vibe[] = [],
  excludeIf: readonly string[] = [],
): FallbackIdea => ({ category, title, description, costBand, vibes, excludeIf });
