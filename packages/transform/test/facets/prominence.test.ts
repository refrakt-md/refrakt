import { describe, it, expect } from 'vitest';
import { prominenceFacet, hasPageSectionHeader } from '../../src/facets/prominence.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext } from '../../src/facets/types.js';
import type { RuneConfig } from '../../src/types.js';

const HEADER_RUNE: RuneConfig = { block: 'recipe', sections: { preamble: 'preamble', headline: 'title' } };
const BARE_RUNE: RuneConfig = { block: 'badge' };

const ctx = (attrs: Record<string, any> = {}, config: RuneConfig = HEADER_RUNE, rune = 'recipe'): FacetContext => ({
	tag: makeTag('div', { 'data-rune': rune, ...attrs }, []),
	config,
	block: `rf-${config.block}`,
	rune,
	fields: {},
	theme: { tints: {}, backgrounds: {}, frames: {} },
	axis: () => undefined,
});

describe('hasPageSectionHeader', () => {
	it('is false for a rune with no sections', () => {
		expect(hasPageSectionHeader(undefined)).toBe(false);
	});

	it('is false when no section maps a header-ish role', () => {
		expect(hasPageSectionHeader({ main: 'body', end: 'footer' })).toBe(false);
	});

	for (const role of ['header', 'preamble', 'title', 'description']) {
		it(`is true when a section maps the "${role}" role`, () => {
			expect(hasPageSectionHeader({ zone: role })).toBe(true);
		});
	}
});

describe('prominence facet', () => {
	it('does not run when neither attribute nor default is set', () => {
		expect(prominenceFacet.appliesTo?.(ctx())).toBe(false);
	});

	it('runs when the author sets the attribute', () => {
		expect(prominenceFacet.appliesTo?.(ctx({ prominence: 'display' }))).toBe(true);
	});

	it('runs when only the rune default is set', () => {
		const config = { ...HEADER_RUNE, defaultProminence: 'display' as const };
		expect(prominenceFacet.appliesTo?.(ctx({}, config))).toBe(true);
	});

	it('resolves the authored attribute on a header-family rune', () => {
		expect(prominenceFacet.resolve(ctx({ prominence: 'display' }))).toEqual({ axes: { prominence: 'display' } });
	});

	it('emits no BEM class — the axis is styled by attribute', () => {
		expect(prominenceFacet.resolve(ctx({ prominence: 'display' }))?.classes).toBeUndefined();
	});

	it('falls back to the rune default', () => {
		const config = { ...HEADER_RUNE, block: 'hero', defaultProminence: 'display' as const };
		expect(prominenceFacet.resolve(ctx({}, config))).toEqual({ axes: { prominence: 'display' } });
	});

	it('lets the author override the rune default', () => {
		const config = { ...HEADER_RUNE, block: 'hero', defaultProminence: 'display' as const };
		expect(prominenceFacet.resolve(ctx({ prominence: 'quiet' }, config))).toEqual({ axes: { prominence: 'quiet' } });
	});

	describe('family gating', () => {
		it('drops the axis on a header-less rune', () => {
			const result = prominenceFacet.resolve(ctx({ prominence: 'display' }, BARE_RUNE, 'badge'));
			expect(result?.axes).toBeUndefined();
		});

		it('warns naming the rune the author wrote', () => {
			const result = prominenceFacet.resolve(ctx({ prominence: 'display' }, BARE_RUNE, 'badge'));
			expect(result?.warnings).toHaveLength(1);
			expect(result?.warnings?.[0].code).toBe('prominence-unsupported');
			expect(result?.warnings?.[0].message).toContain('prominence is not supported on "badge"');
		});

		it('gates the rune default too, not just authored values', () => {
			const config = { ...BARE_RUNE, defaultProminence: 'display' as const };
			const result = prominenceFacet.resolve(ctx({}, config, 'badge'));
			expect(result?.axes).toBeUndefined();
			expect(result?.warnings?.[0].code).toBe('prominence-unsupported');
		});
	});
});
