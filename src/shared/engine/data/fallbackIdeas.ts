import { BIRTHDAY_ADULT } from './ideas/birthdayAdult.js';
import { BIRTHDAY_KIDS } from './ideas/birthdayKids.js';
import { BIRTHDAY_MILESTONE } from './ideas/birthdayMilestone.js';
import { BIRTHDAY_TEEN } from './ideas/birthdayTeen.js';
import { COMMUNITY_CULTURAL_NIGHT } from './ideas/communityCulturalNight.js';
import { COMMUNITY_DRIVE } from './ideas/communityDrive.js';
import { COMMUNITY_FESTIVAL } from './ideas/communityFestival.js';
import { COMMUNITY_FUNDRAISER } from './ideas/communityFundraiser.js';
import { WEDDING_COURT_AND_RECEPTION } from './ideas/weddingCourtAndReception.js';
import { WEDDING_DESTINATION } from './ideas/weddingDestination.js';
import { WEDDING_INTIMATE } from './ideas/weddingIntimate.js';
import { WEDDING_TRADITIONAL } from './ideas/weddingTraditional.js';

import type { FallbackIdea } from './ideas/idea.js';

export type { FallbackIdea } from './ideas/idea.js';

/** Hand-written library used when Gemini is unavailable: 13 ideas per sub-type, 2+ per category. */
export const FALLBACK_IDEAS: Record<string, readonly FallbackIdea[]> = {
  'wedding/traditional': WEDDING_TRADITIONAL,
  'wedding/intimate': WEDDING_INTIMATE,
  'wedding/destination': WEDDING_DESTINATION,
  'wedding/court-and-reception': WEDDING_COURT_AND_RECEPTION,
  'birthday/kids': BIRTHDAY_KIDS,
  'birthday/teen': BIRTHDAY_TEEN,
  'birthday/adult': BIRTHDAY_ADULT,
  'birthday/milestone': BIRTHDAY_MILESTONE,
  'community/festival': COMMUNITY_FESTIVAL,
  'community/fundraiser': COMMUNITY_FUNDRAISER,
  'community/cultural-night': COMMUNITY_CULTURAL_NIGHT,
  'community/drive': COMMUNITY_DRIVE,
};
