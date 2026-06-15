import { describe, it, expect, vi } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;

// A page-section-header rune (its `sections` map a header-ish role) vs a
// header-less rune (badge). Hero carries a default prominence.
const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: {
		Recipe: { block: 'recipe', sections: { preamble: 'preamble', headline: 'title', blurb: 'description' } },
		Hero: { block: 'hero', sections: { headline: 'title' }, defaultProminence: 'display' },
		Badge: { block: 'badge' }, // no page-section header
	},
};

describe('SPEC-107 prominence axis (page-section-header family)', () => {
	it('emits data-prominence on a header-family rune', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'recipe', prominence: 'display' }, []);
		const result = asTag(transform(tag));
		expect(result.attributes['data-prominence']).toBe('display');
		// no BEM class — styled by attribute
		expect(result.attributes.class).toBe('rf-recipe');
	});

	it('emits no data-prominence when neither attribute nor default is set', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'recipe' }, []);
		expect(asTag(transform(tag)).attributes['data-prominence']).toBeUndefined();
	});

	describe('per-rune defaultProminence', () => {
		it('applies the rune default with no authored attribute (a hero is always prominent)', () => {
			const transform = createTransform(config);
			const tag = makeTag('div', { 'data-rune': 'hero' }, []);
			expect(asTag(transform(tag)).attributes['data-prominence']).toBe('display');
		});

		it('lets an author override the default (a compact hero)', () => {
			const transform = createTransform(config);
			const tag = makeTag('div', { 'data-rune': 'hero', prominence: 'normal' }, []);
			expect(asTag(transform(tag)).attributes['data-prominence']).toBe('normal');
		});
	});

	describe('availability gating', () => {
		it('ignores prominence on a header-less rune and warns', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const transform = createTransform(config);
			const tag = makeTag('div', { 'data-rune': 'badge', prominence: 'display' }, []);
			expect(asTag(transform(tag)).attributes['data-prominence']).toBeUndefined();
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('prominence is not supported on "badge"'));
			warn.mockRestore();
		});

		it('does not leak prominence as a pass-through attribute', () => {
			const transform = createTransform(config);
			const tag = makeTag('div', { 'data-rune': 'recipe', prominence: 'display' }, []);
			expect(asTag(transform(tag)).attributes.prominence).toBeUndefined();
		});
	});
});
