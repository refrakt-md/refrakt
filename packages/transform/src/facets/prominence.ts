import type { Facet } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

/** SPEC-107 — the header-emphasis vocabulary, ordered quiet to loud. */
export const PROMINENCE_VALUES = ['quiet', 'normal', 'prominent', 'display'] as const;

export type ProminenceValue = (typeof PROMINENCE_VALUES)[number];

/** Section roles that constitute a page-section header. */
const HEADER_SECTION_ROLES = new Set(['header', 'preamble', 'title', 'description']);

/** A rune "has a header" when its `sections` map includes a header-ish role. */
export function hasPageSectionHeader(sections: Record<string, string> | undefined): boolean {
	return !!sections && Object.values(sections).some(role => HEADER_SECTION_ROLES.has(role));
}

/** `prominence` — the header-emphasis axis (SPEC-107).
 *
 *  A *family* axis: it scales a rune's page-section header, so it is only
 *  meaningful on runes that have one. On a header-less rune it has nothing to
 *  scale, so it is dropped with a dev warning rather than silently honoured.
 *
 *  Emits `data-prominence` and no BEM class; the skin maps it to a type
 *  register by attribute. */
export const prominenceFacet: Facet = {
	name: 'prominence',
	attributes: ['prominence'],

	appliesTo: (ctx) => Boolean(ctx.tag.attributes?.prominence ?? ctx.config.defaultProminence),

	resolve(ctx) {
		const value = ctx.tag.attributes?.prominence ?? ctx.config.defaultProminence;

		if (!hasPageSectionHeader(ctx.config.sections)) {
			return {
				warnings: [{
					code: 'prominence-unsupported',
					message: `[refrakt] prominence is not supported on "${ctx.rune}" — it applies only to runes with a page-section header. Ignored.`,
				}],
			};
		}

		return { axes: { prominence: String(value) } };
	},
};

/** Contract description (WORK-527).
 *
 *  The unavailability is worth recording per rune: an author can write
 *  `prominence=` on any rune, and on a header-less one the engine drops it with
 *  a warning. The contract now says so ahead of the warning. */
export const prominenceAxis: UniversalAxisFacet = {
	axis: 'prominence',
	describeAxis: () => ({
		description: 'Header emphasis (SPEC-107). Scales a rune\'s page-section header; the skin maps it to a type register by attribute, so there is no BEM class.',
		source: 'attribute',
		inputs: ['prominence'],
		values: PROMINENCE_VALUES,
		dataAttributes: ['data-prominence'],
		condition: 'requires a page-section header — a `sections` role of header, preamble, title or description. Dropped with a warning otherwise.',
	}),
	describeForRune: (config) => {
		if (!hasPageSectionHeader(config.sections)) return 'this rune has no page-section header';
		return config.defaultProminence ? { default: config.defaultProminence } : null;
	},
};
