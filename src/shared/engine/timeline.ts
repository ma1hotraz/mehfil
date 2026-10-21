import type { EventBrief } from '../schema/brief.js';
import type { Insight, Milestone, Phase } from '../schema/plan.js';

import { type MilestoneTemplate, applicableMilestones } from './data/milestones.js';
import { addDays } from './dates.js';

/** Phase heading shown in the Timetable, keyed by phase id. */
export const PHASE_LABELS: Record<Phase, string> = {
  'six-months': 'Six months out',
  'three-to-six': 'Three to six months',
  'one-to-three': 'One to three months',
  'final-month': 'The final month',
  'final-week': 'Final week',
  day: 'The day',
  afterwards: 'Afterwards',
};

/** Maximum number of individual R20 warnings before they are summarised. */
const MAX_RUSH_WARNINGS = 3;

export function phaseFor(effectiveOffset: number): Phase {
  if (effectiveOffset < 0) {
    return 'afterwards';
  }
  if (effectiveOffset === 0) {
    return 'day';
  }
  if (effectiveOffset <= 7) {
    return 'final-week';
  }
  if (effectiveOffset < 30) {
    return 'final-month';
  }
  if (effectiveOffset < 90) {
    return 'one-to-three';
  }
  return effectiveOffset < 180 ? 'three-to-six' : 'six-months';
}

/** Longest ideal lead time among the milestones that apply to the brief. */
export function maxOffsetFor(brief: EventBrief): number {
  return Math.max(0, ...applicableMilestones(brief).map((template) => template.offset));
}

/**
 * Compresses an ideal offset into the time available (docs/04 §6).
 * @example scheduleOffset(90, 45, 300) // { effective: 14, rushed: true }
 */
export function scheduleOffset(
  offset: number,
  leadDays: number,
  maxOffset: number,
): { effective: number; rushed: boolean } {
  if (offset <= 0 || leadDays >= maxOffset) {
    return { effective: offset, rushed: false };
  }
  return { effective: Math.round((offset * leadDays) / maxOffset), rushed: offset > leadDays };
}

/** Due date for an effective offset: before the event for positives, after it for negatives. */
export const dueDateFor = (eventDate: string, effectiveOffset: number): string =>
  addDays(eventDate, -effectiveOffset);

function toMilestone(
  template: MilestoneTemplate,
  eventDate: string,
  leadDays: number,
  maxOffset: number,
): Milestone {
  const { effective, rushed } = scheduleOffset(template.offset, leadDays, maxOffset);
  return {
    id: template.id,
    title: template.title,
    detail: template.detail,
    category: template.category,
    phase: phaseFor(effective),
    idealOffsetDays: template.offset,
    dueDate: dueDateFor(eventDate, effective),
    rushed,
    critical: template.critical,
    done: false,
  };
}

function rushInsights(milestones: readonly Milestone[], leadDays: number): Insight[] {
  const rushed = milestones.filter((m) => m.critical && m.rushed);
  const insights = rushed.slice(0, MAX_RUSH_WARNINGS).map((m): Insight => ({
    id: `r20-${m.id}`,
    ruleId: 'R20',
    severity: 'warning',
    title: `Rushed: ${m.title}`,
    detail: `Usually done ~${m.idealOffsetDays} days ahead; you have ${leadDays}. Do it this week.`,
  }));
  if (rushed.length > MAX_RUSH_WARNINGS) {
    insights.push({
      id: 'r20-more',
      ruleId: 'R20',
      severity: 'advice',
      title: 'More rushed tasks',
      detail: `+${rushed.length - MAX_RUSH_WARNINGS} more rushed tasks. Start with the critical ones in the Timetable.`,
    });
  }
  return insights;
}

/**
 * Builds the countdown timetable, compressing ideal lead times when the event is close.
 * Sorted by due date, critical first, then template order.
 */
export function buildTimeline(
  brief: EventBrief,
  leadDays: number,
): { milestones: Milestone[]; insights: Insight[] } {
  const templates = applicableMilestones(brief);
  const maxOffset = Math.max(0, ...templates.map((template) => template.offset));
  const milestones = templates
    .map((template, order) => ({
      order,
      item: toMilestone(template, brief.date, leadDays, maxOffset),
    }))
    .sort(
      (a, b) =>
        a.item.dueDate.localeCompare(b.item.dueDate) ||
        Number(b.item.critical) - Number(a.item.critical) ||
        a.order - b.order,
    )
    .map(({ item }) => item);
  return { milestones, insights: rushInsights(milestones, leadDays) };
}
