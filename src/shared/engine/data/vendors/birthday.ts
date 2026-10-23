import { QUESTIONS, type VendorTemplate, cakeQuestions, guests, kind } from './common.js';

/** Vendors for birthdays. */
export const BIRTHDAY_VENDORS: readonly VendorTemplate[] = [
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
];
