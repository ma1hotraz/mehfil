import { ALL, type VendorTemplate, WEDDING_BIRTHDAY, eventIs, guests } from './common.js';

/** Vendors any event can need, added by setting or access needs. */
export const ANY_TYPE_VENDORS: readonly VendorTemplate[] = [
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
