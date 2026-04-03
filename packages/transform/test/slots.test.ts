import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { mergeThemeConfig } from '../src/merge.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

function baseConfig(runes: ThemeConfig['runes']): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes };
}

function findByDataName(node: SerializedTag, name: string): SerializedTag | undefined {
	for (const child of node.children) {
		if (typeof child !== 'object' || child === null) continue;
		const tag = child as SerializedTag;
		if (tag.attributes?.['data-name'] === name) return tag;
	}
	return undefined;
}

describe('named slots with ordering', () => {
	it('assembles children in slot order', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				slots: ['eyebrow', 'header', 'content', 'footer'],
				structure: {
					eyebrow: { tag: 'div', slot: 'eyebrow' },
					header: { tag: 'div', slot: 'header' },
					footer: { tag: 'div', slot: 'footer' },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'card' }, ['Body text']);

		const result = asTag(transform(tag));
		const names = result.children
			.filter((c: any) => typeof c === 'object' && c?.attributes?.['data-name'])
			.map((c: any) => c.attributes['data-name']);

		expect(names[0]).toBe('eyebrow');
		expect(names[1]).toBe('header');
		expect(names[2]).toBe('footer');
	});

	it('places content children at the content slot', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				slots: ['header', 'content', 'footer'],
				structure: {
					header: { tag: 'div', slot: 'header' },
					footer: { tag: 'div', slot: 'footer' },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'card' }, ['Body text']);

		const result = asTag(transform(tag));
		// Content should be between header and footer
		const headerIdx = result.children.findIndex((c: any) => c?.attributes?.['data-name'] === 'header');
		const footerIdx = result.children.findIndex((c: any) => c?.attributes?.['data-name'] === 'footer');
		const textIdx = result.children.findIndex((c: any) => c === 'Body text');

		expect(headerIdx).toBeLessThan(textIdx);
		expect(textIdx).toBeLessThan(footerIdx);
	});

	it('sorts entries within a slot by order', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				slots: ['header', 'content'],
				structure: {
					title: { tag: 'h2', slot: 'header', order: 2 },
					badge: { tag: 'span', slot: 'header', order: 1 },
					icon: { tag: 'span', slot: 'header', order: 0 },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'card' }, ['Body']);

		const result = asTag(transform(tag));
		const headerChildren = result.children
			.filter((c: any) => typeof c === 'object' && c?.attributes?.['data-name'])
			.map((c: any) => c.attributes['data-name']);

		expect(headerChildren).toEqual(['icon', 'badge', 'title']);
	});

	it('uses contentWrapper with slots', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				slots: ['header', 'content', 'footer'],
				contentWrapper: { tag: 'div', ref: 'body' },
				structure: {
					header: { tag: 'div', slot: 'header' },
					footer: { tag: 'div', slot: 'footer' },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'card' }, ['Body text']);

		const result = asTag(transform(tag));
		const body = findByDataName(result, 'body');
		expect(body).toBeDefined();
		expect(body!.children).toContain('Body text');
	});

	it('backward compat: before=true maps to first non-content slot', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				slots: ['header', 'content', 'footer'],
				structure: {
					icon: { tag: 'span', before: true },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'card' }, ['Body']);

		const result = asTag(transform(tag));
		// Icon should be in header slot (first non-content slot)
		const iconIdx = result.children.findIndex((c: any) => c?.attributes?.['data-name'] === 'icon');
		const textIdx = result.children.findIndex((c: any) => c === 'Body');
		expect(iconIdx).toBeLessThan(textIdx);
	});

	it('backward compat: before=false maps to last non-content slot', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				slots: ['header', 'content', 'footer'],
				structure: {
					actions: { tag: 'div', before: false },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'card' }, ['Body']);

		const result = asTag(transform(tag));
		// Actions should be in footer slot (last non-content slot)
		const actionsIdx = result.children.findIndex((c: any) => c?.attributes?.['data-name'] === 'actions');
		const textIdx = result.children.findIndex((c: any) => c === 'Body');
		expect(actionsIdx).toBeGreaterThan(textIdx);
	});

	it('explicit slot takes precedence over before mapping', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				slots: ['eyebrow', 'header', 'content'],
				structure: {
					badge: { tag: 'span', before: true, slot: 'eyebrow' },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'card' }, ['Body']);

		const result = asTag(transform(tag));
		const names = result.children
			.filter((c: any) => typeof c === 'object' && c?.attributes?.['data-name'])
			.map((c: any) => c.attributes['data-name']);
		// Badge should be in eyebrow position (before header)
		expect(names[0]).toBe('badge');
	});

	it('without slots declared, existing before/after behavior is unchanged', () => {
		const config = baseConfig({
			Hint: {
				block: 'hint',
				structure: {
					icon: { tag: 'span', before: true },
					badge: { tag: 'span', before: false },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, ['Content']);

		const result = asTag(transform(tag));
		const iconIdx = result.children.findIndex((c: any) => c?.attributes?.['data-name'] === 'icon');
		const textIdx = result.children.findIndex((c: any) => c === 'Content');
		const badgeIdx = result.children.findIndex((c: any) => c?.attributes?.['data-name'] === 'badge');

		expect(iconIdx).toBeLessThan(textIdx);
		expect(textIdx).toBeLessThan(badgeIdx);
	});
});

describe('mergeThemeConfig with slots', () => {
	it('theme slots replace base slots', () => {
		const base = baseConfig({
			Card: {
				block: 'card',
				slots: ['header', 'content'],
				structure: {
					header: { tag: 'div', slot: 'header' },
				},
			},
		});
		const merged = mergeThemeConfig(base, {
			runes: {
				Card: {
					slots: ['eyebrow', 'header', 'content', 'footer'],
				},
			},
		});
		expect(merged.runes.Card.slots).toEqual(['eyebrow', 'header', 'content', 'footer']);
	});

	it('theme can add structure entries with slot assignments', () => {
		const base = baseConfig({
			Card: {
				block: 'card',
				slots: ['header', 'content'],
				structure: {
					header: { tag: 'div', slot: 'header' },
				},
			},
		});
		const merged = mergeThemeConfig(base, {
			runes: {
				Card: {
					slots: ['eyebrow', 'header', 'content'],
					structure: {
						eyebrow: { tag: 'div', slot: 'eyebrow' },
						header: { tag: 'div', slot: 'header' },
					},
				},
			},
		});
		expect(merged.runes.Card.structure!.eyebrow.slot).toBe('eyebrow');
	});
});
