import type { EventBrief, EventType } from '../../schema/brief.js';

/** What a vendor does, so cross-cutting questions can find the right one. */
export type VendorRole = 'venue' | 'food' | 'sound' | 'seating';

export interface VendorTemplate {
  id: string;
  label: string;
  appliesTo: readonly EventType[];
  roles?: readonly VendorRole[];
  when?: (brief: EventBrief) => boolean;
  /** Names the rule that added this vendor (shown on the ticket). */
  reason: (brief: EventBrief) => string;
  /** Days before the event by which to book. */
  bookByOffset: number;
  questions: (brief: EventBrief) => string[];
}

const ALL: readonly EventType[] = ['wedding', 'birthday', 'community'];
const WEDDING_BIRTHDAY: readonly EventType[] = ['wedding', 'birthday'];

/** "an indoor venue", "an outdoor venue" or "a part-outdoor venue". */
const venueKind = (brief: EventBrief): string =>
  brief.setting === 'indoor'
    ? 'an indoor venue'
    : brief.setting === 'outdoor'
      ? 'an outdoor venue'
      : 'a part-outdoor venue';
/** "indoors", "outdoors" or "part outdoors", for "the event is ...". */
const eventIs = (brief: EventBrief): string =>
  brief.setting === 'indoor'
    ? 'indoors'
    : brief.setting === 'outdoor'
      ? 'outdoors'
      : 'part outdoors';
const kind = (brief: EventBrief): string => `${brief.subType} ${brief.eventType}`.replace('-', ' ');
const guests = (brief: EventBrief): string => `${brief.guestCount} guests`;

const QUESTIONS = {
  venue: [
    'What is the guest capacity for seated and standing set-ups?',
    'Which hours are included, and what do extra hours cost?',
    'Is there backup power and ample parking?',
    'What is the cancellation and refund policy?',
  ],
  caterer: [
    'Can we taste the menu before booking?',
    'Is the price per plate all-inclusive of staff and crockery?',
    'How do you handle allergies and special diets?',
    'What is the last date to change the headcount?',
  ],
  decor: [
    'Can you share photos of similar work and a written quote?',
    'What happens if flowers or materials are unavailable?',
    'Who sets up and clears, and by what time?',
  ],
  photo: [
    'Can we see a full album from a similar event?',
    'How many hours and how many photographers are included?',
    'When will we receive edited photos, and in what format?',
    'Who owns the files and can we print them?',
  ],
  music: [
    'Can you share a set list or sample mixes?',
    'What sound equipment do you bring?',
    'What is your overtime rate?',
  ],
  generic: [
    'Can you give a written quote with everything included?',
    'What deposit is needed and when is the balance due?',
    'What is your cancellation policy?',
  ],
} as const;

const cakeQuestions = [
  'Can you make the cake egg-free, nut-free or vegan if needed?',
  'Do you deliver and set up at the venue?',
  'How much notice do you need for custom designs?',
];

