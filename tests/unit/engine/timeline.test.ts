import { describe, expect, it } from 'vitest';

import { addDays } from '../../../src/shared/engine/dates.js';
import {
  buildTimeline,
  maxOffsetFor,
  phaseFor,
  scheduleOffset,
} from '../../../src/shared/engine/timeline.js';
import { EventBrief } from '../../../src/shared/schema/brief.js';
import { fixedToday, minimalBrief } from '../../fixtures/briefs.js';

const brief = (overrides: Record<string, unknown> = {}, lead = 400): EventBrief =>
  minimalBrief({ date: addDays(fixedToday, lead), ...overrides });
const ids = (b: EventBrief, lead: number) => buildTimeline(b, lead).milestones.map((m) => m.id);

describe('scheduleOffset', () => {
  it('leaves offsets alone when there is enough time', () => {
    expect(scheduleOffset(90, 300, 300)).toEqual({ effective: 90, rushed: false });
    expect(scheduleOffset(-7, 10, 300)).toEqual({ effective: -7, rushed: false });
    expect(scheduleOffset(0, 10, 300)).toEqual({ effective: 0, rushed: false });
  });

  it('compresses proportionally and flags offsets longer than the lead', () => {
    expect(scheduleOffset(90, 45, 300)).toEqual({ effective: 14, rushed: true });
    expect(scheduleOffset(30, 45, 300)).toEqual({ effective: 5, rushed: false });
  });
});

describe('phaseFor', () => {
  it.each([
    [300, 'six-months'],
    [180, 'six-months'],
    [179, 'three-to-six'],
    [90, 'three-to-six'],
    [89, 'one-to-three'],
    [30, 'one-to-three'],
    [29, 'final-month'],
    [8, 'final-month'],
    [7, 'final-week'],
    [1, 'final-week'],
    [0, 'day'],
    [-1, 'afterwards'],
  ] as const)('effective offset %i is %s', (offset, phase) => {
    expect(phaseFor(offset)).toBe(phase);
  });
});

describe('buildTimeline scheduling', () => {
  it('uses date − offset and rushes nothing when lead ≥ the longest offset', () => {
    const b = brief({}, 400);
    const { milestones } = buildTimeline(b, 400);
    const venue = milestones.find((m) => m.id === 'book-venue');
    expect(venue?.dueDate).toBe(addDays(b.date, -270));
    expect(milestones.some((m) => m.rushed)).toBe(false);
    expect(maxOffsetFor(b)).toBe(300);
  });

  it('compresses a 45-day lead, flags exactly offsets > 45 and keeps order', () => {
    const b = brief({}, 45);
    const { milestones } = buildTimeline(b, 45);
    milestones.forEach((m) => {
      expect(m.rushed).toBe(m.idealOffsetDays > 45);
    });
    const byIdeal = [...milestones].sort((x, y) => y.idealOffsetDays - x.idealOffsetDays);
    for (let i = 1; i < byIdeal.length; i += 1) {
      expect((byIdeal[i]?.dueDate ?? '') >= (byIdeal[i - 1]?.dueDate ?? '')).toBe(true);
    }
    milestones.forEach((m) => {
      expect(m.dueDate >= fixedToday).toBe(true);
    });
  });

  it('puts every before-task on the event day when the event is today', () => {
    const b = minimalBrief({ date: fixedToday });
    const { milestones } = buildTimeline(b, 0);
    const before = milestones.filter((m) => m.idealOffsetDays > 0);
    expect(before.every((m) => m.dueDate === fixedToday && m.rushed)).toBe(true);
    expect(milestones.find((m) => m.id === 'event-day')?.dueDate).toBe(fixedToday);
    expect(milestones.find((m) => m.id === 'thank-you-notes')?.dueDate).toBe(
      addDays(fixedToday, 14),
    );
  });

  it('sorts by due date, then critical first', () => {
    const { milestones } = buildTimeline(brief({}, 20), 20);
    for (let i = 1; i < milestones.length; i += 1) {
      const [prev, cur] = [milestones[i - 1], milestones[i]];
      expect((cur?.dueDate ?? '') >= (prev?.dueDate ?? '')).toBe(true);
      if (prev?.dueDate === cur?.dueDate && prev && cur && !prev.critical) {
        expect(cur.critical).toBe(false);
      }
    }
  });

  it('assigns phases by effective offset', () => {
    const { milestones } = buildTimeline(brief({}, 400), 400);
    expect(milestones.find((m) => m.id === 'book-venue')?.phase).toBe('six-months');
    expect(milestones.find((m) => m.id === 'send-invitations')?.phase).toBe('one-to-three');
    expect(milestones.find((m) => m.id === 'event-day')?.phase).toBe('day');
    expect(milestones.find((m) => m.id === 'thank-you-notes')?.phase).toBe('afterwards');
  });
});

