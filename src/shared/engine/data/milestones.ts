import type { EventBrief } from '../../schema/brief.js';

import { BIRTHDAY, BIRTHDAY_ADDS } from './milestones/birthday.js';
import { COMMUNITY } from './milestones/community.js';
import { CROSS_CUTTING } from './milestones/crossCutting.js';
import type { MilestoneTemplate } from './milestones/template.js';
import { WEDDING, WEDDING_ADDS } from './milestones/wedding.js';

export type { MilestoneTemplate } from './milestones/template.js';

const BY_TYPE: Record<
  EventBrief['eventType'],
  { base: MilestoneTemplate[]; adds: MilestoneTemplate[] }
> = {
  wedding: { base: WEDDING, adds: WEDDING_ADDS },
  birthday: { base: BIRTHDAY, adds: BIRTHDAY_ADDS },
  community: { base: COMMUNITY, adds: [] },
};

/** All milestone templates that apply to the brief, ordered by ideal offset (furthest first). */
export function applicableMilestones(brief: EventBrief): MilestoneTemplate[] {
  const { base, adds } = BY_TYPE[brief.eventType];
  return [...base, ...adds, ...CROSS_CUTTING]
    .filter((template) => template.when?.(brief) ?? true)
    .sort((a, b) => b.offset - a.offset);
}
