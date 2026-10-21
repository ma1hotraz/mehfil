import { stableHash } from './hash.js';
import type { Plan } from './schema/plan.js';

const MAX_OCTETS = 75;

/** RFC 5545 §3.3.11 text escaping: backslash, semicolon, comma and newlines. */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Folds a content line at 75 octets, never splitting a UTF-8 character (RFC 5545 §3.1). */
export function foldLine(line: string): string[] {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const width = encoder.encode(char).length;
    const limit = lines.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (size + width > limit) {
      lines.push(lines.length === 0 ? current : ` ${current}`);
      current = '';
      size = 0;
    }
    current += char;
    size += width;
  }
  lines.push(lines.length === 0 ? current : ` ${current}`);
  return lines;
}

const compact = (date: string): string => date.replaceAll('-', '');

/**
 * Exports the incomplete timetable milestones as all-day events.
 * @example toICS(plan).startsWith('BEGIN:VCALENDAR') // true
 */
export function toICS(plan: Plan): string {
  const stamp = `${compact(plan.updatedAt.slice(0, 10))}T000000Z`;
  const events = plan.timeline
    .filter((milestone) => !milestone.done)
    .flatMap((milestone) => [
      'BEGIN:VEVENT',
      `UID:${stableHash(`${plan.id}|${milestone.id}`)}-${milestone.id}@mehfil`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(milestone.dueDate)}`,
      `SUMMARY:${escapeIcsText(milestone.title)}`,
      `DESCRIPTION:${escapeIcsText(milestone.detail)}`,
      'END:VEVENT',
    ]);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mehfil//Planning Almanac//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcsText(plan.brief.title ?? 'Mehfil plan')}`,
    ...events,
    'END:VCALENDAR',
  ];
  return `${lines.flatMap(foldLine).join('\r\n')}\r\n`;
}
