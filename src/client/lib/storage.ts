import * as z from 'zod/mini';

import { type Result, err, ok } from '../../shared/result.js';
import { Plan, SCHEMA_VERSION } from '../../shared/schema/plan.js';

import { TEXT_SIZES } from './prefs';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const PLANS_KEY = 'mehfil:v1:plans';
export const OPEN_KEY = 'mehfil:v1:open';
export const PREFS_KEY = 'mehfil:v1:prefs';
/** Keeps total storage under roughly 1 MB (docs/08 §5). */
export const MAX_PLANS = 20;

export interface LoadedPlans {
  plans: Plan[];
  /** Entries thrown away because they were corrupt or from another schema version. */
  discarded: number;
}

function read(store: KeyValueStore, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

const Envelope = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  plans: z.array(z.unknown()),
});

/** Loads saved plans, validating each one with zod and discarding anything invalid. */
export function loadPlans(store: KeyValueStore): LoadedPlans {
  const raw = read(store, PLANS_KEY);
  if (raw === null) {
    return { plans: [], discarded: 0 };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { plans: [], discarded: 1 };
  }
  const envelope = Envelope.safeParse(json);
  if (!envelope.success) {
    const count = Array.isArray((json as { plans?: unknown } | null)?.plans)
      ? (json as { plans: unknown[] }).plans.length
      : 1;
    return { plans: [], discarded: Math.max(1, count) };
  }
  const parsed = envelope.data.plans.map((entry) => Plan.safeParse(entry));
  return {
    plans: parsed.flatMap((p) => (p.success ? [p.data] : [])),
    discarded: parsed.filter((p) => !p.success).length,
  };
}

/** Writes plans, newest first, evicting the oldest beyond {@link MAX_PLANS}. */
export function savePlans(
  store: KeyValueStore,
  plans: readonly Plan[],
): Result<number, 'unavailable'> {
  const kept = [...plans]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_PLANS);
  try {
    store.setItem(PLANS_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, plans: kept }));
    return ok(kept.length);
  } catch {
    return err('unavailable');
  }
}

export const loadOpenId = (store: KeyValueStore): string | undefined =>
  read(store, OPEN_KEY) ?? undefined;

export function saveOpenId(store: KeyValueStore, id: string | undefined): void {
  try {
    if (id === undefined) {
      store.removeItem(OPEN_KEY);
    } else {
      store.setItem(OPEN_KEY, id);
    }
  } catch {
    // Storage may be full or blocked; the open plan is a convenience, so ignore.
  }
}

export const Prefs = z.object({
  theme: z.nullable(z.enum(['paper', 'lamplight'])),
  textSize: z.union([z.literal(TEXT_SIZES[0]), z.literal(TEXT_SIZES[1]), z.literal(TEXT_SIZES[2])]),
});
export type Prefs = z.infer<typeof Prefs>;

export const DEFAULT_PREFS: Prefs = { theme: null, textSize: 1 };

export function loadPrefs(store: KeyValueStore): Prefs {
  const raw = read(store, PREFS_KEY);
  if (raw === null) {
    return DEFAULT_PREFS;
  }
  try {
    const parsed = Prefs.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(store: KeyValueStore, prefs: Prefs): void {
  try {
    store.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are a convenience; losing them is harmless.
  }
}

/** The browser's localStorage, or an in-memory stand-in when it is unavailable. */
export function browserStore(): KeyValueStore {
  try {
    return window.localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        memory.set(key, value);
      },
      removeItem: (key) => {
        memory.delete(key);
      },
    };
  }
}
