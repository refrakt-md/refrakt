import { readFileSync } from 'node:fs';
import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { parseMarkdown } from 'comark';
import { MarkdownDocument } from '@comark/react';
import { loadShapes, type Shape } from './shapes.ts';
import { marquise, type Finding } from './plugin.ts';
import { Hero } from '../components/Hero.tsx';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** SPEC-199 decision 3: the plain presentation, for a shape with no component. */
function plain(shape: Shape) {
	return function Plain(props: Record<string, unknown>) {
		const attrs: Record<string, unknown> = { 'data-shape': shape.name };
		const slots: ReactNode[] = [];
		for (const [k, v] of Object.entries(props)) {
			if (k === 'children' || k === 'key') continue;
			if (k.startsWith('slot')) {
				const name = kebab(k.slice(4)).replace(/^-/, '');
				slots.push(createElement('div', { key: name, 'data-slot': name }, v as ReactNode));
			} else if (typeof v !== 'object') attrs[`data-${kebab(k)}`] = v;
		}
		return createElement(shape.plain?.tag ?? 'div', attrs, ...slots);
	};
}

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
