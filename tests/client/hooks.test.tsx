// @vitest-environment jsdom
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnouncerProvider, useAnnouncer } from '../../src/client/lib/useAnnouncer';
import { fetchIdeas as realFetchIdeas } from '../../src/client/lib/api';
import { loadEngine } from '../../src/client/lib/engine';
import { usePlans } from '../../src/client/lib/usePlans';
import { usePreferences } from '../../src/client/lib/usePreferences';
import { OPEN_KEY, PLANS_KEY, PREFS_KEY, type KeyValueStore } from '../../src/client/lib/storage';
import type { IdeasResponse } from '../../src/shared/schema/ai.js';
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

describe('AnnouncerProvider', () => {
  function Speaker({ message, level }: { message: string; level?: 'polite' | 'assertive' }) {
    const announce = useAnnouncer();
    return (
      <button
        type="button"
        onClick={() => {
          announce(message, level);
        }}
      >
        say
      </button>
    );
  }

  it('mounts both live regions and announces politely or assertively', () => {
    vi.useFakeTimers();
    try {
      render(
        <AnnouncerProvider>
          <Speaker message="Plan saved" />
          <Speaker message="Could not save" level="assertive" />
        </AnnouncerProvider>,
      );
      const [polite, assertive] = [
        screen.getByTestId('live-polite'),
        screen.getByTestId('live-assertive'),
      ];
      expect(polite).toHaveAttribute('aria-live', 'polite');
      expect(assertive).toHaveAttribute('aria-live', 'assertive');
      const [first, second] = screen.getAllByRole('button');
      act(() => {
        first?.click();
        second?.click();
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(polite).toHaveTextContent('Plan saved');
      expect(assertive).toHaveTextContent('Could not save');
    } finally {
      vi.useRealTimers();
    }
  });

  it('is silent without a provider', () => {
    const { result } = renderHook(() => useAnnouncer());
    const announce = result.current;
    announce('nothing');
    expect(typeof announce).toBe('function');
  });

  it('ignores empty or whitespace-only announcements', () => {
    const { result } = renderHook(() => useAnnouncer(), {
      wrapper: AnnouncerProvider,
    });
    result.current('   ');
    expect(screen.getByTestId('live-polite')).toBeEmptyDOMElement();
  });
});

describe('usePreferences', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--text-scale');
  });

  const matchMedia = (dark: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: dark && query.includes('dark'),
      media: query,
    }));

  it('follows the system theme until the user chooses', () => {
    matchMedia(true);
    const store = memoryStore();
    const { result } = renderHook(() => usePreferences(store));
    expect(result.current.theme).toBe('lamplight');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(store.data.has(PREFS_KEY)).toBe(false);
  });

  it('applies and persists the chosen theme and text size', () => {
    matchMedia(false);
    const store = memoryStore();
    const { result } = renderHook(() => usePreferences(store));
    expect(result.current.theme).toBe('paper');
    act(() => {
      result.current.setTheme('lamplight');
    });
    act(() => {
      result.current.setTextSize(1.3);
    });
    expect(document.documentElement.dataset.theme).toBe('lamplight');
    expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('1.3');
    expect(JSON.parse(store.data.get(PREFS_KEY) ?? '{}')).toEqual({
      theme: 'lamplight',
      textSize: 1.3,
    });
    const again = renderHook(() => usePreferences(store));
    expect(again.result.current).toMatchObject({ theme: 'lamplight', textSize: 1.3 });
  });
});

