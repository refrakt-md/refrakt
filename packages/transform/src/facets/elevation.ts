import type { Facet } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

/** SPEC-107 — the chrome/depth ladder, ordered shallow to deep.
 *
 *  Exported as the axis vocabulary: plugin and theme authors need the closed
 *  set, and it is the same list the docs and schemas describe. */
export const ELEVATION_VALUES = ['sunken', 'flush', 'flat', 'raised', 'floating', 'overlay'] as const;

export type ElevationValue = (typeof ELEVATION_VALUES)[number];

/** The superseded shadow-only scale, kept as a deprecated alias.
 *
 *  `none` meant "keep the surface, drop the shadow" → `flat`, NOT `flush`
 *  (which strips the surface). `frame-shadow` keeps its own none/sm/md/lg
 *  scale and is unaffected — this is only the rune-surface `elevation`. */
const DEPRECATED_ALIAS: Record<string, ElevationValue> = {
	none: 'flat',
	sm: 'raised',
	md: 'raised',
	lg: 'floating',
};

/** `elevation` — the universal chrome/depth axis (SPEC-107).
 *
 *  Author attribute or the rune's `defaultElevation`. Emits `data-elevation`
 *  and no BEM class: the skin maps each rung to a chrome bundle by attribute.
 *
 *  Values outside the ladder pass through unchanged rather than being rejected;
 *  the closed vocabulary is enforced at parse time by the schema's `matches`. */
export const elevationFacet: Facet = {
	name: 'elevation',
	attributes: ['elevation'],

	resolve(ctx) {
		const raw = ctx.tag.attributes?.elevation ?? ctx.config.defaultElevation;
		if (typeof raw !== 'string' || raw === '') return null;

		const mapped = DEPRECATED_ALIAS[raw];
		if (mapped) {
			return {
				axes: { elevation: mapped },
				warnings: [{
					code: 'elevation-deprecated-alias',
					message: `[refrakt] elevation="${raw}" is deprecated (SPEC-107) — use "${mapped}". The alias will be removed in a future minor.`,
				}],
			};
		}

		return { axes: { elevation: raw } };
	},
};

/** Contract description (WORK-527). The vocabulary is {@link ELEVATION_VALUES}
 *  itself — the contract restates nothing. */
export const elevationAxis: UniversalAxisFacet = {
	axis: 'elevation',
	contract: {
		description: 'The chrome/depth ladder (SPEC-107). The skin maps each rung to a chrome bundle by attribute, so there is no BEM class.',
		source: 'attribute',
		inputs: ['elevation'],
		values: ELEVATION_VALUES,
		dataAttributes: ['data-elevation'],
		condition: 'emitted only when the author sets it or the rune declares `defaultElevation`',
	},
	describeForRune: (config) => (config.defaultElevation ? { default: config.defaultElevation } : null),
};
