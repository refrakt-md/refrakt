import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
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
			contextModifiers: { 'Hero': 'in-hero', 'Grid': 'in-grid' },
		},
		CallToAction: {
			block: 'cta',
			contextModifiers: { 'Hero': 'in-hero' },
		},
		Feature: {
			block: 'feature',
			contextModifiers: { 'Hero': 'in-hero' },
		},
		// A rune with no contextModifiers
		Plain: { block: 'plain' },
	},
};

const transform = createTransform(testConfig);

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

/** Find a tag recursively by typeof */
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
		if (node.attributes?.typeof === typeof_) return node;
		for (const child of node.children ?? []) {
			const found = findByTypeof(child, typeof_);
			if (found) return found;
		}
	}
	return undefined;
}

describe('context-aware BEM modifiers', () => {
	it('standalone rune gets no context modifier', () => {
		const hint = makeTag('section', { typeof: 'Hint' }, [
			makeTag('meta', { property: 'hintType', content: 'warning' }, []),
			'Some warning text',
		]);

		const result = asTag(transform(hint));
		expect(result.attributes.class).toBe('rf-hint rf-hint--warning');
		expect(result.attributes.class).not.toContain('in-');
		expect(result.attributes['data-rune']).toBe('hint');
	});

	it('rune nested inside a matching parent gets the modifier class', () => {
		const hero = makeTag('section', { typeof: 'Hero' }, [
			makeTag('section', { typeof: 'Hint' }, [
				makeTag('meta', { property: 'hintType', content: 'note' }, []),
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
		const grid = makeTag('section', { typeof: 'Grid' }, [
			makeTag('section', { typeof: 'CallToAction' }, [
				'CTA inside grid',
			]),
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
		const hero = makeTag('section', { typeof: 'Hero' }, [
			makeTag('section', { typeof: 'Grid' }, [
				makeTag('section', { typeof: 'Hint' }, [
					makeTag('meta', { property: 'hintType', content: 'note' }, []),
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
		const hero = makeTag('section', { typeof: 'Hero' }, [
			makeTag('div', {}, [
				makeTag('section', { typeof: 'Hint' }, [
					makeTag('meta', { property: 'hintType', content: 'note' }, []),
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
		const hero = makeTag('section', { typeof: 'Hero' }, [
			makeTag('section', { typeof: 'Plain' }, ['Plain rune inside hero']),
		]);

		const result = asTag(transform(hero));
		const plain = findByTypeof(result, 'Plain')!;
		expect(plain).toBeDefined();
		expect(plain.attributes.class).toBe('rf-plain');
	});

	it('top-level rune sets context for its children', () => {
		const hero = makeTag('section', { typeof: 'Hero' }, [
			makeTag('section', { typeof: 'Feature' }, ['Feature inside hero']),
			makeTag('section', { typeof: 'CallToAction' }, ['CTA inside hero']),
		]);

		const result = asTag(transform(hero));
		const feature = findByTypeof(result, 'Feature')!;
		const cta = findByTypeof(result, 'CallToAction')!;
		expect(feature.attributes.class).toContain('rf-feature--in-hero');
		expect(cta.attributes.class).toContain('rf-cta--in-hero');
	});
});
