import { at } from '../util.js';
import { stableHash } from '../hash.js';
import type { SuggestedAction } from '../schema/ai.js';
import type { CategoryId, LedgerLine, Milestone, Plan } from '../schema/plan.js';
import { sanitizeText } from '../text.js';

import { CATEGORY_LABELS, CATEGORY_NOTES } from './data/allocations.js';
import { THRESHOLDS } from './data/rules.js';
import { diffDays } from './dates.js';
import { amountsFromPercents, formatMoney, toMinor } from './money.js';
import { CATEGORY_IDS } from '../schema/plan.js';
import { dueDateFor, phaseFor, scheduleOffset } from './timeline.js';

export type ActionResult = { plan: Plan; notice: string } | { error: string };

/** Lines the Planner may create when they are absent (docs/04 §10). */
const CREATABLE: readonly CategoryId[] = ['contingency', 'accessibility', 'weatherCover'];

const tenth = (value: number): number => Math.round(value * 10) / 10;

function insertLine(ledger: readonly LedgerLine[], id: CategoryId): LedgerLine[] {
  const line: LedgerLine = {
    id,
    label: CATEGORY_LABELS[id],
    percent: 0,
    amountMinor: 0,
    recommendedPercent: 0,
    note: CATEGORY_NOTES[id],
  };
  return [...ledger, line].sort((a, b) => CATEGORY_IDS.indexOf(a.id) - CATEGORY_IDS.indexOf(b.id));
}

type ShiftAction = Extract<SuggestedAction, { type: 'shiftBudget' }>;

/** How many points may move, or an error message when the request cannot be honoured. */
function shiftPoints(plan: Plan, action: ShiftAction): number | string {
  const { from, to } = action;
  const source = plan.ledger.find((line) => line.id === from);
  if (from === to) {
    return 'Choose two different budget lines.';
  }
  if (!source) {
    return `${CATEGORY_LABELS[from]} is not in this budget.`;
  }
  if (!plan.ledger.some((line) => line.id === to) && !CREATABLE.includes(to)) {
    return `${CATEGORY_LABELS[to]} is not in this budget.`;
  }
  const floor = from === 'contingency' ? THRESHOLDS.contingencyFloor : 0;
  const movable = Math.floor((source.percent - floor) * 10) / 10;
  const points = Math.min(tenth(action.percent), movable);
  return points > 0 ? points : `${CATEGORY_LABELS[from]} has nothing left to move.`;
}

function shiftBudget(plan: Plan, action: ShiftAction): ActionResult {
  const points = shiftPoints(plan, action);
  if (typeof points === 'string') {
    return { error: points };
  }
  const { from, to } = action;
  const ledger = plan.ledger.some((line) => line.id === to)
    ? plan.ledger
    : insertLine(plan.ledger, to);
  const percents = ledger.map((line) => {
    if (line.id === from) {
      return tenth(line.percent - points);
    }
    return line.id === to ? tenth(line.percent + points) : line.percent;
  });
  const totalMinor = toMinor(plan.brief.budget);
  const amounts = amountsFromPercents(percents, totalMinor);
  const moved = formatMoney(Math.round((points * totalMinor) / 100), plan.brief.currency);
  return {
    plan: {
      ...plan,
      ledger: ledger.map((line, index) => ({
        ...line,
        percent: at(percents, index),
        amountMinor: at(amounts, index),
      })),
    },
    notice: `Moved ${points}% (${moved}) from ${CATEGORY_LABELS[from]} to ${CATEGORY_LABELS[to]}.`,
  };
}

function addTask(
  plan: Plan,
  action: Extract<SuggestedAction, { type: 'addTask' }>,
  today: string,
): ActionResult {
  const title = sanitizeText(action.title, 80);
  if (title === '') {
    return { error: 'The task needs a title.' };
  }
  const leadDays = Math.max(0, diffDays(today, plan.brief.date));
  const days = Math.min(action.daysBeforeEvent, leadDays);
  const id = `custom-${stableHash(`${title}|${action.daysBeforeEvent}`)}`;
  if (plan.timeline.some((milestone) => milestone.id === id)) {
    return { plan, notice: `“${title}” is already on your list.` };
  }
  const { effective } = scheduleOffset(days, leadDays, Math.max(days, leadDays));
  const milestone: Milestone = {
    id,
    title,
    detail: sanitizeText(action.rationale, 300) || 'Added from the Planner.',
    category: action.category,
    phase: phaseFor(effective),
    idealOffsetDays: action.daysBeforeEvent,
    dueDate: dueDateFor(plan.brief.date, effective),
    rushed: action.daysBeforeEvent > leadDays,
    critical: false,
    done: false,
  };
  const timeline = [...plan.timeline, milestone].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { plan: { ...plan, timeline }, notice: `Added “${title}” to the Timetable.` };
}

function markVendor(
  plan: Plan,
  action: Extract<SuggestedAction, { type: 'markVendor' }>,
): ActionResult {
  const vendor = plan.vendors.find((item) => item.id === action.vendorId);
  if (!vendor) {
    return { error: 'That vendor is not on your checklist.' };
  }
  const vendors = plan.vendors.map((item) =>
    item === vendor ? { ...item, status: action.status } : item,
  );
  return {
    plan: { ...plan, vendors },
    notice: `${vendor.label} marked ${action.status.replace('-', ' ')}.`,
  };
}

/**
 * Applies one Planner-suggested action through the same validation the UI uses. Never throws
 * and never mutates `plan`.
 * @example applyAction(plan, { type: 'markVendor', vendorId: 'caterer', status: 'booked', rationale: '' }, today)
 */
export function applyAction(plan: Plan, action: SuggestedAction, today: string): ActionResult {
  switch (action.type) {
    case 'shiftBudget':
      return shiftBudget(plan, action);
    case 'addTask':
      return addTask(plan, action, today);
    case 'markVendor':
      return markVendor(plan, action);
  }
}
