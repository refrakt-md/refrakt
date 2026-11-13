import { createElement, type ReactNode } from 'react';
import type { Shape } from './shapes.ts';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** SPEC-199 decision 3: the plain presentation, for a shape with no component. */
export function plain(shape: Shape) {
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
