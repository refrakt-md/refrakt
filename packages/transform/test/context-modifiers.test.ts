import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag, toKebabCase } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

/** Minimal theme config for testing context modifiers */
const testConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: {
		Hero: { block: 'hero' },
		Grid: { block: 'grid' },
		Hint: {
			block: 'hint',
			modifiers: { hintType: { source: 'meta', default: 'note' } },
			contextModifiers: { hero: 'in-hero', grid: 'in-grid' },
		},
		CallToAction: {
			block: 'cta',
			contextModifiers: { hero: 'in-hero' },
		},
		Feature: {
			block: 'feature',
			contextModifiers: { hero: 'in-hero' },
		},
		// A rune with no contextModifiers
		Plain: { block: 'plain' },
	},
};

const transform = createTransform(testConfig);

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

/** Find a tag recursively by data-rune */
function findByTypeof(node: any, typeof_: string): SerializedTag | undefined {
	if (!node || typeof node !== 'object') return undefined;
	if (Array.isArray(node)) {
		for (const child of node) {
			const found = findByTypeof(child, typeof_);
			if (found) return found;
		}
		return undefined;
	}
	if (node.$$mdtype === 'Tag') {
		if (node.attributes?.['data-rune'] === toKebabCase(typeof_)) return node;
		for (const child of node.children ?? []) {
			const found = findByTypeof(child, typeof_);
			if (found) return found;
		}
	}
	return undefined;
}

describe('context-aware BEM modifiers', () => {
	it('standalone rune gets no context modifier', () => {
		const hint = makeTag('section', { 'data-rune': 'hint' }, [
			makeTag('meta', { 'data-field': 'hint-type', content: 'warning' }, []),
			'Some warning text',
		]);

		const result = asTag(transform(hint));
		expect(result.attributes.class).toBe('rf-hint rf-hint--warning');
		expect(result.attributes.class).not.toContain('in-');
		expect(result.attributes['data-rune']).toBe('hint');
	});

	it('rune nested inside a matching parent gets the modifier class', () => {
		const hero = makeTag('section', { 'data-rune': 'hero' }, [
			makeTag('section', { 'data-rune': 'hint' }, [
				makeTag('meta', { 'data-field': 'hint-type', content: 'note' }, []),
				'A note inside hero',
			]),
		]);

		const result = asTag(transform(hero));
		const hint = findByTypeof(result, 'Hint')!;
		expect(hint).toBeDefined();
		expect(hint.attributes.class).toContain('rf-hint--in-hero');
		// Should also still have the regular modifier
		expect(hint.attributes.class).toContain('rf-hint--note');
		expect(hint.attributes.class).toContain('rf-hint');
	});

	it('rune nested inside a non-matching parent gets no context modifier', () => {
		const grid = makeTag('section', { 'data-rune': 'grid' }, [
			makeTag('section', { 'data-rune': 'call-to-action' }, ['CTA inside grid']),
		]);

		const result = asTag(transform(grid));
		const cta = findByTypeof(result, 'CallToAction')!;
		expect(cta).toBeDefined();
		// CTA has contextModifiers for Hero only, not Grid
		expect(cta.attributes.class).toBe('rf-cta');
		expect(cta.attributes.class).not.toContain('in-');
	});

	it('deeply nested: only immediate parent rune matters', () => {
		// Hero > Grid > Hint — Hint's parent is Grid, not Hero
		const hero = makeTag('section', { 'data-rune': 'hero' }, [
			makeTag('section', { 'data-rune': 'grid' }, [
				makeTag('section', { 'data-rune': 'hint' }, [
					makeTag('meta', { 'data-field': 'hint-type', content: 'note' }, []),
					'Deep hint',
				]),
			]),
		]);

		const result = asTag(transform(hero));
		const hint = findByTypeof(result, 'Hint')!;
		expect(hint).toBeDefined();
		// Hint has contextModifiers for both Hero and Grid
		expect(hint.attributes.class).toContain('rf-hint--in-grid');
		expect(hint.attributes.class).not.toContain('rf-hint--in-hero');
	});

	it('context passes through non-rune wrapper elements', () => {
		// Hero > div (not a rune) > Hint — parent context should pass through the div
		const hero = makeTag('section', { 'data-rune': 'hero' }, [
			makeTag('div', {}, [
				makeTag('section', { 'data-rune': 'hint' }, [
					makeTag('meta', { 'data-field': 'hint-type', content: 'note' }, []),
					'Hint inside a wrapper div inside hero',
				]),
			]),
		]);

		const result = asTag(transform(hero));
		const hint = findByTypeof(result, 'Hint')!;
		expect(hint).toBeDefined();
		expect(hint.attributes.class).toContain('rf-hint--in-hero');
	});

	it('rune without contextModifiers is unaffected by parent context', () => {
		const hero = makeTag('section', { 'data-rune': 'hero' }, [
			makeTag('section', { 'data-rune': 'plain' }, ['Plain rune inside hero']),
		]);

		const result = asTag(transform(hero));
		const plain = findByTypeof(result, 'Plain')!;
		expect(plain).toBeDefined();
		expect(plain.attributes.class).toBe('rf-plain');
	});

	it('top-level rune sets context for its children', () => {
		const hero = makeTag('section', { 'data-rune': 'hero' }, [
			makeTag('section', { 'data-rune': 'feature' }, ['Feature inside hero']),
			makeTag('section', { 'data-rune': 'call-to-action' }, ['CTA inside hero']),
		]);

		const result = asTag(transform(hero));
		const feature = findByTypeof(result, 'Feature')!;
		const cta = findByTypeof(result, 'CallToAction')!;
		expect(feature.attributes.class).toContain('rf-feature--in-hero');
		expect(cta.attributes.class).toContain('rf-cta--in-hero');
	});
});

