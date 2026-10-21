import type { EventBrief } from '../schema/brief.js';
import type { Feasibility, Insight, Verdict } from '../schema/plan.js';

import { allocationKey } from './data/allocations.js';
import { LEAN_TIPS, RATIO, UPGRADE_TIPS, benchmarkPerGuest } from './data/benchmarks.js';
import { formatMoney, perGuestMinor, toMinor } from './money.js';

const REASONS: Record<Verdict, string> = {
  comfortable: 'Room for upgrades.',
  workable: 'Workable with care.',
  tight: 'Possible, but only with a lean plan.',
  unrealistic: 'Well below a workable level for this event.',
};

export function verdictFor(ratio: number): Verdict {
  if (ratio >= RATIO.comfortable) {
    return 'comfortable';
  }
  if (ratio >= RATIO.workable) {
    return 'workable';
  }
  return ratio >= RATIO.tight ? 'tight' : 'unrealistic';
}

/**
 * Compares the per-guest budget with an indicative benchmark for the event.
 * @example feasibility(brief).verdict // 'workable'
 */
export function feasibility(brief: EventBrief): Feasibility {
  const key = allocationKey(brief.eventType, brief.subType);
  const benchmarkMinor = toMinor(benchmarkPerGuest(brief.currency, key));
  const perGuest = perGuestMinor(toMinor(brief.budget), brief.guestCount);
  const ratio = benchmarkMinor > 0 ? perGuest / benchmarkMinor : Number.POSITIVE_INFINITY;
  const verdict = verdictFor(ratio);
  return {
    verdict,
    perGuestMinor: perGuest,
    benchmarkMinor,
    ratio: Number.isFinite(ratio) ? ratio : 99,
    reason: `${formatMoney(perGuest, brief.currency)} per guest against an indicative ${formatMoney(benchmarkMinor, brief.currency)}. ${REASONS[verdict]}`,
  };
}

const make = (
  ruleId: string,
  severity: Insight['severity'],
  title: string,
  detail: string,
): Insight => ({ id: ruleId.toLowerCase(), ruleId, severity, title, detail });

/** R10–R12: what to do when the budget is tight, unrealistic or generous. */
export function feasibilityInsights(brief: EventBrief, result: Feasibility): Insight[] {
  const insights: Insight[] = [];
  if (result.verdict === 'tight' || result.verdict === 'unrealistic') {
    insights.push(
      make(
        'R10',
        'advice',
        'Lean mode: ways to stretch the budget',
        `To keep this affordable: ${LEAN_TIPS[brief.eventType].join('; ')}.`,
      ),
    );
  }
  if (result.verdict === 'unrealistic') {
    const totalMinor = toMinor(brief.budget);
    const neededMinor = result.benchmarkMinor * brief.guestCount;
    const guests = Math.max(1, Math.floor(totalMinor / result.benchmarkMinor));
    insights.push(
      make(
        'R11',
        'critical',
        'Budget and guest list do not match',
        `To reach a workable plan, either raise the budget to ${formatMoney(neededMinor, brief.currency)} or trim the list to about ${guests} ${guests === 1 ? 'guest' : 'guests'}.`,
      ),
    );
  }
  if (result.ratio >= RATIO.upgrade) {
    insights.push(
      make(
        'R12',
        'info',
        'Room to upgrade',
        `Your budget is well above the benchmark. ${UPGRADE_TIPS[brief.eventType]}`,
      ),
    );
  }
  return insights;
}
