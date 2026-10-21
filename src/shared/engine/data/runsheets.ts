import type { EventBrief } from '../../schema/brief.js';

export interface SlotTemplate {
  id: string;
  /** Minutes relative to the start time. */
  offsetMinutes: number;
  title: string;
  owner: string;
  note?: string;
}

const s = (
  id: string,
  offsetMinutes: number,
  title: string,
  owner: string,
  note?: string,
): SlotTemplate => ({
  id,
  offsetMinutes,
  title,
  owner,
  ...(note ? { note } : {}),
});

const WEDDING: SlotTemplate[] = [
  s('vendors-arrive', -360, 'Vendors arrive and décor set-up', 'Décor lead'),
  s('sound-check', -180, 'Sound check', 'Music'),
  s('caterer-setup', -120, 'Caterer set-up and tasting', 'Catering lead'),
  s('family-photos', -60, 'Family photographs', 'Photographer'),
  s('guest-arrival', 0, 'Guest arrival and welcome', 'Hosts'),
  s(
    'ceremony',
    45,
    'Ceremony and main programme',
    'Officiant',
    'Confirm the muhurat with your pandit or officiant.',
  ),
  s('dinner', 150, 'Dinner service', 'Catering lead'),
  s('music-dance', 240, 'Music and dance', 'Music'),
  s('send-off', 330, 'Send-off', 'Hosts'),
  s('pack-down', 360, 'Vendor pack-down', 'Venue manager'),
];

const KIDS: SlotTemplate[] = [
  s('setup', -90, 'Set-up', 'Host'),
  s('entertainer-arrives', -15, 'Entertainer arrives', 'Entertainer'),
  s('guest-arrival', 0, 'Guests arrive and free play', 'Host'),
  s('games-show', 30, 'Games and show', 'Entertainer'),
  s('cake-song', 75, 'Cake and song', 'Host'),
  s('food', 90, 'Food', 'Host'),
  s('return-gifts', 120, 'Return gifts and pick-up', 'Host'),
];

const GROWN_UP_BIRTHDAY: SlotTemplate[] = [
  s('setup', -120, 'Set-up and décor', 'Host'),
  s('sound-check', -45, 'Sound check', 'Music'),
  s('guest-arrival', 0, 'Guests arrive and welcome drink', 'Host'),
  s('toast', 60, 'Toast and speeches', 'Host'),
  s('dinner', 90, 'Dinner service', 'Catering lead'),
  s('cake', 150, 'Cake and song', 'Host'),
  s('music-dance', 180, 'Music and dancing', 'Music'),
  s('send-off', 240, 'Send-off and thanks', 'Host'),
];

const COMMUNITY: SlotTemplate[] = [
  s('stall-setup', -300, 'Stall and stage set-up', 'Logistics lead'),
  s('safety-briefing', -120, 'Safety briefing for volunteers', 'Safety lead'),
  s('sound-check', -60, 'Sound check', 'Sound crew'),
  s('gates-open', 0, 'Gates open', 'Entry team'),
  s('opening', 30, 'Opening address', 'Chair'),
  s('programme', 60, 'Programme', 'Stage manager'),
  s('food-peak', 180, 'Food-service peak', 'Food lead'),
  s('close', 270, 'Close and announcements', 'Chair'),
  s('clean-up', 300, 'Clean-up crew', 'Clean-up lead'),
];

const DRIVE: SlotTemplate[] = [
  s('kit-setup', -90, 'Set up kits, gloves and collection points', 'Supplies lead'),
  s('safety-briefing', -30, 'Safety briefing for volunteers', 'Safety lead'),
  s('sign-in', 0, 'Volunteers arrive and sign in', 'Volunteer lead'),
  s('assignments', 15, 'Teams and areas assigned', 'Volunteer lead'),
  s('main-round', 60, 'Main collection round', 'Team leaders'),
  s('sorting', 150, 'Sorting and weighing', 'Supplies lead'),
  s('refreshments', 210, 'Refreshments', 'Food lead'),
  s('wrap-up', 240, 'Wrap-up and thanks', 'Chair'),
];

/** Default start time (the "guests arrive" moment) as minutes from midnight. */
const START_MINUTES: Record<string, number> = {
  'wedding/traditional': 18 * 60,
  'wedding/intimate': 18 * 60,
  'wedding/destination': 18 * 60,
  'wedding/court-and-reception': 18 * 60,
  'birthday/kids': 16 * 60,
  'birthday/teen': 17 * 60,
  'birthday/adult': 20 * 60,
  'birthday/milestone': 20 * 60,
  'community/festival': 16 * 60,
  'community/fundraiser': 16 * 60,
  'community/cultural-night': 16 * 60,
  'community/drive': 7 * 60,
};

export const startMinutesFor = (brief: EventBrief): number =>
  START_MINUTES[`${brief.eventType}/${brief.subType}`] ?? 18 * 60;

export function slotTemplatesFor(brief: EventBrief): SlotTemplate[] {
  if (brief.eventType === 'wedding') {
    return WEDDING;
  }
  if (brief.eventType === 'birthday') {
    return brief.subType === 'kids' ? KIDS : GROWN_UP_BIRTHDAY;
  }
  return brief.subType === 'drive' ? DRIVE : COMMUNITY;
}

/** Extra slots added by context (docs/04 §8). */
export function modifierSlots(brief: EventBrief): SlotTemplate[] {
  const slots: SlotTemplate[] = [];
  if (brief.setting !== 'indoor') {
    slots.push(s('weather-check', -240, 'Weather check and go/no-go for the backup', 'Event lead'));
  }
  if (brief.accessibility.length > 0) {
    slots.push(s('access-walkthrough', -120, 'Accessibility walkthrough', 'Access lead'));
  }
  if (brief.eventType === 'community' && brief.guestCount > 300) {
    slots.push(s('marshals', -30, 'Marshals at entry and exit positions', 'Safety lead'));
  }
  return slots;
}
