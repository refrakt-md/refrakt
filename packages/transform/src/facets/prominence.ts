import type { RuneConfig } from '../types.js';
import type { Facet } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

/** SPEC-107 — the header-emphasis vocabulary, ordered quiet to loud. `marquee`
 *  (SPEC-183 D1) is a landing page's opening band. */
export const PROMINENCE_VALUES = ['quiet', 'normal', 'prominent', 'display', 'marquee'] as const;

export type ProminenceValue = (typeof PROMINENCE_VALUES)[number];

/** Section roles that constitute a page-section header. */
const HEADER_SECTION_ROLES = new Set(['header', 'preamble', 'title', 'description']);

/** A rune "has a header" when its `sections` map includes a header-ish role. */
export function hasPageSectionHeader(sections: Record<string, string> | undefined): boolean {
	return !!sections && Object.values(sections).some((role) => HEADER_SECTION_ROLES.has(role));
}

/** SPEC-185 D9 — the capability a rune declares (`RuneConfig.provides`) when it
 *  renders a featured quotation or an excerpt: the quote is the centrepiece of
 *  its block, as a header is, so it takes the same loudness axis. */
export const FEATURED_QUOTATION_CAPABILITY = 'featured-quotation';

/** Whether `prominence` has something to scale on this rune: a page-section
 *  header, or a featured quotation (SPEC-185 D9). */
export function takesProminence(config: Pick<RuneConfig, 'sections' | 'provides'>): boolean {
	return (
		hasPageSectionHeader(config.sections) ||
		(config.provides?.includes(FEATURED_QUOTATION_CAPABILITY) ?? false)
	);
}

const NO_PROMINENCE_REASON = 'this rune has no page-section header or featured quotation';

/** `prominence` — the header-emphasis axis (SPEC-107).
 *
 *  A *family* axis: it scales a rune's page-section header, or its featured
 *  quotation (SPEC-185 D9), so it is only meaningful on runes that have one. On a header-less rune it has nothing to
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

		if (!takesProminence(ctx.config)) {
			return {
				warnings: [
					{
						code: 'prominence-unsupported',
						message: `[refrakt] prominence is not supported on "${ctx.rune}" — it applies only to runes with a page-section header or a featured quotation. Ignored.`,
					},
				],
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
	placement: 'header',
	contract: {
		description:
			"Header emphasis. Scales a rune's header, or its featured quotation; the theme decides the type size for each step.",
		source: 'attribute',
		inputs: ['prominence'],
		values: PROMINENCE_VALUES,
		dataAttributes: ['data-prominence'],
		condition:
			'requires a page-section header — a `sections` role of header, preamble, title or description — or the `featured-quotation` capability. Dropped with a warning otherwise.',
	},
	describeForRune: (config) => {
		if (!takesProminence(config)) return NO_PROMINENCE_REASON;
		return config.defaultProminence ? { default: config.defaultProminence } : null;
	},
};
