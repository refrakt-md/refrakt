import { describe, it, expect } from 'vitest';
import { coverFacet } from '../../src/facets/cover.js';
import { contentPlaceFacet } from '../../src/facets/content-place.js';
import { orderFacets, runFacets, runPostAssemble, WarningCollector } from '../../src/facets/driver.js';
import { modifiersFacet } from '../../src/facets/modifiers.js';
import { tintFacet } from '../../src/facets/tint.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext, FacetInput } from '../../src/facets/types.js';
import type { RuneConfig } from '../../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const meta = (field: string, content: string) =>
	makeTag('meta', { 'data-field': field, content }, []);

const ctx = (
	metas: Array<[string, string]> = [],
	axes: Record<string, string | undefined> = { 'media-position': 'cover' },
	config: RuneConfig = { block: 'card' },
): FacetContext => ({
	tag: makeTag('div', { 'data-rune': 'card' }, metas.map(([f, c]) => meta(f, c))),
	config,
	block: 'rf-card',
	rune: 'card',
	fields: {},
	theme: { tints: {}, backgrounds: {}, frames: {} },
	axis: (name) => axes[name],
});

describe('cover facet', () => {
	it('does not run outside cover mode', () => {
		expect(coverFacet.appliesTo?.(ctx([], { 'media-position': 'inline' }))).toBe(false);
	});

	it('runs in cover mode', () => {
		expect(coverFacet.appliesTo?.(ctx())).toBe(true);
	});

	it('publishes cover as state, never as an emitted axis', () => {
		const result = coverFacet.resolve(ctx());
		expect(result?.state).toEqual({ cover: 'true' });
		expect(result?.axes).toBeUndefined();
	});

	// The reroute: the media well claims the scrim facet, so the strip pass must
	// drop these metas even when no bg layer was built.
	it('claims the scrim metas unconditionally in cover mode', () => {
		expect(coverFacet.resolve(ctx())?.consumes)
			.toEqual(['scrim', 'scrim-type', 'scrim-blur', 'scrim-tone']);
	});

	it('signals scrim="none" to CSS on the host', () => {
		expect(coverFacet.resolve(ctx([['scrim', 'none']]))?.dataAttrs)
			.toEqual({ 'data-scrim': 'none' });
	});

	it('emits the scrim treatment type', () => {
		expect(coverFacet.resolve(ctx([['scrim-type', 'frost'], ['scrim-blur', 'lg']]))?.dataAttrs)
			.toEqual({ 'data-scrim-type': 'frost', 'data-scrim-blur': 'lg' });
	});

	it('carries blur only for the frost treatment', () => {
		const result = coverFacet.resolve(ctx([['scrim-type', 'gradient'], ['scrim-blur', 'lg']]));
		expect(result?.dataAttrs?.['data-scrim-blur']).toBeUndefined();
	});

	it('suppresses the treatment type when the scrim is off', () => {
		const result = coverFacet.resolve(ctx([['scrim', 'none'], ['scrim-type', 'frost']]));
		expect(result?.dataAttrs?.['data-scrim-type']).toBeUndefined();
	});

	it('maps an explicit scrim edge to a gradient direction', () => {
		expect(coverFacet.resolve(ctx([['scrim', 'top']]))?.styles).toEqual([['--cover-scrim-dir', 'to top']]);
	});

	describe('postAssemble — foreground polarity', () => {
		const overlay = () => makeTag('div', { 'data-name': 'content' }, []);

		it('flips the content overlay to a dark scheme by default', () => {
			const children = [overlay()];
			coverFacet.postAssemble!(ctx(), children);
			expect((children[0] as SerializedTag).attributes['data-color-scheme']).toBe('dark');
		});

		it('follows scrim-tone', () => {
			const children = [overlay()];
			coverFacet.postAssemble!(ctx([['scrim-tone', 'light']]), children);
			expect((children[0] as SerializedTag).attributes['data-color-scheme']).toBe('light');
		});

		it('leaves the overlay alone when the scrim is off', () => {
			const children = [overlay()];
			coverFacet.postAssemble!(ctx([['scrim', 'none']]), children);
			expect((children[0] as SerializedTag).attributes['data-color-scheme']).toBeUndefined();
		});

		it('yields to a scheme already claimed by tint or the bg layer', () => {
			const children = [overlay()];
			coverFacet.postAssemble!(ctx([], { 'media-position': 'cover', 'color-scheme': 'light' }), children);
			expect((children[0] as SerializedTag).attributes['data-color-scheme']).toBeUndefined();
		});

		it('leaves the root alone under header cover-scope', () => {
			const children = [overlay()];
			const config: RuneConfig = { block: 'card', rootAttributes: { 'data-cover-scope': 'header' } };
			coverFacet.postAssemble!(ctx([], { 'media-position': 'cover' }, config), children);
			expect((children[0] as SerializedTag).attributes['data-color-scheme']).toBeUndefined();
		});

		it('is a no-op when there is no content overlay', () => {
			const children = [makeTag('div', { 'data-name': 'media' }, [])];
			expect(() => coverFacet.postAssemble!(ctx(), children)).not.toThrow();
		});
	});
});

