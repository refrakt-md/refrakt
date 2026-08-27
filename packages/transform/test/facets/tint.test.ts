import { describe, it, expect } from 'vitest';
import { tintFacet, TINT_TOKENS } from '../../src/facets/tint.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext, FacetTheme } from '../../src/facets/types.js';
import type { TintDefinition } from '../../src/types.js';

const TINTS: Record<string, TintDefinition> = {
	forest: { light: { bg: '#e8f0e8', text: '#12301a' }, dark: { bg: '#0d1a10', text: '#d8e8dc' } },
	night: { light: { bg: '#101014' }, lockMode: 'dark' },
	sparse: { light: { bg: '#fff', surface: undefined as unknown as string } },
};

const theme = (tints = TINTS): FacetTheme => ({ tints, backgrounds: {}, frames: {} });

const meta = (field: string, content: string) => makeTag('meta', { 'data-field': field, content }, []);

const ctx = (metas: Array<[string, string]>, tints = TINTS): FacetContext => ({
	tag: makeTag('div', { 'data-rune': 'card' }, metas.map(([f, c]) => meta(f, c))),
	config: { block: 'card' },
	block: 'rf-card',
	rune: 'card',
	theme: theme(tints),
	axis: () => undefined,
});

describe('tint facet', () => {
	it('does not run without a tint or tint-mode meta', () => {
		expect(tintFacet.appliesTo?.(ctx([]))).toBe(false);
	});

	it('runs for a bare tint-mode, with no named tint', () => {
		expect(tintFacet.appliesTo?.(ctx([['tint-mode', 'dark']]))).toBe(true);
	});

	describe('named definitions', () => {
		it('resolves light and dark tokens from the registry', () => {
			const result = tintFacet.resolve(ctx([['tint', 'forest']]));
			expect(result?.styles).toEqual([
				['--tint-bg', '#e8f0e8'],
				['--tint-text', '#12301a'],
				['--tint-dark-bg', '#0d1a10'],
				['--tint-dark-text', '#d8e8dc'],
			]);
		});

		it('marks the rune as tinted and names the tint', () => {
			const result = tintFacet.resolve(ctx([['tint', 'forest']]));
			expect(result?.dataAttrs).toMatchObject({ 'data-tint': 'forest', 'data-tint-dark': '' });
			expect(result?.classes).toEqual(['rf-card--tinted']);
		});

		it('skips empty token values rather than emitting a blank custom property', () => {
			const result = tintFacet.resolve(ctx([['tint', 'sparse']]));
			expect(result?.styles).toEqual([['--tint-bg', '#fff']]);
		});

		it('emits no dark marker when the definition has no dark tokens', () => {
			const result = tintFacet.resolve(ctx([['tint', 'night']]));
			expect(result?.dataAttrs?.['data-tint-dark']).toBeUndefined();
		});

		it('passes an unknown tint name through as a marker without tokens', () => {
			const result = tintFacet.resolve(ctx([['tint', 'nonexistent']]));
			expect(result?.dataAttrs?.['data-tint']).toBe('nonexistent');
			expect(result?.styles).toEqual([]);
			expect(result?.classes).toBeUndefined();
		});
	});

	describe('lockMode', () => {
		it('applies the definition’s lock when the author sets no mode', () => {
			expect(tintFacet.resolve(ctx([['tint', 'night']]))?.dataAttrs?.['data-color-scheme']).toBe('dark');
		});

		it('lets an authored tint-mode win over the lock', () => {
			const result = tintFacet.resolve(ctx([['tint', 'night'], ['tint-mode', 'light']]));
			expect(result?.dataAttrs?.['data-color-scheme']).toBe('light');
		});

		it('treats `auto` as the absence of a lock', () => {
			const result = tintFacet.resolve(ctx([['tint', 'forest'], ['tint-mode', 'auto']]));
			expect(result?.dataAttrs?.['data-color-scheme']).toBeUndefined();
		});
	});

	describe('inline token overrides', () => {
		it('overrides a preset token, leaving the others alone', () => {
			const result = tintFacet.resolve(ctx([['tint', 'forest'], ['tint-bg', '#ffffff']]));
			expect(result?.styles).toContainEqual(['--tint-bg', '#ffffff']);
			expect(result?.styles).toContainEqual(['--tint-text', '#12301a']);
		});

		it('works with no preset at all — `custom`', () => {
			const result = tintFacet.resolve(ctx([['tint', 'custom'], ['tint-primary', 'rebeccapurple']]));
			expect(result?.dataAttrs?.['data-tint']).toBe('custom');
			expect(result?.styles).toEqual([['--tint-primary', 'rebeccapurple']]);
			expect(result?.classes).toEqual(['rf-card--tinted']);
		});

		it('names an inline-only tint `custom` when no tint attribute was given', () => {
			const result = tintFacet.resolve(ctx([['tint-mode', 'dark'], ['tint-bg', '#000']]));
			expect(result?.dataAttrs?.['data-tint']).toBe('custom');
		});

		it('accepts a dark-mode override', () => {
			const result = tintFacet.resolve(ctx([['tint', 'custom'], ['tint-dark-bg', '#000']]));
			expect(result?.styles).toEqual([['--tint-dark-bg', '#000']]);
			expect(result?.dataAttrs?.['data-tint-dark']).toBe('');
		});

		it('accepts every token in the vocabulary', () => {
			const metas = TINT_TOKENS.map(t => [`tint-${t}`, `v-${t}`] as [string, string]);
			const result = tintFacet.resolve(ctx([['tint', 'custom'], ...metas]));
			expect(result?.styles).toHaveLength(TINT_TOKENS.length);
		});
	});

	describe('the tinted marker', () => {
		it('is absent for a bare mode lock — nothing was actually tinted', () => {
			const result = tintFacet.resolve(ctx([['tint-mode', 'dark']]));
			expect(result?.classes).toBeUndefined();
			expect(result?.dataAttrs?.['data-color-scheme']).toBe('dark');
		});
	});

	describe('colour-scheme state', () => {
		// Published as state, not an emitted axis: the attribute is set directly,
		// and `cover` needs to know the scheme was claimed so it does not clobber it.
		it('publishes the resolved scheme for later facets', () => {
			expect(tintFacet.resolve(ctx([['tint', 'night']]))?.state).toEqual({ 'color-scheme': 'dark' });
		});

		it('publishes nothing when no scheme was locked', () => {
			expect(tintFacet.resolve(ctx([['tint', 'forest']]))?.state).toBeUndefined();
		});
	});

	it('consumes its metas, including the inline tokens it read', () => {
		const result = tintFacet.resolve(ctx([['tint', 'forest'], ['tint-bg', '#fff'], ['tint-dark-text', '#000']]));
		expect(result?.consumes).toEqual(['tint', 'tint-mode', 'tint-bg', 'tint-dark-text']);
	});
});
