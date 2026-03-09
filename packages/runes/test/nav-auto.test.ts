import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
import { NAV_AUTO_SENTINEL } from '../src/tags/nav.js';

describe('nav auto mode', () => {
	it('emits a placeholder with sentinel meta when auto=true', () => {
		const result = parse(`{% nav auto=true /%}`);
		const nav = findTag(result as any, t => t.attributes['data-rune'] === 'nav');

		expect(nav).toBeDefined();

		// Should have the sentinel meta tag as a direct child
		const sentinel = nav!.children.find(
			(c: any) => c?.name === 'meta' && c?.attributes?.property === NAV_AUTO_SENTINEL
		);
		expect(sentinel).toBeDefined();
	});

	it('sentinel has the correct property name constant', () => {
		expect(NAV_AUTO_SENTINEL).toBe('__nav-auto');
	});

	it('auto mode emits an empty items list (no NavItems)', () => {
		const result = parse(`{% nav auto=true /%}`);
		const nav = findTag(result as any, t => t.attributes['data-rune'] === 'nav');

		const items = findAllTags(nav!, t => t.attributes['data-rune'] === 'navitem');
		expect(items).toHaveLength(0);
	});

	it('static mode (no auto) does not emit a sentinel', () => {
		const result = parse(`{% nav %}
## Section
- Page one
- Page two
{% /nav %}`);

		const nav = findTag(result as any, t => t.attributes['data-rune'] === 'nav');
		expect(nav).toBeDefined();

		const sentinel = nav!.children.find(
			(c: any) => c?.name === 'meta' && c?.attributes?.property === NAV_AUTO_SENTINEL
		);
		expect(sentinel).toBeUndefined();
	});
});
