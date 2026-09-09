import { resolveReading, coerceRegister, READING_CAPABILITIES, DEFAULT_READING, READING_REGISTERS } from '../reading.js';
import type { RuneConfig } from '../types.js';
import type { Facet } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

export { READING_REGISTERS, READING_CAPABILITIES, DEFAULT_READING } from '../reading.js';

/** Both axes land on the rune's `[data-section="body"]` element, so a rune
 *  whose `sections` declares no body role can never carry them however the
 *  author marks it up. */
function hasBodySection(sections: RuneConfig['sections']): boolean {
	return sections ? Object.values(sections).includes('body') : false;
}

/** `reading` — SPEC-108 editorial register for body text.
 *
 *  Author `reading=` ▸ the rune's `defaultReading` ▸ `ui`. (A region default
 *  applies only to the bare body, not to runes.) Emitted as `data-reading` on
 *  the rune's `[data-section="body"]` element, which the engine applies during
 *  child assembly — so the value is published as state rather than as an axis,
 *  and suppressed at the `ui` default so unmarked content stays unchanged. */
export const readingFacet: Facet = {
	name: 'reading',
	resolve(ctx) {
		const register = resolveReading({
			authorAttr: ctx.tag.attributes?.reading,
			runeDefault: ctx.config.defaultReading,
		});
		const result = { state: { reading: register } };

		// WORK-536 — `reading` was the one gated axis with no diagnostic at all.
		// The facet always resolves and publishes the register as state; the value
		// only becomes `data-reading` when `applyBemClasses` finds an element with
		// section role `body`. On a body-less rune it therefore vanished with no
		// code path aware that anything had been requested.
		//
		// Only an *explicit* request warns. A rune resolving to the `ui` default
		// emits nothing anyway, so warning there would fire on every unmarked
		// block in a build — noise that would train readers to ignore the channel.
		const requested = coerceRegister(ctx.tag.attributes?.reading);
		if (requested && !hasBodySection(ctx.config.sections)) {
			return {
				...result,
				warnings: [{
					code: 'reading-without-body',
					message: `[refrakt] reading="${requested}" on "${ctx.rune}" has nothing to apply to — the register lands on the rune's \`data-section="body"\` element, and this rune declares no body section. Ignored.`,
					dedupeKey: `${ctx.rune}:${requested}`,
				}],
			};
		}

		return result;
	},
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

// ─── Contract descriptions (WORK-527) ─────────────────────────────────────

export const readingAxis: UniversalAxisFacet = {
	axis: 'reading',
	contract: {
		description: 'Editorial register for body text (SPEC-108). The author picks the register; the theme owns the magnitude.',
		source: 'attribute',
		inputs: ['reading'],
		values: READING_REGISTERS,
		default: DEFAULT_READING,
		dataAttributes: ['data-reading'],
		target: '[data-section="body"]',
		condition: 'suppressed at the `ui` default, so unmarked bodies carry no attribute',
	},
	describeForRune: (config) => {
		if (!hasBodySection(config.sections)) return 'this rune declares no body section';
		return config.defaultReading ? { default: config.defaultReading } : null;
	},
};

export const dropcapAxis: UniversalAxisFacet = {
	axis: 'dropcap',
	contract: {
		description: 'Per-instance drop-cap opt-in (SPEC-108).',
		source: 'attribute',
		inputs: ['dropcap'],
		dataAttributes: ['data-dropcap'],
		target: '[data-section="body"]',
		condition: 'honoured only when the resolved reading register enables it (`prose`); dropped with a warning otherwise',
	},
	describeForRune: (config) => (hasBodySection(config.sections) ? null : 'this rune declares no body section'),
};
