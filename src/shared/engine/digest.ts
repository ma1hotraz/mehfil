import type { PlanDigest } from '../schema/ai.js';
import type { Plan } from '../schema/plan.js';

import { diffDays } from './dates.js';

const OPEN_TASKS_SHOWN = 8;

/**
 * Compact, privacy-minimal view of a plan for the assistant: ledger shares, the next open
 * milestones, vendor statuses and the verdict. No contact details or notes.
 */
export function buildDigest(plan: Plan, today: string): PlanDigest {
  return {
    ledger: plan.ledger.map(({ id, percent, amountMinor }) => ({ id, percent, amountMinor })),
    openMilestones: plan.timeline
      .filter((m) => !m.done && m.idealOffsetDays >= 0)
      .slice(0, OPEN_TASKS_SHOWN)
      .map(({ title, dueDate, critical }) => ({ title, dueDate, critical })),
    vendors: plan.vendors.map(({ id, label, status, bookByDate }) => ({
      id,
      label,
      status,
      bookByDate,
    })),
    feasibility: {
      verdict: plan.feasibility.verdict,
      perGuestMinor: plan.feasibility.perGuestMinor,
      benchmarkMinor: plan.feasibility.benchmarkMinor,
    },
    leadDays: Math.min(1200, Math.max(0, diffDays(today, plan.brief.date))),
  };
}
