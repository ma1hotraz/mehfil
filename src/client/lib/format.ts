import { diffDays, formatLongDate } from '../../shared/engine/dates.js';
import { currencySymbol, formatMoney } from '../../shared/engine/money.js';
import type { Currency } from '../../shared/schema/brief.js';
import type { IdeaCategory, Verdict, VendorStatus } from '../../shared/schema/plan.js';

/** Formats minor units into localized currency string with proper symbols. */
export const money = (minor: number, currency: Currency): string => formatMoney(minor, currency);

export { formatLongDate };

/** Whole days from `today` to `date` (never negative). */
export const daysToGo = (today: string, date: string): number => Math.max(0, diffDays(today, date));

/** Formats count with singular or plural noun suffix. */
export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

/**
 * Counter for a milestone: "T–90" before the event, "T+7" after, "T–0" on the day.
 * @example tMinus(90) // 'T–90'
 */
export function tMinus(offsetDays: number): string {
  return offsetDays < 0 ? `T+${-offsetDays}` : `T–${offsetDays}`;
}

/** Spoken form of {@link tMinus}. */
export function tMinusSpoken(offsetDays: number): string {
  if (offsetDays === 0) {
    return 'on the day of the event';
  }
  return offsetDays < 0
    ? `${plural(-offsetDays, 'day')} after the event`
    : `${plural(offsetDays, 'day')} before the event`;
}

/** Whole-day offset of a due date from the event date: positive = before. */
export const offsetFromEvent = (eventDate: string, dueDate: string): number =>
  diffDays(dueDate, eventDate);

/** User-facing display labels for plan feasibility verdicts. */
export const VERDICT_LABELS: Record<Verdict, string> = {
  comfortable: 'Comfortable',
  workable: 'Workable',
  tight: 'Tight',
  unrealistic: 'Unrealistic',
};

/** User-facing display labels for vendor procurement statuses. */
export const STATUS_LABELS: Record<VendorStatus, string> = {
  'to-find': 'To find',
  enquired: 'Enquired',
  booked: 'Booked',
  paid: 'Paid',
};

/** User-facing display labels for creative idea categories. */
export const IDEA_CATEGORY_LABELS: Record<IdeaCategory, string> = {
  theme: 'Theme',
  decor: 'Décor',
  food: 'Food & drink',
  activities: 'Activities',
  favors: 'Favours & keepsakes',
  inclusion: 'Inclusion touches',
};

const BAND_WORDS = ['low', 'medium', 'high'] as const;

/** Relative cost marks, e.g. "₹₹" for band 2. */
export const costMarks = (currency: Currency, band: 1 | 2 | 3): string =>
  currencySymbol(currency).repeat(band);

/** Human-readable cost tier description for screen readers and tooltips. */
export const costLabel = (band: 1 | 2 | 3): string => `Cost: ${BAND_WORDS[band - 1] ?? 'medium'}`;
