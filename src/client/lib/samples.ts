import { addDays } from '../../shared/engine/dates.js';
import { EventBrief } from '../../shared/schema/brief.js';

export interface Sample {
  id: string;
  label: string;
  brief: EventBrief;
}

/** The three front-page sample briefs; dates are relative to `today` so they never go stale. */
export function sampleBriefs(today: string): Sample[] {
  return [
    {
      id: 'jaipur-wedding',
      label: 'A Jaipur wedding · 250 guests',
      brief: EventBrief.parse({
        eventType: 'wedding',
        subType: 'traditional',
        title: 'Ananya & Kabir',
        date: addDays(today, 210),
        guestCount: 250,
        budget: 1_800_000,
        currency: 'INR',
        city: 'Jaipur',
        setting: 'outdoor',
        vibe: ['cultural', 'festive'],
        dietary: ['vegetarian', 'jain'],
        accessibility: ['step-free', 'elderly-guests'],
        traditions: 'Mehendi and sangeet, Rajasthani customs',
        mustHaves: 'Live ghazal singer, no plastic',
      }),
    },
    {
      id: 'seventh-birthday',
      label: 'A seventh birthday · 25 children',
      brief: EventBrief.parse({
        eventType: 'birthday',
        subType: 'kids',
        title: 'Aarav turns seven',
        date: addDays(today, 24),
        guestCount: 25,
        budget: 40_000,
        currency: 'INR',
        city: 'Pune',
        setting: 'indoor',
        vibe: ['playful'],
        dietary: ['nut-allergy', 'kids-menu'],
      }),
    },
    {
      id: 'diwali-mela',
      label: 'A Diwali mela · 400 neighbours',
      brief: EventBrief.parse({
        eventType: 'community',
        subType: 'festival',
        title: 'Diwali Mela',
        date: addDays(today, 60),
        guestCount: 400,
        budget: 250_000,
        currency: 'INR',
        city: 'Indore',
        setting: 'outdoor',
        vibe: ['festive', 'cultural'],
        accessibility: ['seating-rest-areas'],
      }),
    },
  ];
}
