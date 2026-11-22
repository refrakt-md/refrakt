// The cost of the second parse, over refrakt's corpus: Markdoc (the reader) against the locator.
import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import { readMarkdoc } from './normalize.ts';
import { locate } from './locate.ts';
const root = new URL('../../../', import.meta.url).pathname;
const files = await fg(['site/content/**/*.md', 'plan/**/*.md'], { cwd: root, ignore: ['**/node_modules/**', '**/CHANGELOG.md'] });
const srcs = files.map((f) => readFileSync(root + f, 'utf8'));
const bytes = srcs.reduce((a, s) => a + s.length, 0);
const time = (fn: (s: string) => unknown) => { for (const s of srcs.slice(0, 50)) fn(s); const t = performance.now(); for (const s of srcs) fn(s); return performance.now() - t; };
const md = time(readMarkdoc), loc = time(locate);
console.log(`${files.length} files, ${(bytes / 1e6).toFixed(1)} MB`);
console.log(`Markdoc (reader):  ${md.toFixed(0)} ms total, ${(md / files.length).toFixed(2)} ms per file`);
console.log(`locator:           ${loc.toFixed(0)} ms total, ${(loc / files.length).toFixed(2)} ms per file (${(loc / md).toFixed(1)}x)`);
