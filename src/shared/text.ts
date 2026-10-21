/** Prompt delimiters from docs/05; must never survive inside user text. */
const DELIMITERS = /<<<|>>>/g;
/** Zero-width and bidi-override characters that can hide instructions from a human reader. */
const INVISIBLES = new RegExp('[\u200B\u2060\uFEFF\u202A-\u202E\u2066-\u2069]', 'g');

function stripDelimiters(text: string): string {
  let current = text;
  let next = current.replace(DELIMITERS, '');
  while (next !== current) {
    current = next;
    next = current.replace(DELIMITERS, '');
  }
  return current;
}

/**
 * Makes untrusted text safe to embed in a prompt or UI: NFC-normalises, drops control and
 * invisible characters (newlines kept), removes prompt delimiters, collapses whitespace and
 * clamps to `max` code points.
 * @example sanitizeText('  hi <<<DATA  there ', 20) // 'hiDATA there'
 */
export function sanitizeText(input: string, max: number): string {
  const cleaned = stripDelimiters(
    input
      .normalize('NFC')
      .replace(INVISIBLES, '')
      .replace(/\p{Cc}/gu, (char) => (char === '\n' ? char : char === '\t' ? ' ' : '')),
  )
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return Array.from(cleaned).slice(0, Math.max(0, max)).join('').trim();
}
