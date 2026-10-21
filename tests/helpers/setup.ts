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

if (typeof document !== 'undefined') {
  polyfillDialog();
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
