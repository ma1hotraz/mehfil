import { describe, expect, it } from 'vitest';

import {
  AssistantRequest,
  EventBrief,
  IdeasRequest,
  SuggestedAction,
  checkBriefDate,
  latestEventDate,
} from '../../src/shared/schema/index.js';

const base = {
  eventType: 'wedding',
  subType: 'traditional',
  date: '2027-03-12',
  guestCount: 250,
  budget: 1_800_000,
  currency: 'INR',
  city: 'Jaipur',
  setting: 'outdoor',
};

describe('EventBrief', () => {
  it('accepts a minimal brief and applies defaults', () => {
    const parsed = EventBrief.parse(base);
    expect(parsed.vibe).toEqual([]);
    expect(parsed.traditions).toBe('');
  });

  it('rejects unknown keys, bad sub-types and out-of-range numbers', () => {
    expect(EventBrief.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(EventBrief.safeParse({ ...base, subType: 'kids' }).success).toBe(false);
    expect(EventBrief.safeParse({ ...base, guestCount: 0 }).success).toBe(false);
    expect(EventBrief.safeParse({ ...base, guestCount: 5001 }).success).toBe(false);
    expect(EventBrief.safeParse({ ...base, budget: -1 }).success).toBe(false);
    expect(EventBrief.safeParse({ ...base, date: '2027-02-30' }).success).toBe(false);
    expect(EventBrief.safeParse({ ...base, vibe: ['classic', 'classic'] }).success).toBe(false);
    expect(
      EventBrief.safeParse({ ...base, vibe: ['classic', 'playful', 'rustic', 'elegant'] }).success,
    ).toBe(false);
  });
});

describe('checkBriefDate', () => {
  it('accepts today up to three years ahead', () => {
    expect(checkBriefDate('2026-10-21', '2026-10-21')).toBeUndefined();
    expect(checkBriefDate(latestEventDate('2026-10-21'), '2026-10-21')).toBeUndefined();
  });

  it('rejects the past and the far future, with optional tolerance', () => {
    expect(checkBriefDate('2026-10-20', '2026-10-21')).toMatch(/three years/);
    expect(checkBriefDate('2026-10-20', '2026-10-21', 1)).toBeUndefined();
    expect(checkBriefDate('2030-01-01', '2026-10-21')).toMatch(/three years/);
  });
});

describe('request schemas', () => {
  it('IdeasRequest defaults focus and exclude', () => {
    const parsed = IdeasRequest.parse({ brief: base });
    expect(parsed.focus).toBe('all');
    expect(parsed.exclude).toEqual([]);
  });

  it('AssistantRequest rejects over-long questions and history', () => {
    const plan = {
      ledger: [],
      openMilestones: [],
      vendors: [],
      feasibility: { verdict: 'workable', perGuestMinor: 1, benchmarkMinor: 1 },
      leadDays: 10,
    };
    const ok = { brief: base, plan, question: 'What next?' };
    expect(AssistantRequest.safeParse(ok).success).toBe(true);
    expect(AssistantRequest.safeParse({ ...ok, question: 'x'.repeat(501) }).success).toBe(false);
    expect(
      AssistantRequest.safeParse({
        ...ok,
        history: Array.from({ length: 11 }, () => ({ role: 'user', text: 'hi' })),
      }).success,
    ).toBe(false);
  });

  it('SuggestedAction enforces the whitelist and ranges', () => {
    const shift = { type: 'shiftBudget', from: 'decor', to: 'photo', percent: 3, rationale: 'x' };
    expect(SuggestedAction.safeParse(shift).success).toBe(true);
    expect(SuggestedAction.safeParse({ ...shift, percent: 25 }).success).toBe(false);
    expect(SuggestedAction.safeParse({ type: 'deleteAll' }).success).toBe(false);
    expect(
      SuggestedAction.safeParse({
        type: 'markVendor',
        vendorId: '../x',
        status: 'paid',
        rationale: '',
      }).success,
    ).toBe(false);
  });
});
