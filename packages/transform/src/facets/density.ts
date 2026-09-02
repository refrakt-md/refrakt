import type { Facet } from './types.js';

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
