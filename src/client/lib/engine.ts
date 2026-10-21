import type * as EngineModule from './engineBundle';

export type Engine = typeof EngineModule;

let pending: Promise<Engine> | undefined;

/** Loads the decision engine once; later calls share the same promise. */
export function loadEngine(): Promise<Engine> {
  pending ??= import('./engineBundle').catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

/** Warms the engine chunk when the browser is idle, so the first plan appears at once. */
export function prefetchEngine(): () => void {
  const run = (): void => {
    loadEngine().catch(() => undefined);
  };
  if ('requestIdleCallback' in window) {
    const handle = window.requestIdleCallback(run);
    return () => {
      window.cancelIdleCallback(handle);
    };
  }
  const timer = setTimeout(run, 300);
  return () => {
    clearTimeout(timer);
  };
}
