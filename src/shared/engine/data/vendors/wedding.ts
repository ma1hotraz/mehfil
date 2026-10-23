import { QUESTIONS, type VendorTemplate, guests, kind, venueKind } from './common.js';

/** Vendors for weddings. */
export const WEDDING_VENDORS: readonly VendorTemplate[] = [
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
];
