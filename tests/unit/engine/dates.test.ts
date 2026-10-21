import { describe, expect, it } from 'vitest';

import {
  addDays,
  dayOfYear,
  diffDays,
  formatDate,
  formatLongDate,
  isValidDate,
  monthIndex,
  monthName,
  parseDate,
  weekdayName,
} from '../../../src/shared/engine/dates.js';

describe('dates', () => {
  it('parses only real calendar dates', () => {
    expect(parseDate('2027-03-12')).toBe(Date.UTC(2027, 2, 12));
    expect(parseDate('2027-02-30')).toBeUndefined();
    expect(parseDate('27-03-12')).toBeUndefined();
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2027-02-29')).toBe(false);
  });

  it('adds and diffs days across month, year and leap boundaries', () => {
    expect(addDays('2027-03-12', -90)).toBe('2026-12-12');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(diffDays('2026-10-21', '2027-03-12')).toBe(142);
    expect(diffDays('2027-03-12', '2026-10-21')).toBe(-142);
  });

  it('formats and names parts without timezone drift', () => {
    expect(formatDate(Date.UTC(2027, 2, 12))).toBe('2027-03-12');
    expect(monthName('2027-03-12')).toBe('March');
    expect(monthIndex('2027-03-12')).toBe(2);
    expect(weekdayName('2027-03-12')).toBe('Fri');
    expect(formatLongDate('2027-03-12')).toBe('Fri 12 Mar 2027');
    expect(dayOfYear('2026-10-21')).toBe(294);
  });

  it('throws a RangeError for an invalid date passed to arithmetic', () => {
    expect(() => addDays('nope', 1)).toThrow(RangeError);
  });
});
