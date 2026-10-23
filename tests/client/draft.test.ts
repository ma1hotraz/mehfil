import { describe, expect, it } from 'vitest';

import {
  draftFromBrief,
  emptyDraft,
  errorsFrom,
  parseAmount,
  parseCount,
  parseDraft,
  subTypeFor,
  type IntakeDraft,
} from '../../src/client/lib/draft';
import { ananya, fixedToday } from '../fixtures/briefs';

const valid = (over: Partial<IntakeDraft> = {}): IntakeDraft => ({
  ...draftFromBrief(ananya),
  ...over,
});
const errorsOf = (draft: IntakeDraft) => {
  const result = parseDraft(draft, fixedToday);
  return result.ok ? {} : result.error;
};

describe('parsing typed numbers', () => {
  it('reads amounts with symbols and separators', () => {
    expect(parseAmount('₹ 18,00,000')).toBe(1_800_000);
    expect(parseAmount('£3,000.50')).toBe(3000.5);
    expect(parseAmount('abc')).toBeUndefined();
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount('1.2.3')).toBeUndefined();
  });

  it('reads whole guest counts', () => {
    expect(parseCount('1,250')).toBe(1250);
    expect(parseCount('x')).toBeUndefined();
  });
});

describe('drafts', () => {
  it('starts blank three months out and round-trips a brief', () => {
    const blank = emptyDraft(fixedToday);
    expect(blank).toMatchObject({ eventType: 'wedding', guestCount: '', date: '2027-01-19' });
    expect(parseDraft(draftFromBrief(ananya), fixedToday)).toEqual({ ok: true, value: ananya });
  });

  it('keeps a sub-type that still belongs and otherwise picks the first', () => {
    expect(subTypeFor('wedding', 'intimate')).toBe('intimate');
    expect(subTypeFor('birthday', 'intimate')).toBe('kids');
  });

  it('omits an empty title and trims a given one', () => {
    const result = parseDraft(valid({ title: '   ' }), fixedToday);
    expect(result.ok && result.value.title).toBeUndefined();
  });
});

describe('validation messages', () => {
  it('explains every required field that is missing or out of range', () => {
    const errors = errorsOf(valid({ guestCount: '', budget: '', city: ' ' }));
    expect(errors.guestCount).toBe('Enter a guest count from 1 to 5,000');
    expect(errors.budget).toBe('Enter a budget above zero');
    expect(errors.city).toBe('Enter a city (up to 60 characters)');
    expect(errorsOf(valid({ guestCount: '5001' })).guestCount).toMatch(/1 to 5,000/);
  });

  it('checks dates against today and the three-year ceiling', () => {
    expect(errorsOf(valid({ date: '2026-10-20' })).date).toMatch(/three years/);
    expect(errorsOf(valid({ date: '2031-01-01' })).date).toMatch(/three years/);
    expect(errorsOf(valid({ date: '2027-02-30' })).date).toMatch(/three years/);
    expect(errorsOf(valid({ date: '' })).date).toBeDefined();
  });

  it('flags text that is too long and a mismatched sub-type', () => {
    const errors = errorsOf(
      valid({
        title: 'x'.repeat(81),
        traditions: 'x'.repeat(201),
        mustHaves: 'x'.repeat(301),
        subType: 'kids',
      }),
    );
    expect(errors.title).toMatch(/80/);
    expect(errors.traditions).toMatch(/200/);
    expect(errors.mustHaves).toMatch(/300/);
    expect(errors.subType).toMatch(/sub-type/);
  });

  it('falls back to the schema message for fields without a custom one', () => {
    expect(
      errorsOf(valid({ vibe: ['classic', 'playful', 'rustic', 'elegant'] })).vibe,
    ).toBeDefined();
  });

  it('safely skips unknown or empty issue paths in errorsFrom', () => {
    expect(
      errorsFrom([
        { path: [], message: 'root error' },
        { path: ['nonExistentField'], message: 'field error' },
      ]),
    ).toEqual({});
  });
});
