import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { buildPlan } from '../../src/shared/engine/index.js';
import { escapeIcsText, foldLine, toICS } from '../../src/shared/ics.js';
import { ananya, fixedToday, minimalBrief } from '../fixtures/briefs.js';

describe('toICS', () => {
  const plan = buildPlan(ananya, fixedToday);
  const ics = toICS(plan);

  it('has the calendar structure with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('writes one all-day event per open milestone', () => {
    const open = plan.timeline.filter((m) => !m.done);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(open.length);
    expect(ics).toContain(`DTSTART;VALUE=DATE:${open[0]?.dueDate.replaceAll('-', '')}`);
  });

  it('skips completed milestones and keeps UIDs stable and unique', () => {
    const done = { ...plan, timeline: plan.timeline.map((m, i) => ({ ...m, done: i === 0 })) };
    expect(toICS(done).match(/BEGIN:VEVENT/g)).toHaveLength(plan.timeline.length - 1);
    const uids = ics.match(/^UID:.*$/gm) ?? [];
    expect(new Set(uids).size).toBe(uids.length);
    expect(toICS(plan)).toBe(ics);
  });

  it('falls back to a default calendar name', () => {
    expect(toICS(buildPlan(minimalBrief(), fixedToday))).toContain('X-WR-CALNAME:Mehfil plan');
  });
});

describe('escapeIcsText', () => {
  it('escapes backslash, semicolon, comma and newlines', () => {
    expect(escapeIcsText('a\\b;c,d\ne\r\nf')).toBe('a\\\\b\\;c\\,d\\ne\\nf');
  });
});

describe('foldLine', () => {
  it('leaves short lines alone and folds long ones with a leading space', () => {
    expect(foldLine('short')).toEqual(['short']);
    const folded = foldLine(`SUMMARY:${'x'.repeat(200)}`);
    expect(folded.length).toBeGreaterThan(2);
    expect(folded.slice(1).every((l) => l.startsWith(' '))).toBe(true);
  });

  it('keeps every line within 75 octets and never splits a character', () => {
    const encoder = new TextEncoder();
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', maxLength: 300 }), (text) => {
        const folded = foldLine(`SUMMARY:${text}`);
        expect(folded.every((l) => encoder.encode(l).length <= 75)).toBe(true);
        expect(folded.map((l, i) => (i === 0 ? l : l.slice(1))).join('')).toBe(`SUMMARY:${text}`);
      }),
      { numRuns: 300 },
    );
  });
});
