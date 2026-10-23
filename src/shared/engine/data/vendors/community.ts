import { QUESTIONS, type VendorTemplate, guests, kind, venueKind } from './common.js';

/** Vendors for community events. */
export const COMMUNITY_VENDORS: readonly VendorTemplate[] = [
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
];