describe('data-in carries the context modifier as an attribute (SPEC-196 D5)', () => {
	it('a rune in a declared parent gets data-in beside the class', () => {
		const hero = makeTag('section', { 'data-rune': 'hero' }, [
			makeTag('section', { 'data-rune': 'hint' }, [
				makeTag('meta', { 'data-field': 'hint-type', content: 'note' }, []),
				'A note inside hero',
			]),
		]);
		const hint = findByTypeof(transform(hero), 'Hint')!;
		expect(hint.attributes['data-in']).toBe('hero');
		expect(hint.attributes.class).toContain('rf-hint--in-hero');
	});

	it('names the immediate declared parent only', () => {
		const hero = makeTag('section', { 'data-rune': 'hero' }, [
			makeTag('section', { 'data-rune': 'grid' }, [
				makeTag('section', { 'data-rune': 'hint' }, [
					makeTag('meta', { 'data-field': 'hint-type', content: 'note' }, []),
					'Deep hint',
				]),
			]),
		]);
		const hint = findByTypeof(transform(hero), 'Hint')!;
		expect(hint.attributes['data-in']).toBe('grid');
	});

	it('a rune in a parent it does not declare gets no data-in', () => {
		const grid = makeTag('section', { 'data-rune': 'grid' }, [
			makeTag('section', { 'data-rune': 'call-to-action' }, ['CTA inside grid']),
		]);
		const cta = findByTypeof(transform(grid), 'CallToAction')!;
		expect(cta.attributes['data-in']).toBeUndefined();
	});

	it('a standalone rune, and a rune with no contextModifiers, get no data-in', () => {
		const hint = asTag(
			transform(
				makeTag('section', { 'data-rune': 'hint' }, [
					makeTag('meta', { 'data-field': 'hint-type', content: 'note' }, []),
					'Alone',
				]),
			),
		);
		expect(hint.attributes['data-in']).toBeUndefined();

		const hero = makeTag('section', { 'data-rune': 'hero' }, [
			makeTag('section', { 'data-rune': 'plain' }, ['Plain rune inside hero']),
		]);
		const plain = findByTypeof(transform(hero), 'Plain')!;
		expect(plain.attributes['data-in']).toBeUndefined();
	});
});

describe('data-tinted carries the --tinted fact as an attribute (SPEC-196 D5)', () => {
	const tintTransform = createTransform({
		...testConfig,
		tints: { forest: { light: { bg: '#e8f0e8' } } },
		runes: { Card: { block: 'card' } },
	});
	const card = (...metas: Array<[string, string]>) =>
		asTag(
			tintTransform(
				makeTag(
					'section',
					{ 'data-rune': 'card' },
					metas.map(([field, content]) => makeTag('meta', { 'data-field': field, content }, [])),
				),
			),
		);

	it('a named tint that resolves sets data-tinted beside the class', () => {
		const out = card(['tint', 'forest']);
		expect(out.attributes['data-tinted']).toBe('');
		expect(out.attributes.class).toContain('rf-card--tinted');
	});

	it('inline tokens set it too', () => {
		const out = card(['tint', 'custom'], ['tint-bg', '#fff']);
		expect(out.attributes['data-tinted']).toBe('');
	});

	it('tint="custom" with no tokens does not, though it has data-tint', () => {
		const out = card(['tint', 'custom']);
		expect(out.attributes['data-tint']).toBe('custom');
		expect(out.attributes['data-tinted']).toBeUndefined();
		expect(out.attributes.class ?? '').not.toContain('--tinted');
	});

	it('an unknown tint name does not', () => {
		const out = card(['tint', 'nonexistent']);
		expect(out.attributes['data-tint']).toBe('nonexistent');
		expect(out.attributes['data-tinted']).toBeUndefined();
	});

	it('a bare tint-mode does not', () => {
		const out = card(['tint-mode', 'dark']);
		expect(out.attributes['data-tinted']).toBeUndefined();
	});
});
