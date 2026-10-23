import { ApiError } from '@google/genai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const generateContent = vi.fn();

vi.mock('@google/genai', async (importActual) => {
  const actual = await importActual<typeof import('@google/genai')>();
  class FakeGoogleGenAI {
    models = { generateContent };
  }
  return { ...actual, GoogleGenAI: FakeGoogleGenAI };
});

const { GeminiClient } = await import('../../../src/server/ai/client.js');

const ok = (
  text: string | undefined,
  usage = { promptTokenCount: 10, candidatesTokenCount: 5 },
) => ({
  text,
  usageMetadata: usage,
});
const apiError = (status: number) => new ApiError({ message: 'upstream', status });
const args = (signal = new AbortController().signal) => ({
  system: 'sys',
  prompt: 'prompt',
  schema: { type: 'object' },
  maxOutputTokens: 100,
  signal,
});

describe('GeminiClient', () => {
  beforeEach(() => {
    generateContent.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends structured-output config and returns parsed JSON, reporting usage', async () => {
    generateContent.mockResolvedValue(ok('{"ideas":[]}'));
    const onUsage = vi.fn();
    const client = new GeminiClient({ apiKey: 'k', model: 'm', onUsage });
    await expect(client.generateJson(args())).resolves.toEqual({ ideas: [] });
    const call = generateContent.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call).toMatchObject({
      model: 'm',
      config: {
        systemInstruction: 'sys',
        responseMimeType: 'application/json',
        maxOutputTokens: 100,
        responseJsonSchema: { type: 'object' },
      },
    });
    expect(onUsage).toHaveBeenCalledWith({ promptTokens: 10, outputTokens: 5 });
    expect(client.enabled).toBe(true);
  });

  it('works without a usage callback', async () => {
    generateContent.mockResolvedValue(ok('{}'));
    await expect(
      new GeminiClient({ apiKey: 'k', model: 'm' }).generateJson(args()),
    ).resolves.toEqual({});
  });

  it('retries once on 429 or 5xx', async () => {
    generateContent.mockRejectedValueOnce(apiError(429)).mockResolvedValueOnce(ok('{"a":1}'));
    const pending = new GeminiClient({ apiKey: 'k', model: 'm' }).generateJson(args());
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual({ a: 1 });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('gives up after the single retry fails', async () => {
    generateContent.mockRejectedValue(apiError(503));
    const pending = new GeminiClient({ apiKey: 'k', model: 'm' }).generateJson(args());
    const assertion = expect(pending).rejects.toBeInstanceOf(ApiError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('does not retry client errors, unknown errors or aborted calls', async () => {
    const client = new GeminiClient({ apiKey: 'k', model: 'm' });
    generateContent.mockRejectedValueOnce(apiError(401));
    await expect(client.generateJson(args())).rejects.toBeInstanceOf(ApiError);
    generateContent.mockRejectedValueOnce(new Error('network'));
    await expect(client.generateJson(args())).rejects.toThrow('network');
    const controller = new AbortController();
    controller.abort();
    generateContent.mockRejectedValueOnce(apiError(500));
    await expect(client.generateJson(args(controller.signal))).rejects.toBeInstanceOf(ApiError);
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it('drops the thinking parameter after a 400 instead of downgrading the model', async () => {
    generateContent.mockRejectedValueOnce(apiError(400)).mockResolvedValueOnce(ok('{"b":2}'));
    await expect(
      new GeminiClient({ apiKey: 'k', model: 'm' }).generateJson(args()),
    ).resolves.toEqual({ b: 2 });
    const [first, second] = generateContent.mock.calls.map(
      (c) => (c[0] as { config: Record<string, unknown> }).config,
    );
    expect(first).toHaveProperty('thinkingConfig');
    expect(second).not.toHaveProperty('thinkingConfig');
  });

  it('propagates rejection when the 400 thinking downgrade fallback fails', async () => {
    generateContent.mockRejectedValueOnce(apiError(400)).mockRejectedValueOnce(apiError(400));
    await expect(
      new GeminiClient({ apiKey: 'k', model: 'm' }).generateJson(args()),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('honours custom maxRetries option', async () => {
    generateContent
      .mockRejectedValueOnce(apiError(429))
      .mockRejectedValueOnce(apiError(429))
      .mockResolvedValueOnce(ok('{"c":3}'));
    const client = new GeminiClient({ apiKey: 'k', model: 'm', maxRetries: 2 });
    const pending = client.generateJson(args());
    await vi.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toEqual({ c: 3 });
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it('aborts backoff immediately when signal aborts during delay', async () => {
    const controller = new AbortController();
    generateContent.mockRejectedValue(apiError(429));
    const client = new GeminiClient({ apiKey: 'k', model: 'm', maxRetries: 2 });
    const pending = client.generateJson(args(controller.signal));
    await vi.advanceTimersByTimeAsync(100);
    controller.abort(new Error('aborted-in-wait'));
    await expect(pending).rejects.toThrow('aborted-in-wait');
  });

  it('rejects an empty response body', async () => {
    generateContent.mockResolvedValue(ok(undefined));
    await expect(
      new GeminiClient({ apiKey: 'k', model: 'm' }).generateJson(args()),
    ).rejects.toBeInstanceOf(SyntaxError);
  });
});
