import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const css = fs.readFileSync(path.resolve('src/client/styles/tokens.css'), 'utf8');

/** Reads `--name: #hex` declarations out of the block that starts at `selector`. */
function tokensIn(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  return Object.fromEntries(
    [...body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [
      m[1]!,
      m[2]!.toLowerCase(),
    ]),
  );
}

const paper = tokensIn(':root {');
const lamplight = tokensIn(":root[data-theme='lamplight'] {");
const mediaDark = tokensIn(':root:not([data-theme=');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const themes = { paper, lamplight } as const;
const surfaces = ['paper', 'paper-raised', 'paper-sunk'] as const;
const TEXT = 4.5;
const UI = 3;

describe.each(Object.entries(themes))('%s theme contrast', (_name, t) => {
  const get = (token: string): string => t[token] ?? '';

  it.each(['ink', 'ink-soft', 'sindoor', 'peacock', 'leaf', 'umber'])(
    '%s text reaches 4.5:1 on every paper surface',
    (token) => {
      for (const surface of surfaces) {
        expect(ratio(get(token), get(surface)), `${token} on ${surface}`).toBeGreaterThanOrEqual(
          TEXT,
        );
      }
    },
  );

  it('button text on the vermilion fill reaches 4.5:1', () => {
    expect(ratio(get('on-sindoor'), get('sindoor'))).toBeGreaterThanOrEqual(TEXT);
  });

  it('keeps the focus ring and input borders at 3:1 against every surface', () => {
    for (const surface of surfaces) {
      expect(ratio(get('peacock'), get(surface)), `focus on ${surface}`).toBeGreaterThanOrEqual(UI);
      expect(
        ratio(get('rule-strong'), get(surface)),
        `border on ${surface}`,
      ).toBeGreaterThanOrEqual(UI);
    }
  });

  it('keeps readable text on the marigold fill', () => {
    const text = t === paper ? get('ink') : get('paper');
    expect(ratio(text, get('marigold'))).toBeGreaterThanOrEqual(TEXT);
  });
});

describe('theme definitions', () => {
  it('defines the same tokens in both themes', () => {
    expect(Object.keys(lamplight).sort()).toEqual(
      Object.keys(paper)
        .filter((k) => k in lamplight)
        .sort(),
    );
    expect(Object.keys(lamplight)).toHaveLength(13);
  });

  it('repeats Lamplight for prefers-color-scheme: dark exactly', () => {
    expect(mediaDark).toEqual(lamplight);
  });

  it('keeps the dark theme warm (red channel above blue), never blue-grey', () => {
    for (const token of ['paper', 'paper-raised', 'paper-sunk', 'ink', 'ink-soft']) {
      const hex = lamplight[token] ?? '#000000';
      expect(parseInt(hex.slice(1, 3), 16)).toBeGreaterThan(parseInt(hex.slice(5, 7), 16));
    }
  });
});
