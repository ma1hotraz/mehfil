import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk('src').filter((f) => /\.(css|tsx?)$/.test(f));
const read = (file: string): string => fs.readFileSync(file, 'utf8');
const css = files.filter((f) => f.endsWith('.css'));
const client = files.filter((f) => f.includes(`${path.sep}client${path.sep}`));
const shared = files.filter((f) => f.includes(`${path.sep}shared${path.sep}`));

/** Lines of `file` matching `pattern`, as `file:line` strings. */
function hits(list: string[], pattern: RegExp): string[] {
  return list.flatMap((file) =>
    read(file)
      .split('\n')
      .flatMap((line, index) => (pattern.test(line) ? [`${file}:${index + 1}`] : [])),
  );
}

describe('docs/06 "Never do" list', () => {
  it('uses no gradients except commented discrete-line patterns', () => {
    const offenders = css.flatMap((file) => {
      const lines = read(file).split('\n');
      return lines.flatMap((line, i) =>
        line.includes('gradient(') &&
        !lines
          .slice(Math.max(0, i - 3), i + 1)
          .join('\n')
          .includes('discrete lines')
          ? [`${file}:${i + 1}`]
          : [],
      );
    });
    expect(offenders).toEqual([]);
  });

  it('keeps border-radius at 4px or less, except circles', () => {
    const offenders = css.flatMap((file) =>
      [...read(file).matchAll(/border-radius:\s*([^;]+);/g)].flatMap((m) => {
        const value = m[1] ?? '';
        const px = [...value.matchAll(/([\d.]+)px/g)].map((n) => Number(n[1]));
        const isCircle = /^50%$/.test(value.trim());
        return isCircle || px.every((n) => n <= 4) ? [] : [`${file}: ${value}`];
      }),
    );
    expect(offenders).toEqual([]);
  });

  it('never names banned fonts or system-ui as a visible font', () => {
    expect(hits(client, /\b(Inter|Roboto|Poppins|Montserrat)\b|system-ui/)).toEqual([]);
  });

  it('contains no emoji or pictographs', () => {
    expect(hits(files, /\p{Extended_Pictographic}/u)).toEqual([]);
  });

  it('avoids banned UI copy and exclamation marks in text', () => {
    expect(hits(client, /Oops|Awesome|Let's go|Let’s go|Unleash|Elevate|Seamless|magic/i)).toEqual(
      [],
    );
    expect(
      hits(
        client.filter((f) => f.endsWith('.tsx')),
        />[^<>{}]*[A-Za-z]!\s*</,
      ),
    ).toEqual([]);
  });

  it('has no blur, glow or backdrop filters', () => {
    expect(hits(css, /backdrop-filter|filter:\s*blur|text-shadow/)).toEqual([]);
    expect(hits(css, /box-shadow:\s*[^;]*\d+px\s+\d+px\s+[1-9]\d*px/)).toEqual([]);
  });
});

describe('security and purity guards', () => {
  it('never uses dangerouslySetInnerHTML or unsafe CSP keywords', () => {
    expect(hits(files, /dangerouslySetInnerHTML|unsafe-inline|unsafe-eval/)).toEqual([]);
  });

  it('keeps the shared engine free of clocks, randomness and network calls', () => {
    expect(hits(shared, /Date\.now\(|Math\.random\(|\bfetch\(|new Date\(\)|crypto\./)).toEqual([]);
  });

  it('never references the Gemini key from client code', () => {
    expect(hits(client, /GEMINI_API_KEY|GEMINI_MODEL|AIza|VITE_/)).toEqual([]);
  });

  it('uses no console calls in src (use the logger)', () => {
    expect(hits(files, /\bconsole\./)).toEqual([]);
  });
});
