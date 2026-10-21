import type { EventBrief } from '../schema/brief.js';
import type { Insight } from '../schema/plan.js';

import { CATEGORY_LABELS, type Allocation } from './data/allocations.js';
import {
  REGION_BY_CURRENCY,
  REGION_NAMES,
  RISK_MONTHS,
  RUSH_DAYS,
  SHARES,
  THRESHOLDS,
  type SeasonRisk,
} from './data/rules.js';
import { monthIndex, monthName } from './dates.js';
import { amountOf, moveShare } from './moveShare.js';

export interface RuleContext {
  brief: EventBrief;
  leadDays: number;
}
export interface RuleOutcome {
  alloc: Allocation;
  insight: Insight;
}
export type Rule = (ctx: RuleContext, alloc: Allocation) => RuleOutcome | undefined;

export const insight = (
  ruleId: string,
  severity: Insight['severity'],
  title: string,
  detail: string,
): Insight => ({ id: ruleId.toLowerCase(), ruleId, severity, title, detail });

export const weatherRule =
  (ruleId: string, setting: EventBrief['setting'], points: number, detail: string): Rule =>
  ({ brief }, alloc) =>
    brief.setting === setting
      ? {
          alloc: moveShare(alloc, 'weatherCover', points, ['decor', 'venue']),
          insight: insight(ruleId, 'info', 'Weather cover set aside', detail),
        }
      : undefined;

const SEASON_LABEL: Record<SeasonRisk, string> = {
  monsoon: 'monsoon',
  'peak-heat': 'peak heat',
  cold: 'cold',
};

/** R03: outdoor or mixed events in a risky season get extra weather money. */
export const seasonRule: Rule = ({ brief }, alloc) => {
  if (brief.setting === 'indoor') {
    return undefined;
  }
  const region = REGION_BY_CURRENCY[brief.currency];
  const risk = RISK_MONTHS[region][monthIndex(brief.date)];
  if (!risk) {
    return undefined;
  }
  const month = monthName(brief.date);
  return {
    alloc: moveShare(alloc, 'weatherCover', SHARES.weatherSeason, ['decor', 'entertainment']),
    insight: insight(
      'R03',
      'warning',
      `${month} is ${SEASON_LABEL[risk]} season`,
      `${month} in ${REGION_NAMES[region]} is ${SEASON_LABEL[risk]} season. Book a covered backup space.`,
    ),
  };
};

/** R04: guests' access needs get their own budget line. */
export const accessibilityRule: Rule = ({ brief }, alloc) => {
  const needs = brief.accessibility;
  if (needs.length === 0) {
    return undefined;
  }
  const points =
    SHARES.accessibilityBase +
    (needs.length >= THRESHOLDS.accessibilityManyNeeds ? SHARES.accessibilityExtra : 0);
  return {
    alloc: moveShare(alloc, 'accessibility', points, ['decor', 'entertainment']),
    insight: insight(
      'R04',
      'advice',
      'Access needs have their own line',
      `You listed ${needs.join(', ')}. ${points}% covers ramps, an interpreter, signage and a quiet room as needed.`,
    ),
  };
};

/** R05: big weddings and birthdays need money for crowd flow. */
export const crowdRule: Rule = ({ brief }, alloc) => {
  if (brief.eventType === 'community' || brief.guestCount <= THRESHOLDS.largeCrowd) {
    return undefined;
  }
  const target = brief.eventType === 'wedding' ? 'transport' : 'logistics';
  return {
    alloc: moveShare(alloc, target, SHARES.crowdFlow, ['decor']),
    insight: insight(
      'R05',
      'advice',
      'Plan the flow of a large crowd',
      `With ${brief.guestCount} guests, plan parking, signage and staggered food service. ${SHARES.crowdFlow}% added to ${CATEGORY_LABELS[target]}.`,
    ),
  };
};

/** R06: large community events need a real safety plan. */
export const safetyRule: Rule = ({ brief }, alloc) => {
  if (brief.eventType !== 'community' || brief.guestCount <= THRESHOLDS.safetyCrowd) {
    return undefined;
  }
  const missing = Math.max(0, SHARES.safetyMinimum - amountOf(alloc, 'safety'));
  return {
    alloc:
      missing > 0
        ? moveShare(alloc, 'safety', missing, ['entertainment', 'decor', 'supplies'])
        : alloc,
    insight: insight(
      'R06',
      'warning',
      'Over 300 attendees: safety plan needed',
      'Over 300 attendees: plan marshals, a first-aid post and two exits.',
    ),
  };
};

/** R07: short notice means rush fees. */
export const rushRule: Rule = ({ brief, leadDays }, alloc) =>
  leadDays < RUSH_DAYS[brief.eventType]
    ? {
        alloc: moveShare(alloc, 'contingency', SHARES.rushContingency, ['decor', 'entertainment']),
        insight: insight(
          'R07',
          'warning',
          'Short notice',
          `Short notice: expect rush fees; ${SHARES.rushContingency}% added to contingency.`,
        ),
      }
    : undefined;

export const RULES: readonly Rule[] = [
  weatherRule(
    'R01',
    'outdoor',
    SHARES.weatherOutdoor,
    'Outdoor events need a rain/heat plan — 5% set aside for canopy, fans or heaters.',
  ),
  weatherRule(
    'R02',
    'mixed',
    SHARES.weatherMixed,
    'Part-outdoor events need a rain/heat plan — 3% set aside for canopy, fans or heaters.',
  ),
  seasonRule,
  accessibilityRule,
  crowdRule,
  safetyRule,
  rushRule,
];
