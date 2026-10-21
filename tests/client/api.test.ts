// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { askPlanner, fetchIdeas } from '../../src/client/lib/api';
import { buildDigest } from '../../src/shared/engine/digest.js';
import { buildPlan } from '../../src/shared/engine/index.js';
import { ananya, fixedToday } from '../fixtures/briefs';

const ideasRequest = { brief: ananya, focus: 'all' as const, exclude: [] };
const reply =
  (status: number, body: unknown) =>
  (..._args: Parameters<typeof fetch>) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('fetchIdeas', () => {
  it('posts JSON and validates the response', async () => {
    const fetchImpl = vi.fn(reply(200, { ideas: [], source: 'library' }));
    const result = await fetchIdeas(ideasRequest, { fetchImpl });
    expect(result).toEqual({ ok: true, value: { ideas: [], source: 'library' } });
    const [path, init] = fetchImpl.mock.calls[0] ?? [];
    expect(path).toBe('/api/ideas');
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const sent = typeof init?.body === 'string' ? init.body : '';
    expect(JSON.parse(sent)).toMatchObject({ focus: 'all' });
  });

  it.each([
    [429, 'rate_limited'],
    [400, 'invalid'],
    [413, 'invalid'],
    [415, 'invalid'],
    [500, 'server'],
    [503, 'server'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    expect(await fetchIdeas(ideasRequest, { fetchImpl: reply(status, {}) })).toEqual({
      ok: false,
      error: { kind },
    });
  });

  it('rejects responses that do not match the schema', async () => {
    const result = await fetchIdeas(ideasRequest, { fetchImpl: reply(200, { ideas: 'nope' }) });
    expect(result).toEqual({ ok: false, error: { kind: 'server' } });
  });

  it('reports network failures without throwing', async () => {
    const fetchImpl = () => Promise.reject(new TypeError('offline'));
    expect(await fetchIdeas(ideasRequest, { fetchImpl })).toEqual({
      ok: false,
      error: { kind: 'network' },
    });
  });

  it('times out slow calls and relays the caller’s abort', async () => {
    const hang = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    expect(await fetchIdeas(ideasRequest, { fetchImpl: hang, timeoutMs: 10 })).toEqual({
      ok: false,
      error: { kind: 'timeout' },
    });
    const controller = new AbortController();
    const pending = fetchIdeas(ideasRequest, { fetchImpl: hang, signal: controller.signal });
    controller.abort();
    expect(await pending).toEqual({ ok: false, error: { kind: 'network' } });
  });
});

describe('askPlanner', () => {
  it('posts the question and validates the answer', async () => {
    const plan = buildPlan(ananya, fixedToday);
    const fetchImpl = vi.fn(reply(200, { answer: 'Hello', suggestedActions: [], source: 'rules' }));
    const result = await askPlanner(
      { brief: ananya, plan: buildDigest(plan, fixedToday), history: [], question: 'Hi' },
      { fetchImpl },
    );
    expect(result.ok && result.value.answer).toBe('Hello');
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/assistant');
  });
});
