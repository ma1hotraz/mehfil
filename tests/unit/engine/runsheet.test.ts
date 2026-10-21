import { describe, expect, it } from 'vitest';

import { buildRunSheet, slotTime } from '../../../src/shared/engine/runsheet.js';
import { minimalBrief } from '../../fixtures/briefs.js';

const sheet = (overrides: Record<string, unknown> = {}) => buildRunSheet(minimalBrief(overrides));
const at = (rows: ReturnType<typeof sheet>, id: string) => rows.find((r) => r.id === id);

describe('run sheet', () => {
  it.each([
    [{ eventType: 'wedding', subType: 'traditional' }, '18:00'],
    [{ eventType: 'birthday', subType: 'kids' }, '16:00'],
    [{ eventType: 'birthday', subType: 'teen' }, '17:00'],
    [{ eventType: 'birthday', subType: 'adult' }, '20:00'],
    [{ eventType: 'birthday', subType: 'milestone' }, '20:00'],
    [{ eventType: 'community', subType: 'festival' }, '16:00'],
    [{ eventType: 'community', subType: 'drive' }, '07:00'],
  ])('guests arrive at the default start for %j', (overrides, start) => {
    const rows = sheet(overrides);
    const arrival = rows.find((r) => /arriv|Gates open|sign in/i.test(r.title) && r.time === start);
    expect(arrival).toBeDefined();
  });

  it('wedding slots run from set-up to pack-down in time order', () => {
    const rows = sheet();
    expect(rows[0]).toMatchObject({ id: 'vendors-arrive', time: '12:00' });
    expect(rows.at(-1)).toMatchObject({ id: 'pack-down', time: '00:00', note: 'The next morning' });
    expect(at(rows, 'ceremony')?.note).toMatch(/muhurat/);
  });

  it('adds weather, access and marshal slots by context', () => {
    expect(at(sheet({ setting: 'indoor' }), 'weather-check')).toBeUndefined();
    expect(at(sheet({ setting: 'outdoor' }), 'weather-check')?.time).toBe('14:00');
    expect(at(sheet({ accessibility: ['step-free'] }), 'access-walkthrough')?.time).toBe('16:00');
    const festival = { eventType: 'community', subType: 'festival' };
    expect(at(sheet({ ...festival, guestCount: 300 }), 'marshals')).toBeUndefined();
    expect(at(sheet({ ...festival, guestCount: 301 }), 'marshals')?.time).toBe('15:30');
  });

  it('keeps every row a valid HH:MM time', () => {
    for (const row of sheet({ setting: 'outdoor', accessibility: ['step-free'] })) {
      expect(row.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    }
  });
});

describe('start time fallback', () => {
  it('defaults to 18:00 for an unknown sub-type', () => {
    const odd = { ...minimalBrief(), subType: 'unknown' };
    expect(buildRunSheet(odd).find((r) => r.id === 'guest-arrival')?.time).toBe('18:00');
  });
});

describe('slotTime', () => {
  it('formats times within the day without a label', () => {
    expect(slotTime(7 * 60 - 300)).toEqual({ time: '02:00' });
  });

  it('wraps before and after midnight with a label and never goes negative', () => {
    expect(slotTime(-60)).toEqual({ time: '23:00', dayLabel: 'The night before' });
    expect(slotTime(25 * 60 + 30)).toEqual({ time: '01:30', dayLabel: 'The next morning' });
  });
});
