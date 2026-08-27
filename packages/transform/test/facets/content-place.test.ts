import { describe, it, expect } from 'vitest';
import { contentPlaceFacet } from '../../src/facets/content-place.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext } from '../../src/facets/types.js';

const ctx = (contentPlace?: string, mediaPosition = 'cover'): FacetContext => ({
	tag: makeTag('div', { 'data-rune': 'card' }, []),
	config: { block: 'card' },
	block: 'rf-card',
	rune: 'card',
	fields: {},
	theme: { tints: {}, backgrounds: {}, frames: {} },
	axis: (name) => (name === 'content-place' ? contentPlace : name === 'media-position' ? mediaPosition : undefined),
});

describe('content-place facet', () => {
	it('does not run when the axis is unset', () => {
		expect(contentPlaceFacet.appliesTo?.(ctx(undefined))).toBe(false);
	});

	// `media-position` is a config-declared modifier, so the generic modifier
	// facet is what supplies the axis this one branches on.
	it('declares its dependency on the modifier facet', () => {
		expect(contentPlaceFacet.after).toEqual(['modifiers']);
	});

	it('leaves `auto` to the container query', () => {
		expect(contentPlaceFacet.resolve(ctx('auto'))).toBeNull();
	});

	it('maps the two logical axes', () => {
		expect(contentPlaceFacet.resolve(ctx('end start'))?.styles).toEqual([
			['--cover-place-block', 'end'],
			['--cover-place-inline', 'start'],
		]);
	});

	it('accepts a block axis alone', () => {
		expect(contentPlaceFacet.resolve(ctx('end'))?.styles).toEqual([['--cover-place-block', 'end']]);
	});

	it('tolerates irregular whitespace', () => {
		expect(contentPlaceFacet.resolve(ctx('  end   start  '))?.styles).toEqual([
			['--cover-place-block', 'end'],
			['--cover-place-inline', 'start'],
		]);
	});

	describe('scrim follows the content edge', () => {
		it('flips the gradient for a start-anchored overlay', () => {
			const styles = contentPlaceFacet.resolve(ctx('start'))?.styles ?? [];
			expect(styles).toContainEqual(['--cover-scrim-dir', 'to bottom']);
		});

		it('emits a radial scrim and mask for a centred overlay', () => {
			const styles = contentPlaceFacet.resolve(ctx('center'))?.styles ?? [];
			const props = styles.map(([prop]) => prop);
			expect(props).toContain('--cover-scrim-image');
			expect(props).toContain('--cover-scrim-mask');
		});

		it('leaves an end-anchored overlay on the linear default', () => {
			const props = (contentPlaceFacet.resolve(ctx('end'))?.styles ?? []).map(([prop]) => prop);
			expect(props).not.toContain('--cover-scrim-dir');
			expect(props).not.toContain('--cover-scrim-image');
		});
	});

	describe('gating outside cover mode', () => {
		it('emits no styles', () => {
			expect(contentPlaceFacet.resolve(ctx('end', 'inline'))?.styles).toBeUndefined();
		});

		it('warns once per rune', () => {
			const warning = contentPlaceFacet.resolve(ctx('end', 'inline'))?.warnings?.[0];
			expect(warning?.code).toBe('content-place-outside-cover');
			expect(warning?.dedupeKey).toBe('card');
			expect(warning?.message).toContain('only active in `media-position="cover"`');
		});
	});
});
