import type { EventBrief } from '../../schema/brief.js';
import type { Milestone } from '../../schema/plan.js';

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

const t = (
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

const WEDDING: MilestoneTemplate[] = [
  t(
    'set-budget',
    'Set budget and draft the guest list',
    300,
    'general',
    'Agree who pays for what and list every family’s guests.',
    true,
  ),
  t(
    'book-venue',
    'Book the venue',
    270,
    'venue',
    'Dates go first. Visit at the hour of the event.',
    true,
  ),
  t(
    'book-photo',
    'Book photographer and videographer',
    240,
    'photo',
    'Ask to see a full wedding album, not a highlight reel.',
  ),
  t(
    'book-caterer',
    'Book the caterer and hold a tasting',
    210,
    'catering',
    'Taste the dishes you will serve; confirm per-plate pricing.',
    true,
  ),
  t(
    'book-decor',
    'Book décor and florist',
    180,
    'decor',
    'Share the venue photos and a colour palette.',
    false,
    (b) => b.subType !== 'court-and-reception',
  ),
  t(
    'finalise-attire',
    'Finalise attire',
    150,
    'attire',
    'Allow time for fittings and alterations.',
  ),
  t(
    'book-music',
    'Book music and entertainment',
    150,
    'entertainment',
    'Confirm sound limits with the venue.',
  ),
  t(
    'save-the-dates',
    'Send save-the-dates',
    120,
    'invitations',
    'A short message with date and city lets guests plan travel.',
  ),
  t(
    'guest-transport',
    'Arrange guest transport and stays',
    90,
    'transport',
    'Block rooms and plan airport or station pick-ups.',
  ),
  t(
    'send-invitations',
    'Send invitations',
    60,
    'invitations',
    'Ask for RSVPs by a clear date.',
    true,
  ),
  t(
    'finalise-menu',
    'Finalise menu and dietary list',
    30,
    'catering',
    'Send the caterer the final dishes and every dietary need.',
  ),
  t(
    'final-headcount',
    'Confirm final headcount to the caterer',
    14,
    'catering',
    'Most caterers bill on this number.',
    true,
  ),
  t(
    'confirm-vendors',
    'Confirm every vendor and payment schedule',
    10,
    'general',
    'One call or message each; write down arrival times.',
    true,
  ),
  t(
    'write-run-sheet',
    'Write the run sheet and assign roles',
    7,
    'general',
    'Give each helper a printed copy.',
  ),
  t(
    'emergency-kit',
    'Pack an emergency kit',
    2,
    'general',
    'Safety pins, sewing kit, painkillers, snacks, chargers.',
  ),
  t('event-day', 'Event day', 0, 'general', 'Follow the run sheet and enjoy the day.', true),
  t(
    'settle-payments',
    'Settle final payments and review vendors',
    -7,
    'general',
    'Pay balances and leave honest reviews.',
  ),
  t(
    'thank-you-notes',
    'Send thank-you notes',
    -14,
    'general',
    'Start with the people who helped most.',
  ),
];

const WEDDING_ADDS: MilestoneTemplate[] = [
  t(
    'hold-rooms',
    'Hold the room block and travel',
    240,
    'travel',
    'Destination guests need rooms and tickets early.',
    true,
    (b) => b.subType === 'destination',
  ),
  t(
    'travel-pack',
    'Send the travel information pack',
    90,
    'travel',
    'Include maps, weather, dress notes and contacts.',
    false,
    (b) => b.subType === 'destination',
  ),
  t(
    'book-officiant',
    'Book the pandit or officiant and confirm the muhurat',
    200,
    'general',
    'Muhurat times can fix the whole day’s schedule.',
    true,
    (b) => b.subType === 'traditional',
  ),
  t(
    'book-mehendi',
    'Book mehendi and make-up artists',
    120,
    'attire',
    'Popular artists are booked months ahead.',
    false,
    (b) => b.subType === 'traditional',
  ),
];

const BIRTHDAY: MilestoneTemplate[] = [
  t(
    'set-budget',
    'Set budget and guest list',
    45,
    'general',
    'Decide the number first; it drives every other cost.',
  ),
  t(
    'book-venue',
    'Book the venue',
    40,
    'venue',
    'Check the hours include set-up and clean-up.',
    true,
    (b) => b.guestCount > 15,
  ),
  t(
    'choose-theme',
    'Choose the theme',
    35,
    'decor',
    'A theme makes décor, cake and favours easy to decide.',
  ),
  t(
    'book-entertainer',
    'Book entertainer or activities',
    30,
    'entertainment',
    'Confirm age-suitable content and duration.',
  ),
  t(
    'send-invitations',
    'Send invitations',
    21,
    'invitations',
    'Include start and end times and RSVP date.',
    true,
  ),
  t(
    'order-cake',
    'Order the cake',
    10,
    'catering',
    'Confirm flavour, size and any allergy needs.',
    true,
  ),
  t(
    'collect-rsvps',
    'Collect RSVPs and dietary needs',
    7,
    'general',
    'Chase quiet replies by message.',
  ),
  t(
    'buy-decor-favours',
    'Buy décor and favours',
    7,
    'decor',
    'Pick up balloons, banners and return gifts.',
  ),
  t('confirm-vendors', 'Confirm vendors', 3, 'general', 'Re-check times and the address.', true),
  t(
    'playlist-run-sheet',
    'Prepare the playlist and run sheet',
    2,
    'general',
    'Keep a backup playlist offline.',
  ),
  t('event-day', 'Event day', 0, 'general', 'Follow the run sheet and enjoy the day.', true),
  t(
    'thank-you-messages',
    'Send thank-you messages',
    -3,
    'general',
    'A short note or photo to each guest.',
  ),
];

const BIRTHDAY_ADDS: MilestoneTemplate[] = [
  t(
    'allergy-info',
    'Collect allergy information from parents',
    10,
    'catering',
    'Ask every parent in the invitation chat.',
    true,
    (b) => b.subType === 'kids',
  ),
  t(
    'supervisors',
    'Arrange adult supervisors (one per six children)',
    5,
    'general',
    'Name them on the run sheet.',
    false,
    (b) => b.subType === 'kids',
  ),
  t(
    'slideshow',
    'Prepare a memory slideshow and guest messages',
    21,
    'entertainment',
    'Ask friends and family for photos and a line each.',
    false,
    (b) => b.subType === 'milestone',
  ),
];

const COMMUNITY: MilestoneTemplate[] = [
  t(
    'form-committee',
    'Form the committee and assign roles',
    90,
    'general',
    'Name one lead each for money, safety, volunteers and publicity.',
    true,
  ),
  t(
    'apply-permits',
    'Apply for permits (public space, police, fire, noise)',
    75,
    'permits',
    'Approvals can take weeks; ask the office what they need.',
    true,
  ),
  t(
    'book-ground',
    'Book the ground or venue',
    70,
    'venue',
    'Get the booking in writing with the hours.',
    true,
  ),
  t(
    'line-up-sponsors',
    'Line up sponsors',
    60,
    'outreach',
    'Offer visible thanks in return for support.',
    false,
    (b) => b.subType === 'fundraiser' || b.subType === 'festival',
  ),
  t(
    'book-sound-power',
    'Book sound, power and lighting',
    45,
    'logistics',
    'Plan backup power for the stage and stalls.',
  ),
  t(
    'book-performers',
    'Book performers',
    45,
    'entertainment',
    'Confirm timings and any sound needs.',
    false,
    (b) => b.subType !== 'drive',
  ),
  t(
    'arrange-food',
    'Arrange food stalls or a caterer (registered food vendors)',
    40,
    'catering',
    'Ask for food-safety registration.',
  ),
  t(
    'publicity',
    'Publicity: posters, social posts and resident groups',
    30,
    'outreach',
    'Post a clear date, place, time and contact.',
  ),
  t(
    'procure-supplies',
    'Procure supplies (gloves, bags, collection boxes)',
    21,
    'supplies',
    'Count volunteers and add a spare.',
    false,
    (b) => b.subType === 'drive',
  ),
  t(
    'safety-plan',
    'Write the safety plan: first aid, extinguishers, exits',
    21,
    'safety',
    'Mark exits and the first-aid post on the site map.',
    true,
  ),
  t(
    'volunteer-roster',
    'Volunteer roster and briefing',
    14,
    'general',
    'Give each volunteer a shift, a role and a contact.',
  ),
  t(
    'waste-plan',
    'Waste and recycling plan',
    10,
    'supplies',
    'Place bins at stalls and exits; assign a clean-up crew.',
  ),
  t(
    'site-walkthrough',
    'Final site walkthrough',
    2,
    'general',
    'Walk the route a guest will take, including exits.',
    true,
  ),
  t('event-day', 'Event day', 0, 'general', 'Follow the run sheet and enjoy the day.', true),
  t('clean-up', 'Clean-up and lost-and-found', -1, 'general', 'Return the ground as you found it.'),
  t(
    'accounts-thanks',
    'Settle accounts and thank sponsors',
    -7,
    'general',
    'Share a short report with residents and sponsors.',
  ),
];

const CROSS_CUTTING: MilestoneTemplate[] = [
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
