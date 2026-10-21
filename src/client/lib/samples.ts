import { addDays } from '../../shared/engine/dates.js';
import { EventBrief } from '../../shared/schema/brief.js';

export interface Sample {
  id: string;
  label: string;
  brief: EventBrief;
}

interface SampleSpec {
  id: string;
  label: string;
  /** Days from today, so a sample never goes stale. */
  inDays: number;
  fields: Record<string, unknown>;
}

const SAMPLES: readonly SampleSpec[] = [
  {
    id: 'jaipur-wedding',
    label: 'A Jaipur wedding · 250 guests',
    inDays: 210,
    fields: {
      eventType: 'wedding',
      subType: 'traditional',
      title: 'Ananya & Kabir',
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
    },
  },
  {
    id: 'seventh-birthday',
    label: 'A seventh birthday · 25 children',
    inDays: 24,
    fields: {
      eventType: 'birthday',
      subType: 'kids',
      title: 'Aarav turns seven',
      guestCount: 25,
      budget: 40_000,
      currency: 'INR',
      city: 'Pune',
      setting: 'indoor',
      vibe: ['playful'],
      dietary: ['nut-allergy', 'kids-menu'],
    },
  },
  {
    id: 'diwali-mela',
    label: 'A Diwali mela · 400 neighbours',
    inDays: 60,
    fields: {
      eventType: 'community',
      subType: 'festival',
      title: 'Diwali Mela',
      guestCount: 400,
      budget: 250_000,
      currency: 'INR',
      city: 'Indore',
      setting: 'outdoor',
      vibe: ['festive', 'cultural'],
      accessibility: ['seating-rest-areas'],
    },
  },
];

/** The three front-page sample briefs, dated relative to `today`. */
export function sampleBriefs(today: string): Sample[] {
  return SAMPLES.map(({ id, label, inDays, fields }) => ({
    id,
    label,
    brief: EventBrief.parse({ ...fields, date: addDays(today, inDays) }),
  }));
}
