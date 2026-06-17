import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;
const meta = (f: string, c: string) => makeTag('meta', { 'data-field': f, content: c }, []);

const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	backgrounds: {
		'brand-fade': { gradient: { type: 'linear', direction: 'to-br', stops: ['primary', 'surface'] } },
	},
	runes: { Hero: { block: 'hero' } },
};

function findBg(node: any): SerializedTag | undefined {
	if (node?.attributes?.['data-name'] === 'bg') return node;
	for (const c of node?.children ?? []) { const f = findBg(c); if (f) return f; }
	return undefined;
}

describe('SPEC-088 bg gradient fill', () => {
	it('builds a token-driven gradient from inline facets (token names → var(--rf-color-*))', () => {
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hero' }, [
			meta('bg-gradient', 'to-b'), meta('bg-from', 'primary'), meta('bg-to', 'surface'),
		]);
		const bg = findBg(asTag(transform(tag)))!;
		expect(bg.attributes.style).toContain('--bg-image: linear-gradient(to bottom, var(--rf-color-primary), var(--rf-color-surface))');
	});

	it('supports a middle stop (via) and gradient-type', () => {
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hero' }, [
			meta('bg-from', 'primary'), meta('bg-via', 'accent'), meta('bg-to', 'surface'), meta('bg-gradient-type', 'radial'),
		]);
		const bg = findBg(asTag(transform(tag)))!;
		expect(bg.attributes.style).toContain('--bg-image: radial-gradient(var(--rf-color-primary), var(--rf-color-accent), var(--rf-color-surface))');
	});

	it('applies a structured gradient preset via bg="name"', () => {
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hero' }, [meta('bg-preset', 'brand-fade')]);
		const bg = findBg(asTag(transform(tag)))!;
		expect(bg.attributes.style).toContain('--bg-image: linear-gradient(to bottom right, var(--rf-color-primary), var(--rf-color-surface))');
	});

	it('a gradient-only bg raises the bg layer (no image needed) and is consumed', () => {
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hero' }, [meta('bg-from', 'primary'), meta('bg-to', 'surface')]);
		const result = asTag(transform(tag));
		expect(findBg(result)).toBeTruthy();
		const leaked = (result.children as any[]).some((c) => c?.name === 'meta' && c.attributes?.['data-field'] === 'bg-from');
		expect(leaked).toBe(false);
	});

	it('inline facets override a preset gradient', () => {
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hero' }, [meta('bg-preset', 'brand-fade'), meta('bg-gradient', 'to-r')]);
		const bg = findBg(asTag(transform(tag)))!;
		// direction overridden to "to right", preset stops retained
		expect(bg.attributes.style).toContain('linear-gradient(to right, var(--rf-color-primary), var(--rf-color-surface))');
	});

	it('accepts the `transparent` keyword as a stop', () => {
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hero' }, [
			meta('bg-gradient', 'to-br'), meta('bg-from', 'transparent'), meta('bg-to', 'primary'),
		]);
		const bg = findBg(asTag(transform(tag)))!;
		expect(bg.attributes.style).toContain('--bg-image: linear-gradient(to bottom right, transparent, var(--rf-color-primary))');
	});

	it('accepts `name/alpha` shorthand for partial-opacity stops (decimal)', () => {
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hero' }, [
			meta('bg-from', 'transparent'), meta('bg-to', 'primary/0.5'),
		]);
		const bg = findBg(asTag(transform(tag)))!;
		expect(bg.attributes.style).toContain('color-mix(in srgb, var(--rf-color-primary) 50%, transparent)');
	});

	it('accepts `name/N` shorthand as a percentage when N > 1', () => {
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hero' }, [
			meta('bg-from', 'primary/25'), meta('bg-to', 'surface'),
		]);
		const bg = findBg(asTag(transform(tag)))!;
		expect(bg.attributes.style).toContain('color-mix(in srgb, var(--rf-color-primary) 25%, transparent)');
	});
});
