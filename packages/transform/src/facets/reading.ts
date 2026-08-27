import { resolveReading, READING_CAPABILITIES, DEFAULT_READING } from '../reading.js';
import type { Facet } from './types.js';

export { READING_REGISTERS, READING_CAPABILITIES, DEFAULT_READING } from '../reading.js';

/** `reading` — SPEC-108 editorial register for body text.
 *
 *  Author `reading=` ▸ the rune's `defaultReading` ▸ `ui`. (A region default
 *  applies only to the bare body, not to runes.) Emitted as `data-reading` on
 *  the rune's `[data-section="body"]` element, which the engine applies during
 *  child assembly — so the value is published as state rather than as an axis,
 *  and suppressed at the `ui` default so unmarked content stays unchanged. */
export const readingFacet: Facet = {
	name: 'reading',
	resolve: (ctx) => ({
		state: {
			reading: resolveReading({
				authorAttr: ctx.tag.attributes?.reading,
				runeDefault: ctx.config.defaultReading,
			}),
		},
	}),
};

/** `dropcap` — SPEC-108 per-instance opt-in, honoured only on a prose body.
 *
 *  Declares `after: ['reading']`: the capability gate reads the resolved
 *  register, a constraint that previously held only because the two blocks sat
 *  five lines apart. Off-register the request is dropped with a warning rather
 *  than rendered somewhere it means nothing. */
export const dropcapFacet: Facet = {
	name: 'dropcap',
	after: ['reading'],

	appliesTo: (ctx) => Boolean(ctx.tag.attributes?.dropcap),

	resolve(ctx) {
		const register = ctx.axis('reading') ?? DEFAULT_READING;
		if (READING_CAPABILITIES[register as keyof typeof READING_CAPABILITIES]?.dropcap === true) {
			return { state: { dropcap: 'true' } };
		}
		return {
			warnings: [{
				code: 'dropcap-off-register',
				message: `[refrakt] dropcap is honoured only on a prose body — ignored on "${ctx.rune}" (reading="${register}").`,
			}],
		};
	},
};