describe('usePlans', () => {
  const library: IdeasResponse = { ideas: [], source: 'library' };
  const fetchOk = vi.fn<typeof realFetchIdeas>(() =>
    Promise.resolve({
      ok: true as const,
      value: {
        ...library,
        source: 'gemini' as const,
        ideas: [
          {
            id: 'idea-1',
            category: 'theme' as const,
            title: 'From server',
            description: 'd',
            costBand: 2 as const,
            fitsBecause: 'f',
            saved: false,
          },
        ],
      },
    }),
  );
  const fetchDown = vi.fn<typeof realFetchIdeas>(() =>
    Promise.resolve({ ok: false as const, error: { kind: 'network' as const } }),
  );
  const announce = vi.fn();
  let store: ReturnType<typeof memoryStore>;
  let counter = 0;

  beforeEach(() => {
    store = memoryStore();
    counter = 0;
    announce.mockClear();
    fetchOk.mockClear();
    fetchDown.mockClear();
  });

  const setup = (fetchIdeas: typeof realFetchIdeas = fetchOk, existing = store) =>
    renderHook(() =>
      usePlans({
        store: existing,
        announce,
        today: () => fixedToday,
        now: () => `2026-10-21T10:00:0${counter++ % 10}.000Z`,
        newId: () => `plan-${counter}`,
        fetchIdeas,
      }),
    );

  /** Runs `fn` inside act and waits for the lazily loaded engine and any follow-up work. */
  const run = async (fn: () => unknown): Promise<void> => {
    await act(async () => {
      await fn();
      await loadEngine();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  it('creates a plan, announces it and loads ideas from the server', async () => {
    const { result } = setup();
    await run(() => result.current.create(ananya));
    expect(result.current.plan?.brief.city).toBe('Jaipur');
    expect(announce).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Your almanac is ready\. \d+ notices, 23 tasks, 11 vendors\. Ideas are being drafted\.$/,
      ),
    );
    await waitFor(() => {
      expect(result.current.plan?.ideasSource).toBe('gemini');
    });
    expect(result.current.plan?.ideas[0]?.title).toBe('From server');
    expect(result.current.ideasLoading).toBe(false);
    expect(announce).toHaveBeenCalledWith('1 idea added, from Gemini.');
  });

  it('falls back to the local library when the server is unreachable', async () => {
    const { result } = setup(fetchDown);
    await run(() => result.current.create(ananya));
    await waitFor(() => {
      expect(result.current.plan?.ideasSource).toBe('library');
    });
    expect(result.current.plan?.ideas.length).toBeGreaterThanOrEqual(6);
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('from the Mehfil library'));
  });

  it('persists after the debounce and flushes on pagehide', async () => {
    const { result } = setup(fetchDown);
    await run(() => result.current.create(ananya));
    expect(store.data.has(PLANS_KEY)).toBe(false);
    await waitFor(() => {
      expect(store.data.has(PLANS_KEY)).toBe(true);
    });
    expect(announce).toHaveBeenCalledWith('Plan saved on this device.');
    await run(() => {
      result.current.toggleTask('book-venue');
    });
    // Second debounce within 10s runs flush but skips the announcement (false branch)
    await waitFor(() => {
      const saved = JSON.parse(store.data.get(PLANS_KEY) ?? '{}') as {
        plans: { timeline: { id: string; done: boolean }[] }[];
      };
      expect(saved.plans[0]?.timeline.find((m) => m.id === 'book-venue')?.done).toBe(true);
    });
    expect(
      announce.mock.calls.filter(([msg]) => msg === 'Plan saved on this device.'),
    ).toHaveLength(1);
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
  });

  it('restores the open plan from storage (refresh)', async () => {
    const first = setup(fetchDown);
    await run(() => first.result.current.create(ananya));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(store.data.get(OPEN_KEY)).toBeDefined();
    const second = setup(fetchDown);
    expect(second.result.current.plan?.brief.title).toBe('Ananya & Kabir');
    expect(second.result.current.plans).toHaveLength(1);
  });

  it('edits the ledger, tasks and vendors with announcements', async () => {
    const { result } = setup(fetchDown);
    await run(() => result.current.create(ananya));
    announce.mockClear();
    await run(() => {
      result.current.step('unknown-category' as never, 1);
    });
    await run(() => {
      result.current.step('photo', 0.5);
    });
    expect(result.current.plan?.ledger.find((l) => l.id === 'photo')?.percent).toBe(10.5);
    expect(announce).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Photo & video now 10\.5 percent, ₹.* Other categories adjusted\. Total unchanged\.$/,
      ),
    );
    await run(() => {
      result.current.setPercent('photo', 12);
    });
    expect(result.current.plan?.ledger.find((l) => l.id === 'photo')?.percent).toBe(12);
    await run(() => {
      result.current.resetLedger();
    });
    expect(result.current.plan?.ledger.find((l) => l.id === 'photo')?.percent).toBe(10);
    expect(announce).toHaveBeenCalledWith('Budget reset to the recommended split.');
    await run(() => {
      result.current.setCommitted('venue', 100);
    });
    expect(result.current.plan?.ledger.find((l) => l.id === 'venue')?.committedMinor).toBe(100);
    await run(() => {
      result.current.toggleTask('book-venue');
    });
    expect(announce).toHaveBeenCalledWith(
      expect.stringMatching(/^Book the venue marked done\. \d+ tasks remain\.$/),
    );
    await run(() => {
      result.current.toggleTask('book-venue');
    });
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('marked not done'));
    await run(() => {
      result.current.setVendorStatus('caterer', 'booked');
    });
    expect(announce).toHaveBeenCalledWith('Caterer marked booked.');
    await run(() => {
      result.current.setVendorContact('caterer', { name: 'Sharma' });
    });
    expect(result.current.plan?.vendors.find((v) => v.id === 'caterer')?.contact?.name).toBe(
      'Sharma',
    );
  });

  it('ignores edits for unknown ids and when nothing is open', async () => {
    const { result } = setup(fetchDown);
    await run(() => {
      result.current.step('photo', 0.5);
      result.current.toggleTask('x');
      result.current.setVendorStatus('x', 'paid');
      result.current.requestIdeas('food');
      result.current.setPercent('photo', 5);
      result.current.resetLedger();
    });
    expect(result.current.plan).toBeUndefined();
    expect(await result.current.editBrief(ananya)).toBeUndefined();
    expect(
      await result.current.applyPlannerAction({
        type: 'markVendor',
        vendorId: 'caterer',
        status: 'paid',
        rationale: '',
      }),
    ).toEqual({ error: 'Open a plan first.' });
    await run(() => result.current.create(ananya));
    await run(() => {
      result.current.step('safety', 1);
      result.current.toggleTask('nope');
      result.current.setVendorStatus('nope', 'paid');
    });
    expect(result.current.plan?.ledger.some((l) => l.id === 'safety')).toBe(false);
  });

  it('edits the brief while keeping progress', async () => {
    const { result } = setup(fetchDown);
    await run(() => result.current.create(ananya));
    await run(() => {
      result.current.toggleTask('book-venue');
    });
    await run(() => {
      result.current.setVendorStatus('caterer', 'booked');
    });
    await run(() => result.current.editBrief({ ...ananya, guestCount: 300 }));
    expect(result.current.plan?.brief.guestCount).toBe(300);
    expect(result.current.plan?.timeline.find((m) => m.id === 'book-venue')?.done).toBe(true);
    expect(result.current.plan?.vendors.find((v) => v.id === 'caterer')?.status).toBe('booked');
    expect(result.current.plans).toHaveLength(1);
    await waitFor(() => {
      expect(result.current.ideasLoading).toBe(false);
    });
  });

  it('applies planner actions through the engine, reporting notices and errors', async () => {
    const { result } = setup(fetchDown);
    await run(() => result.current.create(ananya));
    let outcome: Awaited<ReturnType<typeof result.current.applyPlannerAction>> | undefined;
    await run(async () => {
      outcome = await result.current.applyPlannerAction({
        type: 'markVendor',
        vendorId: 'caterer',
        status: 'paid',
        rationale: '',
      });
    });
    expect(outcome).toEqual({ notice: 'Caterer marked paid.' });
    await run(async () => {
      outcome = await result.current.applyPlannerAction({
        type: 'markVendor',
        vendorId: 'ghost',
        status: 'paid',
        rationale: '',
      });
    });
    expect(outcome).toHaveProperty('error');
    expect(result.current.plan?.vendors.find((v) => v.id === 'caterer')?.status).toBe('paid');
  });

  it('keeps ideas saved, requests focused ideas, and manages the shelf', async () => {
    const { result } = setup(fetchDown);
    await run(() => result.current.create(ananya));
    await waitFor(() => {
      expect(result.current.plan?.ideas.length).toBeGreaterThan(0);
    });
    const first = result.current.plan?.ideas[0];
    await run(() => {
      result.current.toggleIdeaSaved(first?.id ?? '');
    });
    expect(result.current.plan?.ideas.find((i) => i.id === first?.id)?.saved).toBe(true);
    await run(() => {
      result.current.requestIdeas('food');
    });
    await waitFor(() => {
      expect(result.current.ideasLoading).toBe(false);
    });
    expect(result.current.plan?.ideas.find((i) => i.id === first?.id)?.saved).toBe(true);
    await run(() => result.current.create(minimalBrief({ title: 'Second' })));
    expect(result.current.plans).toHaveLength(2);
    const firstId = result.current.plans[1]?.id ?? '';
    await run(() => {
      result.current.open(firstId);
    });
    expect(result.current.plan?.id).toBe(firstId);
    await run(() => {
      result.current.close();
    });
    expect(result.current.plan).toBeUndefined();
    await run(() => {
      result.current.remove(firstId);
    });
    expect(result.current.plans).toHaveLength(1);
  });

  it('reports plans discarded at start-up', () => {
    store.setItem(PLANS_KEY, '{bad');
    const { result } = setup(fetchDown, store);
    expect(result.current.discarded).toBe(1);
    expect(result.current.plans).toEqual([]);
  });

  it('ignores an ideas response that arrives after it was superseded', async () => {
    let release: (value: Awaited<ReturnType<typeof fetchOk>>) => void = () => undefined;
    const slow = vi.fn<typeof realFetchIdeas>(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { result } = setup(slow);
    await run(() => result.current.create(ananya));
    const firstRelease = release;
    await run(() => {
      result.current.requestIdeas('food');
    });
    await act(async () => {
      firstRelease(await fetchOk({ brief: ananya, focus: 'all', exclude: [] }));
      await Promise.resolve();
    });
    expect(result.current.plan?.ideasSource).toBe('pending');
    expect(result.current.ideasLoading).toBe(true);
  });
});

describe('wrapper', () => {
  it('renders hooks inside providers', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AnnouncerProvider>{children}</AnnouncerProvider>
    );
    const { result } = renderHook(() => useAnnouncer(), { wrapper });
    expect(typeof result.current).toBe('function');
  });
});
