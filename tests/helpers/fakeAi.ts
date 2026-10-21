import type { AiClient, GenerateArgs } from '../../src/server/ai/client.js';

type Responder = (args: GenerateArgs, call: number) => unknown;

/** Scriptable AI client: canned JSON, malformed output, slow responses or throws. */
export class FakeAiClient implements AiClient {
  readonly calls: GenerateArgs[] = [];

  constructor(
    private readonly responder: Responder = () => ({}),
    readonly enabled = true,
  ) {}

  async generateJson(args: GenerateArgs): Promise<unknown> {
    this.calls.push(args);
    return await this.responder(args, this.calls.length);
  }
}

/** Resolves after `ms`, or rejects with an AbortError as soon as the signal fires. */
export function slow(ms: number, value: unknown, signal: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(value);
    }, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });
}

/** A rejection that is not an Error object, to exercise the defensive branches. */
export function rejectWithNonError(): Promise<never> {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- deliberately not an Error
  return Promise.reject('plain string');
}
