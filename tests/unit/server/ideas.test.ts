import { describe, expect, it } from 'vitest';

import { TtlCache } from '../../../src/server/ai/cache.js';
import {
  type IdeasDeps,
  cleanModelIdeas,
  generateIdeas,
  ideasCacheKey,
} from '../../../src/server/ai/ideas.js';
import { silentLogger } from '../../../src/server/logger.js';
import { IdeasRequest, type IdeasResponse } from '../../../src/shared/schema/ai.js';
import { ananya, minimalBrief } from '../../fixtures/briefs.js';
import { FakeAiClient, rejectWithNonError, slow } from '../../helpers/fakeAi.js';

const OTHER_CATEGORIES = ['decor', 'food', 'activities', 'favors', 'inclusion'] as const;
const idea = (n: number, over: Record<string, unknown> = {}) => ({
  category: n === 0 ? 'theme' : OTHER_CATEGORIES[n % OTHER_CATEGORIES.length],
  title: `Idea number ${n}`,
  description: `A specific description for idea ${n}.`,
  costBand: 2,
  fitsBecause: 'Fits the outdoor May ceremony.',
  ...over,
});
const batch = (count: number) => ({ ideas: Array.from({ length: count }, (_, i) => idea(i)) });

const deps = (ai: FakeAiClient, timeoutMs = 1000): IdeasDeps => ({
  ai,
  cache: new TtlCache<IdeasResponse>(10, 60_000),
  inflight: new Map(),
  logger: silentLogger,
  timeoutMs,
});
const request = (over: Record<string, unknown> = {}, brief = ananya) =>
  IdeasRequest.parse({ brief, ...over });

describe('generateIdeas with a working model', () => {
  it('returns validated ideas with ids and source gemini', async () => {
    const result = await generateIdeas(deps(new FakeAiClient(() => batch(8))), request());
    expect(result.source).toBe('gemini');
    expect(result.ideas).toHaveLength(8);
    expect(result.ideas[0]).toMatchObject({
      id: expect.stringMatching(/^idea-/) as string,
      saved: false,
    });
  });

  it('drops ideas carrying URLs, emails or phone numbers', async () => {
    const dirty = {
      ideas: [
        idea(0),
        idea(1, { description: 'See https://x.example for more' }),
        idea(2, { title: 'Mail a@b.co' }),
        idea(3, { fitsBecause: 'Call 98765 43210 now' }),
        idea(4),
        idea(5),
        idea(6),
        idea(7),
      ],
    };
    const result = await generateIdeas(deps(new FakeAiClient(() => dirty)), request());
    expect(result.ideas.map((i) => i.title)).not.toContain('Mail a@b.co');
    expect(result.ideas.some((i) => /https|98765/.test(i.description + i.fitsBecause))).toBe(false);
  });

  it('removes nut ideas for a nut allergy and tops up to at least six', async () => {
    const nut = minimalBrief({ dietary: ['nut-allergy'], guestCount: 60 });
    const output = {
      ideas: [
        idea(0, { title: 'Almond barfi', description: 'Sweet almond squares.' }),
        idea(1),
        idea(2),
        idea(3),
        idea(4),
      ],
    };
    const result = await generateIdeas(deps(new FakeAiClient(() => output)), request({}, nut));
    expect(result.ideas.map((i) => i.title)).not.toContain('Almond barfi');
    expect(result.ideas.length).toBeGreaterThanOrEqual(6);
    expect(result.source).toBe('gemini');
  });

  it('labels the set "library" when the model supplied fewer than four usable ideas', async () => {
    const result = await generateIdeas(deps(new FakeAiClient(() => batch(2))), request());
    expect(result.source).toBe('library');
    expect(result.ideas.length).toBeGreaterThanOrEqual(6);
  });

  it('removes duplicate titles, repeated excludes and extra themes', async () => {
    const output = {
      ideas: [
        idea(0, { category: 'theme' }),
        idea(1, { title: 'idea number 0' }),
        idea(2, { category: 'theme', title: 'Second theme' }),
        idea(3),
        idea(4),
        idea(5),
        idea(6, { title: 'Avoid me' }),
      ],
    };
    const result = await generateIdeas(
      deps(new FakeAiClient(() => output)),
      request({ exclude: ['avoid ME'] }),
    );
    const titles = result.ideas.map((i) => i.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles).not.toContain('avoid me');
    expect(
      result.ideas.filter((i) => i.category === 'theme' && i.title.startsWith('Idea')).length,
    ).toBeLessThanOrEqual(1);
    expect(titles).not.toContain('second theme');
  });

  it('supports a focused "more like this" request', async () => {
    const out = { ideas: [idea(2), idea(8, { category: 'food' })] };
    const result = await generateIdeas(
      deps(new FakeAiClient(() => out)),
      request({ focus: 'food' }),
    );
    expect(result.source).toBe('gemini');
    expect(result.ideas).toHaveLength(2);
  });

  it('clamps the cost band into 1..3', () => {
    const [first] = cleanModelIdeas([{ ...idea(0), costBand: 3 } as never], request());
    expect(first?.costBand).toBe(3);
  });

  it('sanitises delimiters out of model text', () => {
    const [first] = cleanModelIdeas(
      [{ ...idea(0), description: 'Use <<<DATA tricks>>> here' } as never],
      request(),
    );
    expect(first?.description).not.toMatch(/<<<|>>>/);
  });

  it('drops ideas whose text is empty after sanitising', () => {
    expect(cleanModelIdeas([{ ...idea(0), title: '<<<>>>' } as never], request())).toEqual([]);
  });
});

