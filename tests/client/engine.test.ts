// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../../src/client/lib/engineBundle');
  Reflect.deleteProperty(window, 'requestIdleCallback');
  Reflect.deleteProperty(window, 'cancelIdleCallback');
});

describe('loadEngine', () => {
  it('loads the engine once and shares the promise', async () => {
    const { loadEngine } = await import('../../src/client/lib/engine');
    const first = loadEngine();
    expect(loadEngine()).toBe(first);
    expect(typeof (await first).buildPlan).toBe('function');
  });

  it('forgets a failed load so the next call can retry', async () => {
    vi.doMock('../../src/client/lib/engineBundle', () => {
      throw new Error('chunk failed');
    });
    const { loadEngine } = await import('../../src/client/lib/engine');
    await expect(loadEngine()).rejects.toThrow();
    vi.doUnmock('../../src/client/lib/engineBundle');
    vi.resetModules();
    const retried = await import('../../src/client/lib/engine');
    await expect(retried.loadEngine()).resolves.toBeDefined();
  });
});

describe('prefetchEngine', () => {
  it('uses requestIdleCallback when the browser has it, and can cancel', async () => {
    const request = vi.fn((callback: () => void) => {
      callback();
      return 7;
    });
    const cancel = vi.fn();
    Object.assign(window, { requestIdleCallback: request, cancelIdleCallback: cancel });
    const { prefetchEngine } = await import('../../src/client/lib/engine');
    const stop = prefetchEngine();
    expect(request).toHaveBeenCalledOnce();
    stop();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('falls back to a short timer without requestIdleCallback', async () => {
    vi.useFakeTimers();
    try {
      const { prefetchEngine } = await import('../../src/client/lib/engine');
      const stop = prefetchEngine();
      vi.advanceTimersByTime(400);
      stop();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
