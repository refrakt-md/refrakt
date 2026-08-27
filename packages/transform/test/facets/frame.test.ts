import { describe, it, expect } from 'vitest';
import { frameFacet } from '../../src/facets/frame.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext, FacetTheme } from '../../src/facets/types.js';
import type { ChromeCarry } from '../../src/facets/chrome.js';
import type { RuneConfig, FramePresetDefinition } from '../../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const FRAMES: Record<string, FramePresetDefinition> = {
	polaroid: { aspect: '1/1', shadow: 'lg' },
	tilted: { extends: 'polaroid', displace: 'top' },
};

const theme = (frames = FRAMES): FacetTheme => ({ tints: {}, backgrounds: {}, frames });

const meta = (field: string, content: string) => makeTag('meta', { 'data-field': field, content }, []);

/** A rune with a media section — the default frame target. */
const MEDIA_RUNE: RuneConfig = { block: 'card', sections: { visual: 'media' } };
/** A rune with no media section and no configured frameTarget — untargetable. */
const BARE_RUNE: RuneConfig = { block: 'badge' };

const ctx = (metas: Array<[string, string]>, config: RuneConfig = MEDIA_RUNE, rune = 'card'): FacetContext => ({
	tag: makeTag('div', { 'data-rune': rune }, metas.map(([f, c]) => meta(f, c))),
	config,
	block: `rf-${config.block}`,
	rune,
	fields: {},
	theme: theme(),
	axis: () => undefined,
});

const carryOf = (result: ReturnType<typeof frameFacet.resolve>) => result?.carry as ChromeCarry;

