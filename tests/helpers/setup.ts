import { afterEach, beforeEach, vi } from 'vitest';

/** No test may touch the network: node tests get a fetch that throws unless a test stubs it. */
beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('network disabled in tests');
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
