// Measure how often Markdoc's tree and the locator's agree, over refrakt's content.
import fg from 'fast-glob';
import { readFileSync, writeFileSync } from 'node:fs';
import { markdocEvents, locatorEvents } from './normalize.ts';

const root = new URL('../../../', import.meta.url).pathname;
const files = await fg(
  ['site/content/**/*.md', 'plan/**/*.md', 'site/staged-runes/**/*.md', 'packages/*/test/**/*.md',
   'plugins/*/**/*.md', 'packages/*/runes/**/*.md', 'site/examples/**/*.md'],
  { cwd: root, ignore: ['**/node_modules/**', '**/dist/**', '**/CHANGELOG.md'] },
);

let same = 0;
const diffs: { file: string; at: number; md: string[]; loc: string[] }[] = [];
const categories = new Map<string, number>();
for (const f of files) {
  const src = readFileSync(root + f, 'utf8');
  let a: string[], b: string[];
  try { a = markdocEvents(src); } catch (e) { categories.set('markdoc-throws', (categories.get('markdoc-throws') ?? 0) + 1); continue; }
  try { b = locatorEvents(src); } catch (e) { categories.set('locator-throws', (categories.get('locator-throws') ?? 0) + 1); diffs.push({ file: f, at: -1, md: [String(e)], loc: [] }); continue; }
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) { same++; continue; }
  const key = `${(a[i] ?? 'END').split(':')[0]} vs ${(b[i] ?? 'END').split(':')[0]}`;
  categories.set(key, (categories.get(key) ?? 0) + 1);
  diffs.push({ file: f, at: i, md: a.slice(Math.max(0, i - 2), i + 3), loc: b.slice(Math.max(0, i - 2), i + 3) });
}
console.log(`files: ${files.length}, identical: ${same} (${((100 * same) / files.length).toFixed(1)}%)`);
console.log([...categories].sort((x, y) => y[1] - x[1]).map(([k, v]) => `  ${v}\t${k}`).join('\n'));
writeFileSync(new URL('../diffs.json', import.meta.url), JSON.stringify(diffs, null, 1));
