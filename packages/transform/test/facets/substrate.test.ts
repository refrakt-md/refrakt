import { describe, it, expect } from 'vitest';
import { substrateFacet } from '../../src/facets/substrate.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext, FacetTheme } from '../../src/facets/types.js';
import type { ChromeCarry } from '../../src/facets/chrome.js';
import type { RuneConfig } from '../../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const THEME: FacetTheme = { tints: {}, backgrounds: {}, frames: {} };

const meta = (field: string, content: string) => makeTag('meta', { 'data-field': field, content }, []);

const MEDIA_RUNE: RuneConfig = { block: 'card', sections: { visual: 'media' } };
const BARE_RUNE: RuneConfig = { block: 'badge' };

const ctx = (metas: Array<[string, string]>, config: RuneConfig = MEDIA_RUNE, rune = 'card'): FacetContext => ({
	tag: makeTag('div', { 'data-rune': rune }, metas.map(([f, c]) => meta(f, c))),
	config,
	block: `rf-${config.block}`,
	rune,
	fields: {},
	theme: THEME,
	axis: () => undefined,
});

const carryOf = (result: ReturnType<typeof substrateFacet.resolve>) => result?.carry as ChromeCarry;

describe('substrate facet', () => {
	it('contributes nothing without a pattern', () => {
		expect(substrateFacet.resolve(ctx([]))).toBeNull();
	});

	it('ignores facets with no pattern to apply them to', () => {
		expect(substrateFacet.resolve(ctx([['substrate-size', 'lg']]))).toBeNull();
	});

	it('emits the pattern marker', () => {
		expect(substrateFacet.resolve(ctx([['substrate', 'grid']]))?.dataAttrs)
			.toEqual({ 'data-substrate': 'grid' });
	});

	it('emits the fill marker when set', () => {
		expect(substrateFacet.resolve(ctx([['substrate', 'dots'], ['substrate-fill', 'primary']]))?.dataAttrs)
			.toEqual({ 'data-substrate': 'dots', 'data-substrate-fill': 'primary' });
	});

	it('maps the size and opacity scales', () => {
		const result = substrateFacet.resolve(ctx([['substrate', 'grid'], ['substrate-size', 'lg'], ['substrate-opacity', 'sm']]));
		expect(result?.styles).toEqual([['--substrate-cell', '24px'], ['--substrate-opacity', '0.25']]);
	});

	it('drops an off-scale size rather than passing it through', () => {
		const result = substrateFacet.resolve(ctx([['substrate', 'grid'], ['substrate-size', 'enormous']]));
		expect(result?.styles).toEqual([]);
	});

	it('consumes every substrate meta it read', () => {
		const result = substrateFacet.resolve(ctx([['substrate', 'grid'], ['substrate-size', 'md']]));
		expect(result?.consumes).toEqual(['substrate', 'substrate-size']);
	});

	describe('target resolution', () => {
		it('defaults to the self surface — a fill sits behind everything', () => {
			const result = substrateFacet.resolve(ctx([['substrate', 'grid']]));
			expect(carryOf(result).target).toBe('self');
			expect(result?.dataAttrs).toBeDefined();
		});

		it('honours a rune-configured substrateTarget', () => {
			const config: RuneConfig = { ...MEDIA_RUNE, substrateTarget: 'media' };
			const result = substrateFacet.resolve(ctx([['substrate', 'grid']], config));
			expect(carryOf(result).target).toBe('media');
			expect(result?.dataAttrs).toBeUndefined();
		});

		it('lets a per-instance override beat the rune default', () => {
			const config: RuneConfig = { ...MEDIA_RUNE, substrateTarget: 'media' };
			const result = substrateFacet.resolve(ctx([['substrate', 'grid'], ['substrate-target', 'self']], config));
			expect(carryOf(result).target).toBe('self');
		});

		it('lets a per-instance override opt into the media well', () => {
			const result = substrateFacet.resolve(ctx([['substrate', 'grid'], ['substrate-target', 'media']]));
			expect(carryOf(result).target).toBe('media');
		});

		it('ignores an unrecognised override and falls back to the default', () => {
			const result = substrateFacet.resolve(ctx([['substrate', 'grid'], ['substrate-target', 'sideways']]));
			expect(carryOf(result).target).toBe('self');
		});

		it('warns and targets nothing when media is requested but absent', () => {
			const result = substrateFacet.resolve(ctx([['substrate', 'grid'], ['substrate-target', 'media']], BARE_RUNE, 'badge'));
			expect(carryOf(result).target).toBeNull();
			expect(result?.warnings?.[0].code).toBe('substrate-no-media');
			expect(result?.dataAttrs).toBeUndefined();
		});
	});

	describe('postAssemble — media target', () => {
		it('lands the chrome on the media zone', () => {
			const c = ctx([['substrate', 'grid'], ['substrate-target', 'media'], ['substrate-size', 'sm']]);
			const children = [makeTag('div', { 'data-section': 'media' }, [])];
			substrateFacet.postAssemble!(c, children, substrateFacet.resolve(c)!.carry);
			const zone = children[0] as SerializedTag;
			expect(zone.attributes['data-substrate']).toBe('grid');
			expect(zone.attributes.style).toBe('--substrate-cell: 12px');
		});

		it('warns when the media zone never materialised', () => {
			const c = ctx([['substrate', 'grid'], ['substrate-target', 'media']]);
			const warnings = substrateFacet.postAssemble!(c, [], substrateFacet.resolve(c)!.carry);
			expect(warnings?.[0].code).toBe('substrate-no-media');
		});

		it('is a no-op for self-target chrome', () => {
			const c = ctx([['substrate', 'grid']]);
			const children = [makeTag('div', { 'data-section': 'media' }, [])];
			substrateFacet.postAssemble!(c, children, substrateFacet.resolve(c)!.carry);
			expect((children[0] as SerializedTag).attributes['data-substrate']).toBeUndefined();
		});
	});
});
