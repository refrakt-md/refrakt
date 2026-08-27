import { describe, it, expect } from 'vitest';
import { elevationFacet, ELEVATION_VALUES } from '../../src/facets/elevation.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext } from '../../src/facets/types.js';
import type { RuneConfig } from '../../src/types.js';

/** Build a context directly — no ThemeConfig, no createTransform, no tree walk.
 *  A failure here localises to the facet rather than to "something in the
 *  transform produced the wrong attribute". */
const ctx = (attrs: Record<string, any> = {}, config: RuneConfig = { block: 'card' }): FacetContext => ({
	tag: makeTag('div', { 'data-rune': 'card', ...attrs }, []),
	config,
	block: 'rf-card',
	rune: 'card',
	axis: () => undefined,
});

describe('elevation facet', () => {
	it('contributes nothing when neither attribute nor default is set', () => {
		expect(elevationFacet.resolve(ctx())).toBeNull();
	});

	it('resolves the authored attribute to the elevation axis', () => {
		expect(elevationFacet.resolve(ctx({ elevation: 'raised' }))).toEqual({ axes: { elevation: 'raised' } });
	});

	it('emits no BEM class — the axis is styled by attribute', () => {
		expect(elevationFacet.resolve(ctx({ elevation: 'raised' }))?.classes).toBeUndefined();
	});

	it('falls back to the rune default', () => {
		const result = elevationFacet.resolve(ctx({}, { block: 'chart', defaultElevation: 'sunken' }));
		expect(result).toEqual({ axes: { elevation: 'sunken' } });
	});

	it('lets the author override the rune default', () => {
		const result = elevationFacet.resolve(ctx({ elevation: 'raised' }, { block: 'chart', defaultElevation: 'sunken' }));
		expect(result).toEqual({ axes: { elevation: 'raised' } });
	});

	it('treats an empty attribute as absent', () => {
		expect(elevationFacet.resolve(ctx({ elevation: '' }))).toBeNull();
	});

	it('passes every ladder value through unchanged', () => {
		for (const value of ELEVATION_VALUES) {
			expect(elevationFacet.resolve(ctx({ elevation: value }))).toEqual({ axes: { elevation: value } });
		}
	});

	describe('deprecated shadow-scale aliases', () => {
		const cases: Array<[string, string]> = [
			['none', 'flat'],   // keeps the surface — NOT flush
			['sm', 'raised'],
			['md', 'raised'],
			['lg', 'floating'],
		];

		for (const [old, mapped] of cases) {
			it(`maps "${old}" → "${mapped}" and returns a warning`, () => {
				const result = elevationFacet.resolve(ctx({ elevation: old }));
				expect(result?.axes).toEqual({ elevation: mapped });
				expect(result?.warnings).toHaveLength(1);
				expect(result?.warnings?.[0].code).toBe('elevation-deprecated-alias');
			});
		}

		it('never maps "none" to "flush" — that would strip the surface', () => {
			expect(elevationFacet.resolve(ctx({ elevation: 'none' }))?.axes?.elevation).not.toBe('flush');
		});

		// Asserted on returned data rather than a console spy. The engine still
		// prints this string; the existing integration test covers that.
		it('warns without a dedupe key, so every deprecated instance is reported', () => {
			const warning = elevationFacet.resolve(ctx({ elevation: 'sm' }))?.warnings?.[0];
			expect(warning?.dedupeKey).toBeUndefined();
			expect(warning?.message).toContain('elevation="sm" is deprecated');
		});
	});
});
