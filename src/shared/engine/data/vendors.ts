import { ANY_TYPE_VENDORS } from './vendors/anyType.js';
import { BIRTHDAY_VENDORS } from './vendors/birthday.js';
import type { VendorRole, VendorTemplate } from './vendors/common.js';
import { COMMUNITY_VENDORS } from './vendors/community.js';
import { WEDDING_VENDORS } from './vendors/wedding.js';
import type { EventBrief } from '../../schema/brief.js';

export type { VendorRole, VendorTemplate } from './vendors/common.js';

/** Every vendor the checklist can contain; each template says when it applies. */
export const VENDOR_CATALOG: readonly VendorTemplate[] = [
  ...WEDDING_VENDORS,
  ...BIRTHDAY_VENDORS,
  ...COMMUNITY_VENDORS,
  ...ANY_TYPE_VENDORS,
];

/** Caterer question added for each dietary need on the brief. */
export const DIETARY_QUESTIONS: Record<EventBrief['dietary'][number], string> = {
  jain: 'Can you cook without onion, garlic and root vegetables in a separate kitchen?',
  halal: 'Is the meat certified halal?',
  vegetarian: 'Is the kitchen fully vegetarian, or is it shared with meat dishes?',
  vegan: 'Can every course have a vegan option without dairy, ghee or honey?',
  'gluten-free': 'How do you prevent cross-contamination for gluten-free dishes?',
  'nut-allergy': 'Can you guarantee a nut-free kitchen and label every dish?',
  'kids-menu': 'Can you provide a kids’ menu with mild, finger-friendly dishes?',
};

/** Extra questions that accessibility needs add to vendors with a given role. */
export const ACCESS_QUESTIONS: readonly {
  need: EventBrief['accessibility'][number];
  role: VendorRole;
  question: string;
}[] = [
  {
    need: 'step-free',
    role: 'venue',
    question: 'Is there step-free entry, a ramp and an accessible restroom?',
  },
  {
    need: 'sensory-friendly',
    role: 'venue',
    question: 'Is there a quiet room away from the speakers?',
  },
  {
    need: 'sensory-friendly',
    role: 'sound',
    question: 'Can the volume be kept under about 85 dB?',
  },
  {
    need: 'elderly-guests',
    role: 'seating',
    question: 'Is there seating with back support near the stage and restrooms?',
  },
  {
    need: 'seating-rest-areas',
    role: 'seating',
    question: 'Is there seating with back support near the stage and restrooms?',
  },
];
