import type { Response } from 'express';

/** Attaches the per-request id used in logs and error bodies. */
export function setRequestId(res: Response, requestId: string): void {
  Object.assign(res.locals, { requestId });
}

export function requestIdOf(res: Response): string {
  const value: unknown = res.locals.requestId;
  return typeof value === 'string' ? value : '';
}
