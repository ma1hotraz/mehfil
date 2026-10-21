import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

/** jsdom has no <dialog> modal support; emulate just enough for open/close and the close event. */
function polyfillDialog(): void {
  const proto = HTMLDialogElement.prototype;
  proto.showModal = function showModal(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };
  proto.close = function close(this: HTMLDialogElement): void {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

/** jsdom has no matchMedia; report "no match" so wide-only and dark-only branches stay off. */
function polyfillMatchMedia(): void {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }
}

if (typeof document !== 'undefined') {
  polyfillDialog();
  polyfillMatchMedia();
}

/** No test may touch the network: fetch throws unless a test stubs it. */
beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('network disabled in tests');
  });
});

afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  }
  vi.unstubAllGlobals();
});
