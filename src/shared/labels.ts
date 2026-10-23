import { formatLongDate } from './engine/dates.js';
import type { Access, Dietary, EventBrief, EventType, Vibe } from './schema/brief.js';

/** User-facing display names for event categories. */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'wedding',
  birthday: 'birthday',
  community: 'community event',
};

/** User-facing display names for event sub-categories. */
export const SUB_TYPE_LABELS: Record<string, string> = {
  traditional: 'traditional',
  intimate: 'intimate',
  destination: 'destination',
  'court-and-reception': 'court and reception',
  kids: 'children’s',
  teen: 'teenage',
  adult: 'adult',
  milestone: 'milestone',
  festival: 'festival',
  fundraiser: 'fundraiser',
  'cultural-night': 'cultural night',
  drive: 'clean-up or donation drive',
};

/** Human-readable display labels for aesthetic and atmosphere vibes. */
export const VIBE_LABELS: Record<Vibe, string> = {
  classic: 'Classic',
  playful: 'Playful',
  minimalist: 'Minimalist',
  festive: 'Festive',
  rustic: 'Rustic',
  elegant: 'Elegant',
  'eco-conscious': 'Eco-conscious',
  cultural: 'Cultural',
};

/** Human-readable display labels for catering and dietary options. */
export const DIETARY_LABELS: Record<Dietary, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  jain: 'Jain',
  halal: 'Halal',
  'gluten-free': 'Gluten-free',
  'nut-allergy': 'Nut allergy',
  'kids-menu': 'Kids’ menu',
};

/** Human-readable display labels for accessibility amenities and considerations. */
export const ACCESS_LABELS: Record<Access, string> = {
  'step-free': 'Step-free access',
  'hearing-support': 'Hearing support',
  'visual-support': 'Visual support',
  'seating-rest-areas': 'Seating and rest areas',
  'sensory-friendly': 'Sensory-friendly',
  'elderly-guests': 'Elderly guests',
};

/** Heading for a plan: the brief's title, or a plain description of the event. */
export function planTitle(brief: Pick<EventBrief, 'title' | 'eventType' | 'subType'>): string {
  if (brief.title) {
    return brief.title;
  }
  const sub = SUB_TYPE_LABELS[brief.subType] ?? brief.subType;
  return `A ${sub} ${EVENT_TYPE_LABELS[brief.eventType]}`.replace(/^A ([aeiou])/, 'An $1');
}

/**
 * The mono dateline under a plan title.
 * @example eventLine(brief) // 'WEDDING · TRADITIONAL · 250 GUESTS · JAIPUR · FRI 12 MAR 2027'
 */
export function eventLine(brief: EventBrief): string {
  const sub = (SUB_TYPE_LABELS[brief.subType] ?? brief.subType).toUpperCase();
  return [
    brief.eventType.toUpperCase(),
    sub,
    `${brief.guestCount} GUESTS`,
    brief.city.toUpperCase(),
    formatLongDate(brief.date).toUpperCase(),
  ].join(' · ');
}