describe('frame facet', () => {
	it('contributes nothing when no frame meta is present', () => {
		expect(frameFacet.resolve(ctx([]))).toBeNull();
	});

	it('resolves a named preset', () => {
		const result = frameFacet.resolve(ctx([['frame', 'polaroid']], { ...MEDIA_RUNE, frameTarget: 'self' }));
		expect(result?.dataAttrs).toEqual({ 'data-frame': 'polaroid', 'data-frame-shadow': 'lg' });
		expect(result?.styles).toEqual([['--frame-aspect', '1/1']]);
	});

	it('resolves one level of preset `extends`', () => {
		const result = frameFacet.resolve(ctx([['frame', 'tilted']], { ...MEDIA_RUNE, frameTarget: 'self' }));
		expect(result?.dataAttrs).toMatchObject({ 'data-frame': 'tilted', 'data-displace': 'top', 'data-frame-shadow': 'lg' });
	});

	it('lets an inline facet override the preset', () => {
		const result = frameFacet.resolve(ctx([['frame', 'polaroid'], ['frame-shadow', 'sm']], { ...MEDIA_RUNE, frameTarget: 'self' }));
		expect(result?.dataAttrs?.['data-frame-shadow']).toBe('sm');
	});

	it('works from inline facets alone, with no preset', () => {
		const result = frameFacet.resolve(ctx([['frame-aspect', '16/9']], { ...MEDIA_RUNE, frameTarget: 'self' }));
		expect(result?.styles).toEqual([['--frame-aspect', '16/9']]);
		expect(result?.dataAttrs?.['data-frame']).toBeUndefined();
	});

	it('consumes every frame meta it read', () => {
		const result = frameFacet.resolve(ctx([['frame', 'polaroid'], ['frame-offset', 'md']]));
		expect(result?.consumes).toEqual(['frame', 'frame-offset']);
	});

	describe('target resolution', () => {
		it('defaults to the media zone when the rune has a media section', () => {
			expect(carryOf(frameFacet.resolve(ctx([['frame', 'polaroid']]))).target).toBe('media');
		});

		it('honours an explicit frameTarget: self', () => {
			const result = frameFacet.resolve(ctx([['frame', 'polaroid']], { ...MEDIA_RUNE, frameTarget: 'self' }));
			expect(carryOf(result).target).toBe('self');
		});

		it('puts self-target chrome on the resolution, for the root', () => {
			const result = frameFacet.resolve(ctx([['frame', 'polaroid']], { ...MEDIA_RUNE, frameTarget: 'self' }));
			expect(result?.dataAttrs).toBeDefined();
		});

		it('keeps media-target chrome off the resolution — it belongs to the media zone', () => {
			const result = frameFacet.resolve(ctx([['frame', 'polaroid']]));
			expect(result?.dataAttrs).toBeUndefined();
			expect(result?.styles).toBeUndefined();
		});

		it('warns and targets nothing on a rune with no media section', () => {
			const result = frameFacet.resolve(ctx([['frame', 'polaroid']], BARE_RUNE, 'badge'));
			expect(carryOf(result).target).toBeNull();
			expect(result?.warnings?.[0].code).toBe('frame-no-target');
		});

		it('still consumes its metas when it targets nothing, so they cannot leak', () => {
			const result = frameFacet.resolve(ctx([['frame', 'polaroid']], BARE_RUNE, 'badge'));
			expect(result?.consumes).toEqual(['frame']);
		});
	});

	describe('displace mode inherits the host containment (SPEC-086)', () => {
		it('defaults to bleed on a bleed host', () => {
			const config: RuneConfig = { ...MEDIA_RUNE, frameTarget: 'self', guestFit: 'bleed' };
			const result = frameFacet.resolve(ctx([['frame-displace', 'top']], config));
			expect(result?.dataAttrs?.['data-displace-mode']).toBe('bleed');
		});

		it('leaves the default alone on a clip host', () => {
			const config: RuneConfig = { ...MEDIA_RUNE, frameTarget: 'self', guestFit: 'clip' };
			const result = frameFacet.resolve(ctx([['frame-displace', 'top']], config));
			expect(result?.dataAttrs?.['data-displace-mode']).toBeUndefined();
		});

		it('an explicit mode still wins on a bleed host', () => {
			const config: RuneConfig = { ...MEDIA_RUNE, frameTarget: 'self', guestFit: 'bleed' };
			const result = frameFacet.resolve(ctx([['frame-displace', 'top'], ['frame-displace-mode', 'peek']], config));
			expect(result?.dataAttrs?.['data-displace-mode']).toBe('peek');
		});
	});

	describe('frame-overflow="bleed" (SPEC-116)', () => {
		it('is kept on a bleed host', () => {
			const config: RuneConfig = { ...MEDIA_RUNE, frameTarget: 'self', guestFit: 'bleed' };
			const result = frameFacet.resolve(ctx([['frame-overflow', 'bleed']], config));
			expect(result?.dataAttrs?.['data-frame-overflow']).toBe('bleed');
			expect(result?.warnings).toBeUndefined();
		});

		it('is stripped with a warning on a clip host — the marker would be inert', () => {
			const config: RuneConfig = { ...MEDIA_RUNE, frameTarget: 'self', guestFit: 'clip' };
			const result = frameFacet.resolve(ctx([['frame-overflow', 'bleed']], config));
			expect(result?.dataAttrs?.['data-frame-overflow']).toBeUndefined();
			expect(result?.warnings?.[0].code).toBe('frame-overflow-on-clip-host');
		});

		it('leaves a non-bleed overflow value alone', () => {
			const config: RuneConfig = { ...MEDIA_RUNE, frameTarget: 'self', guestFit: 'clip' };
			const result = frameFacet.resolve(ctx([['frame-overflow', 'clip']], config));
			expect(result?.warnings).toBeUndefined();
		});
	});

	describe('postAssemble — media target', () => {
		const mediaZone = () => makeTag('div', { 'data-section': 'media' }, []);

		it('lands the chrome on the media zone', () => {
			const c = ctx([['frame', 'polaroid']]);
			const children = [mediaZone()];
			frameFacet.postAssemble!(c, children, frameFacet.resolve(c)!.carry);
			const zone = children[0] as SerializedTag;
			expect(zone.attributes['data-frame']).toBe('polaroid');
			expect(zone.attributes.style).toBe('--frame-aspect: 1/1');
		});

		it('appends to an existing inline style rather than replacing it', () => {
			const c = ctx([['frame', 'polaroid']]);
			const children = [makeTag('div', { 'data-section': 'media', style: 'color: red' }, [])];
			frameFacet.postAssemble!(c, children, frameFacet.resolve(c)!.carry);
			expect((children[0] as SerializedTag).attributes.style).toBe('color: red; --frame-aspect: 1/1');
		});

		it('finds a nested media zone', () => {
			const c = ctx([['frame', 'polaroid']]);
			const inner = mediaZone();
			const children = [makeTag('div', {}, [inner])];
			frameFacet.postAssemble!(c, children, frameFacet.resolve(c)!.carry);
			expect(inner.attributes['data-frame']).toBe('polaroid');
		});

		it('warns when the media zone never materialised', () => {
			const c = ctx([['frame', 'polaroid']]);
			const warnings = frameFacet.postAssemble!(c, [], frameFacet.resolve(c)!.carry);
			expect(warnings?.[0].code).toBe('frame-no-target');
		});

		it('is a no-op for self-target chrome — the root was handled in resolve', () => {
			const c = ctx([['frame', 'polaroid']], { ...MEDIA_RUNE, frameTarget: 'self' });
			const children = [mediaZone()];
			frameFacet.postAssemble!(c, children, frameFacet.resolve(c)!.carry);
			expect((children[0] as SerializedTag).attributes['data-frame']).toBeUndefined();
		});
	});
});