describe('cover ↔ content-place ordering', () => {
	// A minimal registry isolating the pair under test, plus the facets they
	// declare `after`: `modifiers` supplies `media-position` / `content-place`,
	// and `tint` is what cover's colour-scheme check yields to.
	const REGISTRY = orderFacets([modifiersFacet, tintFacet, contentPlaceFacet, coverFacet]);

	const CONFIG: RuneConfig = {
		block: 'card',
		modifiers: {
			'media-position': { source: 'attribute', noBemClass: true },
			'content-place': { source: 'attribute', noBemClass: true },
		},
	};

	const input = (attrs: Record<string, any>, children: SerializedTag[] = []): FacetInput => ({
		tag: makeTag('div', { 'data-rune': 'card', ...attrs }, children),
		config: CONFIG,
		block: 'rf-card',
		rune: 'card',
		fields: {},
		theme: { tints: {}, backgrounds: {}, frames: {} },
	});

	it('orders cover after content-place', () => {
		const names = REGISTRY.map(f => f.name);
		expect(names.indexOf('cover')).toBeGreaterThan(names.indexOf('content-place'));
	});

	it('orders both after the modifier facet that supplies their axes', () => {
		const names = REGISTRY.map(f => f.name);
		expect(names.indexOf('content-place')).toBeGreaterThan(names.indexOf('modifiers'));
		expect(names.indexOf('cover')).toBeGreaterThan(names.indexOf('modifiers'));
	});

	// The whole point of the ordering: both facets declare `--cover-scrim-dir`,
	// and cover's explicit edge must be the last declaration so CSS picks it.
	it('declares cover’s explicit direction after content-place’s derived one', () => {
		const result = runFacets(
			REGISTRY,
			input({ 'media-position': 'cover', 'content-place': 'start center' }, [meta('scrim', 'top')]),
			new WarningCollector(),
		);
		const dirs = result.styles.filter(([prop]) => prop === '--cover-scrim-dir');
		expect(dirs).toEqual([['--cover-scrim-dir', 'to bottom'], ['--cover-scrim-dir', 'to top']]);
	});

	it('runs both phases against a shared resolution', () => {
		const children = [makeTag('div', { 'data-name': 'content' }, [])];
		const facetInput = input({ 'media-position': 'cover' });
		const resolution = runFacets(REGISTRY, facetInput, new WarningCollector());
		runPostAssemble(REGISTRY, facetInput, resolution, children, new WarningCollector());
		expect(resolution.state.cover).toBe('true');
		expect((children[0] as SerializedTag).attributes['data-color-scheme']).toBe('dark');
	});
});
