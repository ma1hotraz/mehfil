import { type MilestoneTemplate, t } from './template.js';

/** Milestones added by access needs, setting or diet for any event. */
export const CROSS_CUTTING: MilestoneTemplate[] = [
  t(
    'access-walkthrough',
    'Accessibility walkthrough of the venue',
    30,
    'accessibility',
    'Check entry, restrooms, seating, signage and a quiet space.',
    true,
    (b) => b.accessibility.length >= 1,
  ),
  t(
    'backup-cover',
    'Book backup cover and check the forecast',
    7,
    'weatherCover',
    'Decide the go/no-go time for the backup.',
    false,
    (b) => b.setting !== 'indoor',
  ),
  t(
    'share-dietary',
    'Share the dietary list with the caterer',
    14,
    'catering',
    'Name every allergy and diet clearly.',
    false,
    (b) => b.dietary.length >= 1,
  ),
];
