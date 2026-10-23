import { diffDays } from '../../shared/engine/dates.js';
import { perGuestMinor } from '../../shared/engine/money.js';
import { PHASE_LABELS } from '../../shared/engine/timeline.js';
import { CATEGORY_LABELS } from '../../shared/engine/data/allocations.js';
import {
  PHASES,
  type CategoryId,
  type Idea,
  type Insight,
  type Milestone,
  type Phase,
  type Plan,
  type VendorItem,
} from '../../shared/schema/plan.js';
import { formatLongDate, money, offsetFromEvent, tMinus, tMinusSpoken } from './format';
import { parseAmount } from './draft';

export interface LedgerRowView {
  id: CategoryId;
  label: string;
  percent: number;
  amount: string;
  perGuest: string;
  note: string;
}

export interface CommittedLineView {
  id: CategoryId;
  label: string;
  defaultValue: string;
  remainingFormatted: string;
}

export function toCommittedMinor(rawValue: string): number | undefined {
  const value = parseAmount(rawValue);
  return value === undefined ? undefined : Math.round(value * 100);
}

export interface LedgerViewModel {
  total: number;
  totalFormatted: string;
  rows: LedgerRowView[];
  committedLines: CommittedLineView[];
  weather: Insight[];
}

/** Pure projection for Ledger presentation: isolates arithmetic and formatting from UI rendering. */
export function buildLedgerViewModel(plan: Plan): LedgerViewModel {
  const { brief, ledger } = plan;
  const total = ledger.reduce((sum, line) => sum + line.amountMinor, 0);
  const rows: LedgerRowView[] = ledger.map((line) => ({
    id: line.id,
    label: line.label,
    percent: line.percent,
    amount: money(line.amountMinor, brief.currency),
    perGuest: money(perGuestMinor(line.amountMinor, brief.guestCount), brief.currency),
    note: line.note,
  }));
  const committedLines: CommittedLineView[] = ledger.map((line) => {
    const committed = line.committedMinor ?? 0;
    return {
      id: line.id,
      label: line.label,
      defaultValue: line.committedMinor === undefined ? '' : String(line.committedMinor / 100),
      remainingFormatted: `${money(line.amountMinor - committed, brief.currency)} remaining`,
    };
  });
  const weather = plan.insights.filter((i) => ['R01', 'R02', 'R03'].includes(i.ruleId));
  return {
    total,
    totalFormatted: money(total, brief.currency),
    rows,
    committedLines,
    weather,
  };
}

const MONTH_DAYS = 30;

export interface NextDeadlineView {
  id: string;
  title: string;
  dueDate: string;
  dueDateFormatted: string;
  tMinusText: string;
  critical: boolean;
}

export interface OverviewViewModel {
  openDeadlines: Milestone[];
  dueThisMonth: Milestone[];
  dueThisMonthCount: number;
  dueThisMonthLabel: string;
  perGuestFormatted: string;
  contingencyMinor: number;
  contingencyFormatted: string;
  nextThreeDeadlines: NextDeadlineView[];
}

/** Pure projection for Overview presentation: isolates date filtering, ledger lookup, and metric formatting. */
export function buildOverviewViewModel(plan: Plan, today: string): OverviewViewModel {
  const { brief, feasibility } = plan;
  const openDeadlines = plan.timeline.filter((m) => !m.done && m.idealOffsetDays >= 0);
  const dueThisMonth = openDeadlines.filter((m) => {
    const days = diffDays(today, m.dueDate);
    return days >= 0 && days <= MONTH_DAYS;
  });
  const contingency = plan.ledger.find((l) => l.id === 'contingency');
  const contingencyMinor = contingency?.amountMinor ?? 0;

  const nextThreeDeadlines: NextDeadlineView[] = openDeadlines.slice(0, 3).map((m) => ({
    id: m.id,
    title: m.title,
    dueDate: m.dueDate,
    dueDateFormatted: formatLongDate(m.dueDate),
    tMinusText: tMinus(offsetFromEvent(brief.date, m.dueDate)),
    critical: m.critical,
  }));

  return {
    openDeadlines,
    dueThisMonth,
    dueThisMonthCount: dueThisMonth.length,
    dueThisMonthLabel: dueThisMonth.length === 1 ? 'task' : 'tasks',
    perGuestFormatted: money(feasibility.perGuestMinor, brief.currency),
    contingencyMinor,
    contingencyFormatted: money(contingencyMinor, brief.currency),
    nextThreeDeadlines,
  };
}

export interface TimetableTaskView {
  id: string;
  title: string;
  done: boolean;
  dueDate: string;
  dueDateFormatted: string;
  tMinusText: string;
  spokenDue: string;
  categoryLabel: string;
  critical: boolean;
  rushed: boolean;
  overdue: boolean;
}

export interface TimetablePhaseView {
  phase: Phase;
  label: string;
  tasks: TimetableTaskView[];
}

export interface TimetableViewModel {
  openCount: number;
  totalCount: number;
  phases: TimetablePhaseView[];
}

/** Pure projection for Timetable presentation: categorizes milestones, calculates offsets, and formats deadlines. */
export function buildTimetableViewModel(plan: Plan, today: string): TimetableViewModel {
  const openCount = plan.timeline.filter((m) => !m.done).length;
  const phases: TimetablePhaseView[] = [];

  for (const phase of PHASES) {
    const matching = plan.timeline.filter((m) => m.phase === phase);
    if (matching.length === 0) {
      continue;
    }
    const tasks: TimetableTaskView[] = matching.map((task) => {
      const offset = offsetFromEvent(plan.brief.date, task.dueDate);
      const overdue = !task.done && task.idealOffsetDays >= 0 && task.dueDate < today;
      return {
        id: task.id,
        title: task.title,
        done: task.done,
        dueDate: task.dueDate,
        dueDateFormatted: formatLongDate(task.dueDate),
        tMinusText: tMinus(offset),
        spokenDue: `Due ${formatLongDate(task.dueDate)}, ${tMinusSpoken(offset)}.`,
        categoryLabel: task.category === 'general' ? 'General' : CATEGORY_LABELS[task.category],
        critical: task.critical,
        rushed: task.rushed && !task.done,
        overdue,
      };
    });
    phases.push({
      phase,
      label: PHASE_LABELS[phase],
      tasks,
    });
  }

  return {
    openCount,
    totalCount: plan.timeline.length,
    phases,
  };
}

/** Pure filter for vendors by active status. */
export function filterVendors(vendors: readonly VendorItem[], filter: string): VendorItem[] {
  return vendors.filter((v) => filter === 'all' || v.status === filter);
}

/** Pure filter for ideas by category or saved status. */
export function filterIdeas(ideas: readonly Idea[], filter: string): Idea[] {
  return ideas.filter((i) =>
    filter === 'all' ? true : filter === 'kept' ? i.saved : i.category === filter,
  );
}
