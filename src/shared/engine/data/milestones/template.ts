import type { EventBrief } from '../../../schema/brief.js';
import type { Milestone } from '../../../schema/plan.js';

export interface MilestoneTemplate {
  id: string;
  title: string;
  detail: string;
  category: Milestone['category'];
  /** Days before the event; 0 = the day, negative = after. */
  offset: number;
  critical: boolean;
  when?: (brief: EventBrief) => boolean;
}

/** Compact constructor for milestone tables. */
export const t = (
  id: string,
  title: string,
  offset: number,
  category: Milestone['category'],
  detail: string,
  critical = false,
  when?: MilestoneTemplate['when'],
): MilestoneTemplate => ({
  id,
  title,
  detail,
  category,
  offset,
  critical,
  ...(when ? { when } : {}),
});
