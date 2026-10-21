import { vi } from 'vitest';

import type { PlansApi } from '../../src/client/lib/usePlans';
import type { Plan } from '../../src/shared/schema/plan.js';

/** A PlansApi whose every method is a spy, for testing tabs in isolation. */
export function fakeApi(plan: Plan, overrides: Partial<PlansApi> = {}): PlansApi {
  return {
    plan,
    plans: [plan],
    discarded: 0,
    ideasLoading: false,
    create: vi.fn(() => Promise.resolve(plan)),
    editBrief: vi.fn(() => Promise.resolve(plan)),
    open: vi.fn(),
    close: vi.fn(),
    remove: vi.fn(),
    step: vi.fn(),
    setPercent: vi.fn(),
    resetLedger: vi.fn(),
    setCommitted: vi.fn(),
    toggleTask: vi.fn(),
    setVendorStatus: vi.fn(),
    setVendorContact: vi.fn(),
    toggleIdeaSaved: vi.fn(),
    requestIdeas: vi.fn(),
    applyPlannerAction: vi.fn(() => Promise.resolve({ notice: 'Done' })),
    ...overrides,
  };
}
