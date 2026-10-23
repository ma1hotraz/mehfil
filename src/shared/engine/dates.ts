import { at } from '../util.js';

/** Date-only helpers. Everything is UTC so there is no timezone drift (docs/03 §4). */
const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Parses `YYYY-MM-DD` to UTC milliseconds, or `undefined` for malformed or impossible dates. */
export function parseDate(date: string): number | undefined {
  const match = ISO_DATE.exec(date);
  if (!match) {
    return undefined;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const ms = Date.UTC(year, month - 1, day);
  const parsed = new Date(ms);
  const isRealDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  return isRealDate ? ms : undefined;
}

export const isValidDate = (date: string): boolean => parseDate(date) !== undefined;

function mustParse(date: string): number {
  const ms = parseDate(date);
  if (ms === undefined) {
    throw new RangeError(`Invalid date: ${date}`);
  }
  return ms;
}

/** @example formatDate(Date.UTC(2027, 2, 12)) // '2027-03-12' */
export function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** @example addDays('2027-03-12', -90) // '2026-12-12' */
export function addDays(date: string, days: number): string {
  return formatDate(mustParse(date) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: string, to: string): number {
  return Math.round((mustParse(to) - mustParse(from)) / MS_PER_DAY);
}

export const monthIndex = (date: string): number => new Date(mustParse(date)).getUTCMonth();
export const monthName = (date: string): string => at(MONTHS, monthIndex(date));
export const weekdayName = (date: string): string =>
  at(WEEKDAYS, new Date(mustParse(date)).getUTCDay());

/** Day of the year, 1-based (used by the masthead dateline). */
export function dayOfYear(date: string): number {
  const ms = mustParse(date);
  return diffDays(formatDate(Date.UTC(new Date(ms).getUTCFullYear(), 0, 1)), date) + 1;
}

/** @example formatLongDate('2027-03-12') // 'Fri 12 Mar 2027' */
export function formatLongDate(date: string): string {
  const [year, , day] = date.split('-');
  return `${weekdayName(date)} ${Number(day)} ${monthName(date).slice(0, 3)} ${year}`;
}
