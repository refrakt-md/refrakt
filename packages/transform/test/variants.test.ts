import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { mergeRuneConfig } from '../src/merge.js';
import { validateThemeConfig } from '../src/validate.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig, RuneConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

// ─── Engine: variant selection rides the modifier system ──────────────

describe('SPEC-091 engine config variants — selection', () => {
	function configWithVariant(): ThemeConfig {
		return {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Card: {
					block: 'card',
					modifiers: {
						'media-position': { source: 'meta', default: 'top', noBemClass: true },
					},
					variants: {
						'media-position': {
							cover: { staticModifiers: ['cover'] },
						},
					},
				},
			},
		};
	}

	it('merges the matching axis delta over base when the modifier resolves to it', () => {
		const transform = createTransform(configWithVariant());
		const tag = makeTag('section', { 'data-rune': 'card' }, [
			makeTag('meta', { 'data-field': 'media-position', content: 'cover' }, []),
		]);
		const result = asTag(transform(tag));
		expect(result.attributes.class).toContain('rf-card--cover');
	});

	it('leaves base config untouched when the modifier resolves to its default', () => {
		const transform = createTransform(configWithVariant());
		const tag = makeTag('section', { 'data-rune': 'card' }, []); // no meta → default 'top'
		const result = asTag(transform(tag));
		expect(result.attributes.class).toContain('rf-card');
		expect(result.attributes.class).not.toContain('rf-card--cover');
	});

	it('applies no delta when the resolved value has no matching variant entry', () => {
		const transform = createTransform(configWithVariant());
		const tag = makeTag('section', { 'data-rune': 'card' }, [
			makeTag('meta', { 'data-field': 'media-position', content: 'start' }, []),
		]);
		const result = asTag(transform(tag));
		expect(result.attributes.class).not.toContain('rf-card--cover');
	});

	it('selects a variant from an attribute-source axis', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Tile: {
					block: 'tile',
					modifiers: { layout: { source: 'attribute', default: 'grid', noBemClass: true } },
					variants: { layout: { stack: { staticModifiers: ['stacked'] } } },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'tile', layout: 'stack' }, []);
		const result = asTag(transform(tag));
		expect(result.attributes.class).toContain('rf-tile--stacked');
	});

	it('a delta restructures layout (root replaces, new wrapper keys add)', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Panel: {
					block: 'panel',
					modifiers: { mode: { source: 'meta', default: 'plain', noBemClass: true } },
					layout: { root: ['media', 'content'] },
					variants: {
						mode: {
							cover: {
								layout: {
									root: ['band'],
									band: { tag: 'div', children: ['media', 'content'] },
								},
							},
						},
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'panel' }, [
			makeTag('meta', { 'data-field': 'mode', content: 'cover' }, []),
			makeTag('div', { 'data-name': 'media' }, ['m']),
			makeTag('div', { 'data-name': 'content' }, ['c']),
		]);
		const result = asTag(transform(tag));
		// The cover variant wraps media+content into a `band` container.
		const band = (result.children as any[]).find(
			(c) => c && typeof c === 'object' && c.attributes?.['data-name'] === 'band',
		);
		expect(band).toBeTruthy();
		expect(band.attributes.class).toContain('rf-panel__band');
	});
});

// ─── Merge: themes extend variants ────────────────────────────────────

describe('SPEC-091 engine config variants — merge', () => {
	it('mergeRuneConfig adds a new axis and overrides an existing value delta', () => {
		const base: RuneConfig = {
			block: 'card',
			modifiers: { mode: { source: 'meta' }, size: { source: 'meta' } },
			variants: { mode: { cover: { staticModifiers: ['cover'] } } },
		};
		const merged = mergeRuneConfig(base, {
			variants: {
				mode: { cover: { staticModifiers: ['cover-themed'] } }, // override value delta
				size: { large: { staticModifiers: ['lg'] } },          // new axis
			},
		});
		expect(merged.variants?.mode.cover.staticModifiers).toEqual(['cover-themed']);
		expect(merged.variants?.size.large.staticModifiers).toEqual(['lg']);
	});
});

// ─── Validation: axis must be a declared modifier; identity is protected ─

describe('SPEC-091 engine config variants — validation', () => {
	function validate(runeConfig: RuneConfig) {
		return validateThemeConfig({
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: { Card: runeConfig },
		});
	}

	it('accepts a variant axis that is a declared modifier', () => {
		const res = validate({
			block: 'card',
			modifiers: { mode: { source: 'meta' } },
			variants: { mode: { cover: { staticModifiers: ['cover'] } } },
		});
		expect(res.valid).toBe(true);
	});

	it('errors when a variant axis is not a declared modifier', () => {
		const res = validate({
			block: 'card',
			variants: { mode: { cover: { staticModifiers: ['cover'] } } },
		});
		expect(res.valid).toBe(false);
		expect(res.errors.some((e) => /must be a declared modifier/.test(e.message))).toBe(true);
	});

	it('errors when a delta overrides an identity field', () => {
		const res = validate({
			block: 'card',
			modifiers: { mode: { source: 'meta' } },
			variants: { mode: { cover: { block: 'other' } as any } },
		});
		expect(res.valid).toBe(false);
		expect(res.errors.some((e) => /identity field "block"/.test(e.message))).toBe(true);
	});
});
