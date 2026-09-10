import { resolveReading, coerceRegister, READING_CAPABILITIES, DEFAULT_READING, READING_REGISTERS } from '../reading.js';
import type { RuneConfig } from '../types.js';
import type { Facet } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

export { READING_REGISTERS, READING_CAPABILITIES, DEFAULT_READING } from '../reading.js';

/** The capability both axes require — SPEC-125 Phase 4.
 *
 *  Both land on the rune's `[data-section="body"]` element, which is why they
 *  were originally gated on the `body` section role. That was a proxy: the role
 *  says *where* the main content region is, not that it holds prose. It held for
 *  most runes and broke for a real minority — `datatable`'s body role is on its
 *  `<table>`, `showcase`'s on its viewport — so `{% datatable dropcap=true %}`
 *  would have stamped a drop cap onto a table.
 *
 *  The rune now says so itself. Default-off: a forgotten declaration disables
 *  the axes rather than mis-enabling them, which is safe only because schema
 *  narrowing (WORK-534) makes the omission visible instead of silent. */
export const PROSE_CAPABILITY = 'prose';

function bearsProse(config: Pick<RuneConfig, 'provides'>): boolean {
	return config.provides?.includes(PROSE_CAPABILITY) ?? false;
}

/** Why the axes are unavailable, when they are. One string, used by both
 *  contract descriptors and the runtime warning, so an author who meets it in
 *  `refrakt reference` and again in a build log reads the same sentence. */
export const NO_PROSE_REASON = 'this rune declares no prose body';

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
		// WORK-537 — a rune that does not declare the `prose` capability gets no
		// register at all. Publishing it and letting the stamp fall off later is
		// what made this axis silent in the first place; dropping it here means
		// `dropcap` (which reads the resolved register) sees the same answer.
		if (!bearsProse(ctx.config)) {
			// WORK-536 — and say so, but only for an *explicit* request. Every
			// unmarked block in a build resolves to the `ui` default and emits
			// nothing, so warning there would train readers to ignore the channel.
			const requested = coerceRegister(ctx.tag.attributes?.reading);
			if (!requested) return null;
			return {
				warnings: [{
					code: 'reading-without-prose',
					message: `[refrakt] reading="${requested}" on "${ctx.rune}" has nothing to apply to — ${NO_PROSE_REASON}, so no element carries an editorial register. Ignored.`,
					dedupeKey: `${ctx.rune}:${requested}`,
				}],
			};
		}

		return { state: { reading: register } };
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
		// WORK-537 — the capability first, so a rune with no prose gets the reason
		// that actually explains it. Falling through to the register check would
		// report `reading="ui"` on a `datatable`, which is true and useless.
		if (!bearsProse(ctx.config)) {
			return {
				warnings: [{
					code: 'dropcap-without-prose',
					message: `[refrakt] dropcap on "${ctx.rune}" has nothing to apply to — ${NO_PROSE_REASON}. Ignored.`,
					dedupeKey: ctx.rune,
				}],
			};
		}

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
	requires: PROSE_CAPABILITY,
	describeForRune: (config) => {
		if (!bearsProse(config)) return NO_PROSE_REASON;
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
	requires: PROSE_CAPABILITY,
	describeForRune: (config) => (bearsProse(config) ? null : NO_PROSE_REASON),
};
