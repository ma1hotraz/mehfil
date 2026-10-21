// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { buildPlan } from '../../src/shared/engine/index.js';
import {
  DEFAULT_PREFS,
  type KeyValueStore,
  MAX_PLANS,
  OPEN_KEY,
  PLANS_KEY,
  PREFS_KEY,
  browserStore,
  loadOpenId,
  loadPlans,
  loadPrefs,
  saveOpenId,
  savePlans,
  savePrefs,
} from '../../src/client/lib/storage';
import { ananya, fixedToday, minimalBrief } from '../fixtures/briefs';

function memoryStore(
  initial: Record<string, string> = {},
): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};
const plan = (id: string, updatedAt: string) => ({
  ...buildPlan(ananya, fixedToday, { id, now: updatedAt }),
});

describe('plans', () => {
  it('round-trips plans, newest first', () => {
    const store = memoryStore();
    const a = plan('a', '2026-10-01T00:00:00.000Z');
    const b = plan('b', '2026-10-02T00:00:00.000Z');
    expect(savePlans(store, [a, b])).toEqual({ ok: true, value: 2 });
    const { plans, discarded } = loadPlans(store);
    expect(plans.map((p) => p.id)).toEqual(['b', 'a']);
    expect(plans[0]).toEqual(b);
    expect(discarded).toBe(0);
  });

  it('starts empty when nothing is stored', () => {
    expect(loadPlans(memoryStore())).toEqual({ plans: [], discarded: 0 });
  });

  it('discards corrupt JSON and says so', () => {
    expect(loadPlans(memoryStore({ [PLANS_KEY]: '{not json' }))).toEqual({
      plans: [],
      discarded: 1,
    });
  });

  it('discards a wrong schema version, counting its plans', () => {
    const raw = JSON.stringify({ schemaVersion: 99, plans: [{}, {}] });
    expect(loadPlans(memoryStore({ [PLANS_KEY]: raw }))).toEqual({ plans: [], discarded: 2 });
    expect(loadPlans(memoryStore({ [PLANS_KEY]: '"text"' })).discarded).toBe(1);
    expect(loadPlans(memoryStore({ [PLANS_KEY]: 'null' })).discarded).toBe(1);
  });

  it('keeps valid plans and drops invalid entries individually', () => {
    const good = plan('good', '2026-10-01T00:00:00.000Z');
    const raw = JSON.stringify({
      schemaVersion: 1,
      plans: [good, { id: 'bad' }, { ...good, brief: { nope: 1 } }],
    });
    const { plans, discarded } = loadPlans(memoryStore({ [PLANS_KEY]: raw }));
    expect(plans.map((p) => p.id)).toEqual(['good']);
    expect(discarded).toBe(2);
  });

  it(`stores at most ${MAX_PLANS} plans, evicting the oldest`, () => {
    const store = memoryStore();
    const many = Array.from({ length: 23 }, (_, i) =>
      plan(`p${i}`, `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
    );
    expect(savePlans(store, many)).toEqual({ ok: true, value: MAX_PLANS });
    const ids = loadPlans(store).plans.map((p) => p.id);
    expect(ids).toHaveLength(MAX_PLANS);
    expect(ids).not.toContain('p0');
    expect(ids[0]).toBe('p22');
  });

  it('survives a blocked or full store', () => {
    expect(loadPlans(throwing)).toEqual({ plans: [], discarded: 0 });
    expect(savePlans(throwing, [plan('a', '2026-10-01T00:00:00.000Z')])).toEqual({
      ok: false,
      error: 'unavailable',
    });
  });

  it('never stores a plan the schema would reject on the way back', () => {
    const store = memoryStore();
    savePlans(store, [plan('x', '2026-10-01T00:00:00.000Z')]);
    expect(JSON.parse(store.data.get(PLANS_KEY) ?? '{}')).toMatchObject({ schemaVersion: 1 });
  });
});

describe('open plan id and preferences', () => {
  it('saves, reads and clears the open id, ignoring failures', () => {
    const store = memoryStore();
    saveOpenId(store, 'abc');
    expect(loadOpenId(store)).toBe('abc');
    saveOpenId(store, undefined);
    expect(loadOpenId(store)).toBeUndefined();
    expect(() => {
      saveOpenId(throwing, 'x');
      saveOpenId(throwing, undefined);
    }).not.toThrow();
    expect(loadOpenId(throwing)).toBeUndefined();
    expect(store.data.has(OPEN_KEY)).toBe(false);
  });

  it('round-trips valid preferences and falls back to defaults otherwise', () => {
    const store = memoryStore();
    expect(loadPrefs(store)).toEqual(DEFAULT_PREFS);
    savePrefs(store, { theme: 'lamplight', textSize: 1.15 });
    expect(loadPrefs(store)).toEqual({ theme: 'lamplight', textSize: 1.15 });
    store.setItem(PREFS_KEY, JSON.stringify({ theme: 'neon', textSize: 3 }));
    expect(loadPrefs(store)).toEqual(DEFAULT_PREFS);
    store.setItem(PREFS_KEY, 'garbage');
    expect(loadPrefs(store)).toEqual(DEFAULT_PREFS);
    expect(() => {
      savePrefs(throwing, DEFAULT_PREFS);
    }).not.toThrow();
  });
});

describe('browserStore', () => {
  it('uses localStorage when available', () => {
    expect(browserStore()).toBe(window.localStorage);
  });

  it('falls back to memory when localStorage throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('denied');
      },
    });
    try {
      const store = browserStore();
      store.setItem('k', 'v');
      expect(store.getItem('k')).toBe('v');
      store.removeItem('k');
      expect(store.getItem('k')).toBeNull();
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'localStorage', descriptor);
      }
    }
    expect(minimalBrief()).toBeDefined();
  });
});
