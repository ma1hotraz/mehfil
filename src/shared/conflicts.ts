import type { EventBrief } from './schema/brief.js';

const NUTS =
  /\b(nut|nuts|almond|almonds|cashew|cashews|peanut|peanuts|pistachio|pistachios|walnut|walnuts|praline)\b/i;
const ANIMAL =
  /\b(chicken|mutton|lamb|beef|pork|fish|prawn|prawns|shrimp|meat|egg|eggs|bacon|sausage|salami)\b/i;
const SENSORY = /strobe|fireworks|confetti cannon/i;

/**
 * Defence in depth for ideas (docs/05 §4.3): true when `text` clashes with a dietary or access
 * need in the brief. Used for model output and for the fallback library alike.
 */
export function conflictsWithBrief(text: string, brief: EventBrief): boolean {
  const diets = brief.dietary;
  const vegetarian = diets.some((d) => d === 'vegan' || d === 'vegetarian' || d === 'jain');
  return (
    (diets.includes('nut-allergy') && NUTS.test(text)) ||
    (vegetarian && ANIMAL.test(text)) ||
    (brief.accessibility.includes('sensory-friendly') && SENSORY.test(text))
  );
}

const URL_PATTERN = /https?:\/\/|www\./i;
const EMAIL_PATTERN = /\S+@\S+\.\S+/;
const LONG_DIGITS = /\d(?:[\s().-]?\d){7,}/;

/** True when text carries a link, an email address or a phone-like digit run (docs/05 §4.2). */
export const containsContactDetails = (text: string): boolean =>
  URL_PATTERN.test(text) || EMAIL_PATTERN.test(text) || LONG_DIGITS.test(text);
