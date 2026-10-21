import type { EventBrief } from '../schema/brief.js';
import type { RunSlot } from '../schema/plan.js';

import { modifierSlots, slotTemplatesFor, startMinutesFor } from './data/runsheets.js';

const MINUTES_PER_DAY = 1440;

/**
 * Converts minutes-from-midnight (possibly negative or past 24h) into `HH:MM` plus a label when
 * the time falls on another day.
 * @example slotTime(-60) // { time: '23:00', dayLabel: 'The night before' }
 */
export function slotTime(totalMinutes: number): { time: string; dayLabel?: string } {
  const wrapped = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const time = `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
  if (totalMinutes < 0) {
    return { time, dayLabel: 'The night before' };
  }
  return totalMinutes >= MINUTES_PER_DAY ? { time, dayLabel: 'The next morning' } : { time };
}

/** Builds the day-of schedule, sorted by actual time, with context slots merged in. */
export function buildRunSheet(brief: EventBrief): RunSlot[] {
  const start = startMinutesFor(brief);
  return [...slotTemplatesFor(brief), ...modifierSlots(brief)]
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
    .map((template): RunSlot => {
      const { time, dayLabel } = slotTime(start + template.offsetMinutes);
      const note = [template.note, dayLabel].filter(Boolean).join(' ');
      return {
        id: template.id,
        time,
        title: template.title,
        owner: template.owner,
        ...(note ? { note } : {}),
      };
    });
}