describe('generateIdeas fallbacks', () => {
  it.each([
    ['malformed JSON shape', () => 'not an object'],
    ['schema mismatch', () => ({ ideas: [{ nope: true }] })],
    [
      'a thrown error',
      () => {
        throw new Error('boom');
      },
    ],
  ])('uses the library on %s', async (_name, responder) => {
    const result = await generateIdeas(deps(new FakeAiClient(responder)), request());
    expect(result.source).toBe('library');
    expect(result.ideas.length).toBeGreaterThanOrEqual(6);
  });

  it('uses the library when the call times out (signal aborted)', async () => {
    const client = new FakeAiClient((args) => slow(500, batch(8), args.signal));
    const result = await generateIdeas(deps(client, 20), request());
    expect(result.source).toBe('library');
    expect(client.calls[0]?.signal.aborted).toBe(true);
  });

  it('does not call a disabled client', async () => {
    const client = new FakeAiClient(() => batch(8), false);
    const result = await generateIdeas(deps(client), request({ focus: 'decor' }));
    expect(result.source).toBe('library');
    expect(client.calls).toHaveLength(0);
  });

  it('falls back to category library count when model throws on a category focus', async () => {
    const client = new FakeAiClient(() => {
      throw new Error('boom');
    });
    const result = await generateIdeas(deps(client), request({ focus: 'decor' }));
    expect(result.source).toBe('library');
    expect(result.ideas.length).toBeGreaterThanOrEqual(1);
  });

  it('does not cache failures', async () => {
    const client = new FakeAiClient((_a, call) => (call === 1 ? 'bad' : batch(8)));
    const d = deps(client);
    expect((await generateIdeas(d, request())).source).toBe('library');
    expect((await generateIdeas(d, request())).source).toBe('gemini');
  });

  it('reports non-Error rejections without crashing', async () => {
    const client = new FakeAiClient(() => rejectWithNonError());
    expect((await generateIdeas(deps(client), request())).source).toBe('library');
  });
});

describe('caching and de-duplication', () => {
  it('serves a repeat request from the cache without calling the model again', async () => {
    const client = new FakeAiClient(() => batch(8));
    const d = deps(client);
    const first = await generateIdeas(d, request());
    const second = await generateIdeas(d, request());
    expect(second).toEqual(first);
    expect(client.calls).toHaveLength(1);
  });

  it('shares one model call between identical in-flight requests', async () => {
    const client = new FakeAiClient((args) => slow(30, batch(8), args.signal));
    const d = deps(client);
    const [a, b] = await Promise.all([generateIdeas(d, request()), generateIdeas(d, request())]);
    expect(client.calls).toHaveLength(1);
    expect(a).toEqual(b);
    expect(d.inflight.size).toBe(0);
  });

  it('keys differ by focus, exclude and brief', () => {
    const base = ideasCacheKey(request());
    expect(ideasCacheKey(request({ focus: 'food' }))).not.toBe(base);
    expect(ideasCacheKey(request({ exclude: ['x'] }))).not.toBe(base);
    expect(ideasCacheKey(request({}, minimalBrief()))).not.toBe(base);
    expect(ideasCacheKey(request())).toBe(base);
  });
});
