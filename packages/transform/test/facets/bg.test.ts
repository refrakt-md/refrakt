import { describe, it, expect } from 'vitest';
import { bgFacet, buildBgGradient } from '../../src/facets/bg.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext, FacetTheme } from '../../src/facets/types.js';
import type { BgPresetDefinition } from '../../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const PRESETS: Record<string, BgPresetDefinition> = {
	mesh: { style: { '--mesh': 'on' }, gradient: { direction: 'to-r', stops: ['primary', 'surface'] } },
	meshDark: { extends: 'mesh', style: { '--tone': 'dark' } },
	plain: { style: { '--plain': '1' } },
};

const theme = (backgrounds = PRESETS): FacetTheme => ({ tints: {}, backgrounds, frames: {} });

const meta = (field: string, content: string) => makeTag('meta', { 'data-field': field, content }, []);

const ctx = (
	metas: Array<[string, string]> = [],
	axes: Record<string, string | undefined> = {},
	extraChildren: SerializedTag[] = [],
): FacetContext => ({
	tag: makeTag('div', { 'data-rune': 'hero' }, [...metas.map(([f, c]) => meta(f, c)), ...extraChildren]),
	config: { block: 'hero' },
	block: 'rf-hero',
	rune: 'hero',
	theme: theme(),
	axis: (name) => axes[name],
});

/** The `[data-name="bg"]` layer the facet builds. */
const layerOf = (result: ReturnType<typeof bgFacet.resolve>) => result?.layers?.[0].element as SerializedTag;
const childNames = (layer: SerializedTag) =>
	layer.children.map(c => (c as SerializedTag).attributes['data-name']);

describe('buildBgGradient', () => {
	it('needs at least two stops', () => {
		expect(buildBgGradient({ stops: ['primary'] })).toBeNull();
	});

	it('resolves bare token names against the colour tokens', () => {
		expect(buildBgGradient({ stops: ['primary', 'surface'] }))
			.toBe('linear-gradient(to bottom, var(--rf-color-primary), var(--rf-color-surface))');
	});

	it('passes the transparent keyword through verbatim', () => {
		expect(buildBgGradient({ stops: ['transparent', 'primary'] })).toContain('transparent, var(--rf-color-primary)');
	});

	it('mixes a token at fractional alpha', () => {
		expect(buildBgGradient({ stops: ['primary/0.5', 'surface'] }))
			.toContain('color-mix(in srgb, var(--rf-color-primary) 50%, transparent)');
	});

	it('accepts percent alpha', () => {
		expect(buildBgGradient({ stops: ['primary/40%', 'surface'] }))
			.toContain('var(--rf-color-primary) 40%');
	});

	// Pre-existing quirk, preserved verbatim by the migration: the out-of-range
	// fallback interpolates the *whole* stop, slash included, so it emits
	// `var(--rf-color-primary/900)` — not a valid custom-property name. Asserted
	// as-is rather than fixed, since this refactor is behaviour-preserving.
	it('falls back to interpolating the raw stop for out-of-range alpha', () => {
		expect(buildBgGradient({ stops: ['primary/900', 'surface'] })).toContain('var(--rf-color-primary/900)');
	});

	it('honours the named direction set', () => {
		expect(buildBgGradient({ direction: 'to-tr', stops: ['a', 'b'] })).toContain('linear-gradient(to top right,');
	});

	it('falls back to `to bottom` for an unknown direction', () => {
		expect(buildBgGradient({ direction: 'sideways', stops: ['a', 'b'] })).toContain('linear-gradient(to bottom,');
	});

	for (const [type, fn] of [['radial', 'radial-gradient'], ['conic', 'conic-gradient']] as const) {
		it(`builds a ${type} gradient`, () => {
			expect(buildBgGradient({ type, stops: ['a', 'b'] })).toContain(`${fn}(`);
		});
	}
});

