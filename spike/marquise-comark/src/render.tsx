import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { parseMarkdown } from 'comark';
import { MarkdownDocument } from '@comark/react';
import { loadShapes } from './shapes.ts';
import { marquise, type Finding } from './plugin.ts';
import { plain } from './plain.ts';
import { Hero } from '../components/Hero.tsx';

const shapes = loadShapes('shapes');
const findings: Finding[] = [];
const doc = await parseMarkdown(readFileSync('content/home.md', 'utf8'), {
	plugins: [marquise(shapes, findings)()],
});

const bound: Record<string, unknown> = { hero: Hero };
const components = Object.fromEntries(
	Object.values(shapes).map((s) => [s.name, bound[s.name] ?? plain(s)]),
);

console.log('--- with components (hero bound, callout plain):');
console.log(renderToString(createElement(MarkdownDocument, { value: doc, components } as any)));
console.log('\n--- with no components registered at all:');
console.log(renderToString(createElement(MarkdownDocument, { value: doc } as any)));