export const VENDOR_CATALOG: readonly VendorTemplate[] = [
  // Weddings
  {
    id: 'venue',
    label: 'Venue',
    appliesTo: ['wedding'],
    roles: ['venue'],
    bookByOffset: 270,
    reason: (b) => `Added because a ${kind(b)} for ${guests(b)} needs ${venueKind(b)}.`,
    questions: () => [...QUESTIONS.venue],
  },
  {
    id: 'caterer',
    label: 'Caterer',
    appliesTo: ['wedding'],
    roles: ['food'],
    bookByOffset: 210,
    reason: (b) => `Added because ${guests(b)} need meals for a ${kind(b)}.`,
    questions: () => [...QUESTIONS.caterer],
  },
  {
    id: 'decor',
    label: 'Décor and florist',
    appliesTo: ['wedding'],
    bookByOffset: 180,
    reason: (b) => `Added because a ${kind(b)} is set with flowers, drapes and lighting.`,
    questions: () => [...QUESTIONS.decor],
  },
  {
    id: 'photographer',
    label: 'Photographer and videographer',
    appliesTo: ['wedding'],
    bookByOffset: 240,
    reason: (b) => `Added because every ${kind(b)} needs someone to record the day.`,
    questions: () => [...QUESTIONS.photo],
  },
  {
    id: 'makeup',
    label: 'Make-up and mehendi artist',
    appliesTo: ['wedding'],
    bookByOffset: 120,
    when: (b) => b.subType === 'traditional',
    reason: () =>
      'Added because a traditional wedding usually includes mehendi and bridal make-up.',
    questions: () => [
      'Can we book a trial session before the day?',
      'How many people can you attend to, and how long does each take?',
      'Do you bring your own products, and are they skin-tested?',
    ],
  },
  {
    id: 'music',
    label: 'Music: DJ, band or dhol',
    appliesTo: ['wedding'],
    roles: ['sound'],
    bookByOffset: 150,
    reason: (b) => `Added because ${guests(b)} will want music and a dance floor.`,
    questions: () => [...QUESTIONS.music],
  },
  {
    id: 'officiant',
    label: 'Pandit or officiant',
    appliesTo: ['wedding'],
    bookByOffset: 200,
    when: (b) => b.subType === 'traditional',
    reason: () => 'Added because a traditional wedding needs a confirmed muhurat and officiant.',
    questions: () => [
      'Which muhurat times are auspicious for our date?',
      'How long will the ceremony run?',
      'What items should the family arrange in advance?',
    ],
  },
  {
    id: 'invitations',
    label: 'Invitation printer or e-invite designer',
    appliesTo: ['wedding'],
    bookByOffset: 120,
    reason: (b) => `Added because ${guests(b)} need invitations and save-the-dates.`,
    questions: () => [
      'How long do printing and delivery take?',
      'Can you make a digital version for messaging apps?',
      'Can we see a proof before the full print run?',
    ],
  },
  {
    id: 'guest-transport',
    label: 'Guest transport',
    appliesTo: ['wedding'],
    bookByOffset: 90,
    when: (b) => b.guestCount > 80 || b.subType === 'destination',
    reason: (b) =>
      b.subType === 'destination'
        ? 'Added because guests are travelling to a destination wedding.'
        : `Added because ${guests(b)} is more than 80 people to move.`,
    questions: () => [
      'How many vehicles and drivers are included?',
      'Can you run shuttles on a fixed timetable?',
      'What is the waiting-time charge?',
    ],
  },
  {
    id: 'travel-agent',
    label: 'Travel agent and room block',
    appliesTo: ['wedding'],
    bookByOffset: 240,
    when: (b) => b.subType === 'destination',
    reason: () => 'Added because a destination wedding needs travel and rooms for guests.',
    questions: () => [
      'What group rate can you get for a room block?',
      'What is the release date for unused rooms?',
      'Can you handle flights and airport transfers?',
    ],
  },
  // Birthdays
  {
    id: 'venue',
    label: 'Venue',
    appliesTo: ['birthday'],
    roles: ['venue'],
    bookByOffset: 40,
    when: (b) => b.guestCount > 15,
    reason: (b) => `Added because ${guests(b)} is more than 15, which is too many for most homes.`,
    questions: () => [...QUESTIONS.venue],
  },
  {
    id: 'home-hall',
    label: 'Home / society hall booking',
    appliesTo: ['birthday'],
    roles: ['venue'],
    bookByOffset: 14,
    when: (b) => b.guestCount <= 15,
    reason: (b) => `Added because ${guests(b)} fit at home or in a society hall.`,
    questions: () => [
      'Is the hall free on our date and for how many hours?',
      'Is there a deposit or a noise curfew?',
      'Can we decorate and use a speaker?',
    ],
  },
  {
    id: 'cake',
    label: 'Cake baker',
    appliesTo: ['birthday'],
    bookByOffset: 10,
    reason: (b) => `Added because a ${kind(b)} is not complete without a cake.`,
    questions: () => cakeQuestions,
  },
  {
    id: 'caterer',
    label: 'Caterer',
    appliesTo: ['birthday'],
    roles: ['food'],
    bookByOffset: 21,
    when: (b) => b.guestCount > 20,
    reason: (b) => `Added because ${guests(b)} is more than 20 people to feed.`,
    questions: () => [...QUESTIONS.caterer],
  },
  {
    id: 'snacks',
    label: 'Snacks and groceries run',
    appliesTo: ['birthday'],
    roles: ['food'],
    bookByOffset: 3,
    when: (b) => b.guestCount <= 20,
    reason: (b) => `Added because ${guests(b)} can be fed with a snack run instead of a caterer.`,
    questions: () => [
      'Who is shopping, and by when?',
      'Do we have enough plates, cups and napkins?',
      'Is there refrigerator space for drinks and dessert?',
    ],
  },
  {
    id: 'entertainer',
    label: 'Entertainer',
    appliesTo: ['birthday'],
    roles: ['sound'],
    bookByOffset: 30,
    reason: (b) =>
      b.subType === 'kids'
        ? 'Added because children need a magician or games host to hold attention.'
        : `Added because a ${kind(b)} needs a DJ, band or host.`,
    questions: (b) =>
      b.subType === 'kids'
        ? [
            'Which age group is your show made for?',
            'How long does it run?',
            'What do you need in terms of space?',
          ]
        : [...QUESTIONS.music],
  },
  {
    id: 'decor',
    label: 'Décor and balloons',
    appliesTo: ['birthday'],
    bookByOffset: 35,
    reason: (b) => `Added because a ${kind(b)} looks best with a clear theme.`,
    questions: () => [...QUESTIONS.decor],
  },
  {
    id: 'photographer',
    label: 'Photographer',
    appliesTo: ['birthday'],
    bookByOffset: 30,
    when: (b) => b.subType === 'milestone' || b.guestCount > 50,
    reason: (b) =>
      b.subType === 'milestone'
        ? 'Added because a milestone birthday is worth recording.'
        : `Added because ${guests(b)} is too many to photograph yourself.`,
    questions: () => [...QUESTIONS.photo],
  },
  {
    id: 'return-gifts',
    label: 'Return-gift supplier',
    appliesTo: ['birthday'],
    bookByOffset: 14,
    when: (b) => b.subType === 'kids',
    reason: (b) => `Added because ${guests(b)} of children will expect a return gift.`,
    questions: () => [
      'What is the minimum order and delivery time?',
      'Are the items safe for the right age group?',
      'Can you pack and label them in bags?',
    ],
  },
  {
    id: 'invitations',
    label: 'Invitation designer',
    appliesTo: ['birthday'],
    bookByOffset: 28,
    reason: (b) => `Added because ${guests(b)} need a clear invitation with time and place.`,
    questions: () => [
      'Can you design a digital invitation for messaging apps?',
      'Can the RSVP link or phone number be added?',
      'How long does a revision take?',
    ],
  },
  // Community
  {
    id: 'venue',
    label: 'Ground or venue',
    appliesTo: ['community'],
    roles: ['venue'],
    bookByOffset: 70,
    reason: (b) =>
      `Added because ${guests(b)} need ${venueKind(b).replace('venue', 'site')} for a ${kind(b)}.`,
    questions: () => [...QUESTIONS.venue],
  },
  {
    id: 'permits',
    label: 'Permits office: municipal, police and fire',
    appliesTo: ['community'],
    bookByOffset: 75,
    reason: (b) => `Added because a public ${kind(b)} for ${guests(b)} needs permissions.`,
    questions: () => [
      'Which permits and NOCs apply to our site and size?',
      'How many working days does each take?',
      'Are there noise limits and a closing time?',
    ],
  },
  {
    id: 'sound-lighting',
    label: 'Sound and lighting',
    appliesTo: ['community'],
    roles: ['sound'],
    bookByOffset: 45,
    reason: (b) => `Added because a ${kind(b)} needs a stage that ${guests(b)} can hear.`,
    questions: () => [...QUESTIONS.music],
  },
  {
    id: 'generator',
    label: 'Generator and power backup',
    appliesTo: ['community'],
    bookByOffset: 45,
    reason: (b) => `Added because ${guests(b)} depend on power for sound, lights and food stalls.`,
    questions: () => [
      'What capacity do we need for sound, lights and stalls?',
      'Who supplies fuel and an operator?',
      'Is it quiet and safely fenced?',
    ],
  },
  {
    id: 'caterer',
    label: 'Food stalls or caterer',
    appliesTo: ['community'],
    roles: ['food'],
    bookByOffset: 40,
    reason: (b) => `Added because ${guests(b)} will need food, ideally from registered vendors.`,
    questions: () => [...QUESTIONS.caterer],
  },
  {
    id: 'tents-seating',
    label: 'Tents and seating',
    appliesTo: ['community'],
    roles: ['seating'],
    bookByOffset: 40,
    reason: (b) => `Added because ${guests(b)} need shade, shelter and places to sit.`,
    questions: () => [
      'How many chairs and tents are included in the price?',
      'Who delivers, sets up and collects?',
      'Are the tents weather-rated?',
    ],
  },
  {
    id: 'first-aid',
    label: 'First aid and ambulance standby',
    appliesTo: ['community'],
    bookByOffset: 21,
    when: (b) => b.guestCount >= 200 || b.setting === 'outdoor',
    reason: (b) =>
      b.guestCount >= 200
        ? `Added because ${guests(b)} is 200 or more.`
        : 'Added because the event is outdoors.',
    questions: () => [
      'Can you station a paramedic for the whole event?',
      'How quickly can an ambulance reach our site?',
      'What first-aid supplies are included?',
    ],
  },
  {
    id: 'marshals',
    label: 'Marshals and security',
    appliesTo: ['community'],
    bookByOffset: 21,
    when: (b) => b.guestCount > 300,
    reason: (b) => `Added because ${guests(b)} is more than 300 attendees.`,
    questions: () => [
      'How many marshals do you advise for our crowd?',
      'Are they trained in crowd control and first aid?',
      'Can they be placed at each entry and exit?',
    ],
  },
  {
    id: 'waste',
    label: 'Waste-management partner',
    appliesTo: ['community'],
    bookByOffset: 30,
    reason: (b) => `Added because ${guests(b)} will leave plates, bottles and packaging behind.`,
    questions: () => [
      'Can you supply bins for wet, dry and recyclable waste?',
      'Do you collect on the event evening?',
      'Can the leftover food be donated?',
    ],
  },
  {
    id: 'printing',
    label: 'Printing and publicity',
    appliesTo: ['community'],
    bookByOffset: 30,
    reason: (b) => `Added because a ${kind(b)} needs posters and banners to reach ${guests(b)}.`,
    questions: () => [
      'What is the turnaround for posters and banners?',
      'Can you print a map and schedule for the day?',
      'Is there a discount for community groups?',
    ],
  },
  // Any type
  {
    id: 'canopy',
    label: 'Tent or canopy rental',
    appliesTo: WEDDING_BIRTHDAY,
    bookByOffset: 60,
    when: (b) => b.setting !== 'indoor',
    reason: (b) => `Added because the event is ${eventIs(b)} with ${guests(b)}.`,
    questions: () => [
      'Is the canopy rated for wind and rain?',
      'Who installs it, and how early?',
      'What is the backup if the weather turns?',
    ],
  },
  {
    id: 'restrooms',
    label: 'Portable restrooms',
    appliesTo: ALL,
    bookByOffset: 45,
    when: (b) => b.setting === 'outdoor' && b.guestCount > 100,
    reason: (b) => `Added because the event is outdoors with ${guests(b)}.`,
    questions: () => [
      'How many units do you advise for our guest count?',
      'Is a hand-washing station and an accessible unit included?',
      'Who services them during the event?',
    ],
  },
  {
    id: 'interpreter',
    label: 'Sign-language interpreter or live captioning',
    appliesTo: ALL,
    bookByOffset: 45,
    when: (b) => b.accessibility.includes('hearing-support'),
    reason: () => 'Added because you asked for hearing support for guests.',
    questions: () => [
      'Which sign language do you interpret, and for how many hours?',
      'Do you need a clear sightline to the stage?',
      'Can captions be shown on a screen?',
    ],
  },
  {
    id: 'signage',
    label: 'Large-print and high-contrast signage',
    appliesTo: ALL,
    bookByOffset: 30,
    when: (b) => b.accessibility.includes('visual-support'),
    reason: () => 'Added because you asked for visual support for guests.',
    questions: () => [
      'Can signs use large type and high-contrast colours?',
      'Can the programme be printed in large type or braille?',
      'Where will directional signs be placed?',
    ],
  },
];

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