describe('bg facet', () => {
	it('contributes nothing without a trigger', () => {
		expect(bgFacet.resolve(ctx())).toBeNull();
	});

	it('does not raise the layer for facets that need a trigger', () => {
		expect(bgFacet.resolve(ctx([['bg-blur', 'lg']]))).toBeNull();
	});

	it('marks the host and raises the layer', () => {
		const result = bgFacet.resolve(ctx([['bg-src', '/hero.jpg']]));
		expect(result?.classes).toEqual(['rf-hero--has-bg']);
		expect(result?.dataAttrs).toMatchObject({ 'data-bg': '' });
		expect(result?.layers).toHaveLength(1);
		expect(result?.layers?.[0].placement).toBe('before-content');
	});

	it('claims every bg meta once raised', () => {
		const result = bgFacet.resolve(ctx([['bg-src', '/hero.jpg']]));
		expect(result?.consumes).toContain('bg-src');
		expect(result?.consumes).toContain('scrim-tone');
	});

	it('leaves metas unclaimed when nothing raised the layer, as before', () => {
		expect(bgFacet.resolve(ctx([['bg-blur', 'lg']]))?.consumes).toBeUndefined();
	});

	describe('the layer element', () => {
		it('puts an image on the base layer', () => {
			expect(layerOf(bgFacet.resolve(ctx([['bg-src', '/h.jpg']]))).attributes.style)
				.toBe('--bg-image: url(/h.jpg)');
		});

		it('lets a gradient fill the base when there is no image', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-from', 'primary'], ['bg-to', 'surface']])));
			expect(layer.attributes.style).toContain('--bg-image: linear-gradient(');
		});

		it('prefers the image over the gradient when both are present', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-src', '/h.jpg'], ['bg-from', 'a'], ['bg-to', 'b']])));
			expect(layer.attributes.style).toBe('--bg-image: url(/h.jpg)');
		});

		it('maps the blur scale', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-src', '/h.jpg'], ['bg-blur', 'lg']])));
			expect(layer.attributes.style).toContain('--bg-blur: 16px');
		});

		it('passes an off-scale blur through as a raw value', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-src', '/h.jpg'], ['bg-blur', '3px']])));
			expect(layer.attributes.style).toContain('--bg-blur: 3px');
		});

		it('marks a fixed background', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-src', '/h.jpg'], ['bg-fixed', 'true']])));
			expect(layer.attributes['data-bg-fixed']).toBe('');
		});
	});

	describe('presets', () => {
		it('applies preset styles and names the preset', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-preset', 'plain']])));
			expect(layer.attributes['data-bg-preset']).toBe('plain');
			expect(layer.attributes.style).toContain('--plain: 1');
		});

		it('resolves one level of `extends`, merging styles', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-preset', 'meshDark']])));
			expect(layer.attributes.style).toContain('--mesh: on');
			expect(layer.attributes.style).toContain('--tone: dark');
		});

		it('uses a preset gradient when the author supplies none', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-preset', 'mesh']])));
			expect(layer.attributes.style).toContain('--bg-image: linear-gradient(to right');
		});

		it('lets an inline direction override the preset gradient’s', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-preset', 'mesh'], ['bg-gradient', 'to-t']])));
			expect(layer.attributes.style).toContain('linear-gradient(to top');
		});

		it('keeps the preset stops when fewer than two inline stops are given', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-preset', 'mesh'], ['bg-from', 'muted']])));
			expect(layer.attributes.style).toContain('var(--rf-color-primary)');
		});
	});

	describe('video', () => {
		it('adds a video branch above the overlay', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-video', '/loop.mp4'], ['bg-overlay', 'dark']])));
			expect(childNames(layer)).toEqual(['bg-video', 'bg-overlay']);
		});

		it('does not put the image variable on the video element', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-video', '/l.mp4'], ['bg-src', '/h.jpg'], ['bg-opacity', '0.5']])));
			const video = layer.children[0] as SerializedTag;
			expect(video.attributes.style).toBe('--bg-opacity: 0.5');
		});
	});

	describe('overlay', () => {
		it('uses the structured vocabulary', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-overlay', 'dark']])));
			expect((layer.children[0] as SerializedTag).attributes['data-bg-overlay']).toBe('dark');
		});

		it('resolves a token reference to a colour variable', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-overlay', 'primary']])));
			expect((layer.children[0] as SerializedTag).attributes.style).toBe('background: var(--rf-color-primary)');
		});

		it('applies overlay opacity', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['bg-overlay', 'primary'], ['bg-overlay-opacity', '0.4']])));
			expect((layer.children[0] as SerializedTag).attributes.style).toContain('opacity: 0.4');
		});

		it('still accepts raw CSS, with a deprecation warning', () => {
			const result = bgFacet.resolve(ctx([['bg-overlay', 'rgba(0,0,0,.5)']]));
			expect((layerOf(result).children[0] as SerializedTag).attributes.style).toBe('background: rgba(0,0,0,.5)');
			expect(result?.warnings?.[0].code).toBe('raw-css-overlay');
		});
	});

	describe('scrim', () => {
		it('adds a gradient scrim with the strength scale', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['scrim', 'to-t'], ['scrim-strength', 'lg']])));
			const scrim = layer.children[0] as SerializedTag;
			expect(scrim.attributes['data-scrim']).toBe('gradient');
			expect(scrim.attributes.style).toBe('--scrim-strength: 0.8');
		});

		it('uses the blur scale for a frost scrim instead', () => {
			const layer = layerOf(bgFacet.resolve(ctx([['scrim', 'to-t'], ['scrim-type', 'frost'], ['scrim-blur', 'sm']])));
			expect((layer.children[0] as SerializedTag).attributes.style).toBe('--scrim-blur: 4px');
		});

		it('flips the foreground polarity to the scrim tone', () => {
			const result = bgFacet.resolve(ctx([['scrim', 'to-t'], ['scrim-tone', 'light']]));
			expect(result?.dataAttrs?.['data-color-scheme']).toBe('light');
			expect(result?.state).toEqual({ 'color-scheme': 'light' });
		});

		it('yields to a scheme tint already claimed', () => {
			const result = bgFacet.resolve(ctx([['scrim', 'to-t']], { 'color-scheme': 'dark' }));
			expect(result?.dataAttrs?.['data-color-scheme']).toBeUndefined();
			expect(result?.state).toBeUndefined();
		});

		it('treats scrim="none" as no scrim at all', () => {
			expect(bgFacet.resolve(ctx([['scrim', 'none']]))).toBeNull();
		});

		// SPEC-089: in cover mode the media well owns the scrim, so it alone does
		// not raise the self-surface layer.
		it('does not raise the layer on its own in cover mode', () => {
			expect(bgFacet.resolve(ctx([['scrim', 'to-t']], { cover: 'true' }))).toBeNull();
		});

		it('still raises the layer in cover mode when an image is present', () => {
			const result = bgFacet.resolve(ctx([['scrim', 'to-t'], ['bg-src', '/h.jpg']], { cover: 'true' }));
			expect(childNames(layerOf(result))).toEqual([]);  // no scrim child — it went to the media well
		});
	});

	describe('sandbox guest (SPEC-104)', () => {
		const guest = () => makeTag('div', { 'data-bg-guest': '' }, []);

		it('raises the layer on its own', () => {
			const g = guest();
			expect(bgFacet.resolve(ctx([], {}, [g]))?.layers).toHaveLength(1);
		});

		it('relocates the guest into the layer', () => {
			const g = guest();
			const layer = layerOf(bgFacet.resolve(ctx([], {}, [g])));
			expect(layer.children).toContain(g);
		});

		it('absorbs it so the flow copy is dropped', () => {
			const g = guest();
			expect(bgFacet.resolve(ctx([], {}, [g]))?.absorbs).toEqual([g]);
		});

		it('sits between the video branch and the overlay', () => {
			const g = guest();
			const layer = layerOf(bgFacet.resolve(ctx([['bg-video', '/l.mp4'], ['bg-overlay', 'dark']], {}, [g])));
			expect(layer.children[1]).toBe(g);
		});

		it('absorbs nothing when there is no guest', () => {
			expect(bgFacet.resolve(ctx([['bg-src', '/h.jpg']]))?.absorbs).toBeUndefined();
		});
	});
});
