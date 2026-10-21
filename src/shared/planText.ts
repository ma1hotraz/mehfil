import { formatLongDate } from './engine/dates.js';
import { formatMoney } from './engine/money.js';
import { eventLine, planTitle } from './labels.js';
import type { Plan } from './schema/plan.js';

const STATUS_WORDS = {
  'to-find': 'to find',
  enquired: 'enquired',
  booked: 'booked',
  paid: 'paid',
} as const;

/**
 * Plain-text summary of a plan for the clipboard: ledger, open tasks, vendors and run sheet.
 * @example planToText(plan).split('\n')[0] // 'Ananya & Kabir'
 */
export function planToText(plan: Plan): string {
  const { brief } = plan;
  const money = (minor: number): string => formatMoney(minor, brief.currency);
  const lines = [
    planTitle(brief),
    eventLine(brief),
    `Verdict: ${plan.feasibility.verdict}. ${plan.feasibility.reason}`,
    '',
    'LEDGER',
    ...plan.ledger.map((l) => `${l.label}: ${l.percent.toFixed(1)}% (${money(l.amountMinor)})`),
    '',
    'TIMETABLE (open tasks)',
    ...plan.timeline
      .filter((m) => !m.done)
      .map((m) => `${formatLongDate(m.dueDate)}: ${m.title}${m.rushed ? ' [rushed]' : ''}`),
    '',
    'VENDORS',
    ...plan.vendors.map(
      (v) => `${v.label}: ${STATUS_WORDS[v.status]}, book by ${formatLongDate(v.bookByDate)}`,
    ),
    '',
    'RUN SHEET',
    ...plan.runSheet.map((r) => `${r.time} ${r.title} (${r.owner})`),
  ];
  return lines.join('\n');
}