describe('conditional milestones', () => {
  it('adds type and sub-type specific tasks', () => {
    expect(ids(brief({ subType: 'destination' }), 400)).toEqual(
      expect.arrayContaining(['hold-rooms', 'travel-pack']),
    );
    expect(ids(brief({ subType: 'traditional' }), 400)).toEqual(
      expect.arrayContaining(['book-officiant', 'book-mehendi']),
    );
    expect(ids(brief({ subType: 'court-and-reception' }), 400)).not.toContain('book-decor');
    expect(ids(brief({ eventType: 'birthday', subType: 'kids', guestCount: 20 }), 100)).toEqual(
      expect.arrayContaining(['allergy-info', 'supervisors']),
    );
    expect(ids(brief({ eventType: 'birthday', subType: 'milestone' }), 100)).toContain('slideshow');
    expect(ids(brief({ eventType: 'community', subType: 'drive' }), 100)).toContain(
      'procure-supplies',
    );
    expect(ids(brief({ eventType: 'community', subType: 'drive' }), 100)).not.toContain(
      'book-performers',
    );
    expect(ids(brief({ eventType: 'community', subType: 'fundraiser' }), 100)).toContain(
      'line-up-sponsors',
    );
  });

  it('skips the venue task for small birthdays', () => {
    expect(
      ids(brief({ eventType: 'birthday', subType: 'adult', guestCount: 15 }), 100),
    ).not.toContain('book-venue');
    expect(ids(brief({ eventType: 'birthday', subType: 'adult', guestCount: 16 }), 100)).toContain(
      'book-venue',
    );
  });

  it('adds cross-cutting tasks from access, setting and diet', () => {
    const plain = ids(brief({}, 400), 400);
    expect(plain).not.toContain('access-walkthrough');
    const rich = ids(
      brief({ accessibility: ['step-free'], setting: 'outdoor', dietary: ['vegan'] }, 400),
      400,
    );
    expect(rich).toEqual(
      expect.arrayContaining(['access-walkthrough', 'backup-cover', 'share-dietary']),
    );
  });
});

describe('R20 rushed critical tasks', () => {
  it('emits at most three warnings plus one summary', () => {
    const { insights } = buildTimeline(brief({}, 10), 10);
    expect(insights.filter((i) => i.severity === 'warning')).toHaveLength(3);
    const summary = insights.find((i) => i.id === 'r20-more');
    expect(summary?.detail).toMatch(/^\+\d+ more rushed tasks/);
    expect(insights.every((i) => i.ruleId === 'R20')).toBe(true);
  });

  it('has no summary when three or fewer are rushed, and none when time is ample', () => {
    const few = buildTimeline(
      brief({ eventType: 'birthday', subType: 'adult', guestCount: 40 }, 25),
      25,
    );
    expect(few.insights.map((i) => i.id)).toEqual(['r20-book-venue']);
    expect(buildTimeline(brief({}, 400), 400).insights).toEqual([]);
  });
});
