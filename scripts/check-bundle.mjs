// Fails the build when the client bundle exceeds the budgets in docs/11_PERFORMANCE.md.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist/client';
const KB = 1024;
const BUDGETS = { initialJs: 95, totalJs: 160, css: 20, fonts: 180 };

const gz = (file) => gzipSync(readFileSync(file)).length / KB;
const raw = (file) => statSync(file).size / KB;

const assets = readdirSync(join(DIST, 'assets')).map((name) => join(DIST, 'assets', name));
const byExt = (ext) => assets.filter((file) => file.endsWith(ext));

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const referenced = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) =>
  join(DIST, m[1]),
);

const initialJs = referenced.reduce((sum, file) => sum + gz(file), 0);
const totalJs = byExt('.js').reduce((sum, file) => sum + gz(file), 0);
const css = byExt('.css').reduce((sum, file) => sum + gz(file), 0);
const fonts = byExt('.woff2').reduce((sum, file) => sum + raw(file), 0);

const rows = [
  ['Initial JS (gzip)', initialJs, BUDGETS.initialJs],
  ['Total JS (gzip)', totalJs, BUDGETS.totalJs],
  ['CSS (gzip)', css, BUDGETS.css],
  ['Fonts (woff2)', fonts, BUDGETS.fonts],
];

let failed = false;
for (const [label, value, budget] of rows) {
  const ok = value <= budget;
  failed ||= !ok;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(18)} ${value.toFixed(1).padStart(7)} kB  (budget ${budget} kB)`,
  );
}
console.log(`     ${byExt('.js').length} JS chunks (lazy tabs and engine are separate files)`);

const key = readdirSync(join(DIST, 'assets'))
  .filter((name) => name.endsWith('.js'))
  .some((name) =>
    /AIza[0-9A-Za-z_-]{35}|GEMINI_API_KEY/.test(readFileSync(join(DIST, 'assets', name), 'utf8')),
  );
if (key) {
  console.log('FAIL the client bundle mentions the Gemini key');
  failed = true;
}
process.exit(failed ? 1 : 0);
