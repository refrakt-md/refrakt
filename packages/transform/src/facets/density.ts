import type { Facet } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

/** SPEC-025 — the density scale. */
export const DENSITY_VALUES = ['full', 'compact', 'minimal'] as const;

export type DensityValue = (typeof DENSITY_VALUES)[number];

/** `density` — how tightly a rune packs its content.
 *
 *  Resolution order: author attribute ▸ the parent rune's `childDensity` ▸ this
 *  rune's `defaultDensity` ▸ `full`. The parent step makes this the only axis
 *  that reads config other than its own, which is why `FacetContext` carries
 *  `parentConfig`.
 *
 *  Published as state rather than an emitted axis: `data-density` is always
 *  present on a rune root, at a fixed position the engine owns, unlike the
 *  conditional `data-*` attributes the axis channel produces. */
export const densityFacet: Facet = {
	name: 'density',
	attributes: ['density'],
	resolve: (ctx) => ({
		state: {
			density: String(
				ctx.tag.attributes?.density
				?? ctx.parentConfig?.childDensity
				?? ctx.config.defaultDensity
				?? 'full',
			),
		},
	}),
};

/** Contract description (WORK-527).
 *
 *  The rune-level `default` is `defaultDensity` only. The *effective* default
 *  also depends on where the rune is nested (a parent's `childDensity` beats
 *  it), which no static contract can settle — the condition says so rather than
 *  the contract claiming a value it cannot know. */
export const densityAxis: UniversalAxisFacet = {
	axis: 'density',
	contract: {
		description: 'How tightly a rune packs its content (SPEC-025).',
		source: 'attribute',
		inputs: ['density'],
		values: DENSITY_VALUES,
		default: 'full',
		dataAttributes: ['data-density'],
		condition: 'always present on the rune root; resolution is author ▸ the parent rune\'s `childDensity` ▸ this rune\'s `defaultDensity` ▸ `full`',
	},
	describeForRune: (config) => (config.defaultDensity ? { default: config.defaultDensity } : null),
};
