import { UNIVERSAL_AXIS_FACETS, UNIVERSAL_POSTURE_REASONS } from '@refrakt-md/transform';
import type { RuneConfig } from '@refrakt-md/transform';
import type { RuneStructure } from './lib/index.js';

/**
 * Which universal attributes a rune may carry — SPEC-125 Phase 3.
 *
 * `createContentModelSchema` used to merge all ~37 universal attributes onto
 * every rune unconditionally. Several of them are inert on most runes: `reading`
 * and `dropcap` need a `body` section role, `prominence` a header-ish one,
 * `frame` a media surface, the cover `scrim*` family a `media-position`
 * modifier. Authoring tools read the schema, so they promised every attribute
 * everywhere, and the engine dropped the inapplicable ones — three of them in
 * total silence.
 *
 * **Availability is derived from the same registry the structure contract uses.**
 * `generateStructureContract` builds its `unavailable` map by calling
 * `UniversalAxisFacet.describeForRune`; so does this. The two derivations are
 * one call, not two implementations that must be kept in step — which is the
 * only way "the contract and the schemas agree" survives the next axis.
 */

/**
 * Which universal attributes each axis owns.
 *
 * The axis registry's `contract.inputs` cannot serve here: for the `meta`-source
 * axes those are engine-side `data-field` names (`bg-src`, `tint-bg`), not the
 * author-facing attributes a schema declares. This map is the author-facing
 * half, and `universal-attributes.test.ts` holds it to covering
 * `UNIVERSAL_ATTRIBUTE_NAMES` exactly — every attribute owned by one axis, no
 * attribute owned by none.
 */
export const AXIS_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
	tint: ['tint', 'tint-mode'],
	bg: ['bg', 'bg-gradient', 'bg-from', 'bg-to', 'bg-via', 'bg-gradient-type'],
	width: ['width'],
	spacing: ['spacing'],
	inset: ['inset'],
	elevation: ['elevation'],
	prominence: ['prominence'],
	reading: ['reading'],
	dropcap: ['dropcap'],
	motion: ['reveal', 'stagger'],
	frame: [
		'frame', 'frame-aspect', 'frame-displace', 'frame-displace-mode', 'frame-offset',
		'frame-oversize', 'frame-place', 'frame-anchor', 'frame-overflow', 'frame-shadow',
	],
	substrate: ['substrate', 'substrate-size', 'substrate-opacity', 'substrate-fill', 'substrate-target'],
	cover: ['scrim', 'scrim-type', 'scrim-strength', 'scrim-blur', 'scrim-tone'],
};

/**
 * Why a rune carries no universal attributes at all.
 *
 * Stated rather than inferred. Six runes have hand-written schemas and so have
 * never carried universal attributes, and the split is mostly principled — but
 * "it happens not to use `createContentModelSchema`" is not a reason, it is an
 * implementation detail that a reader cannot distinguish from an oversight.
 *
 * - `auto` — the default. Structural applicability decides, axis by axis.
 * - `inline` — the rune renders an inline span. Block axes have nothing to act
 *   on, so none apply.
 * - `configurator` — the rune *supplies* an axis value to its parent rather than
 *   carrying one. `{% tint %}` with its own `tint=` is circular.
 * - `none` — no universal attributes, for a reason that is neither of the above.
 *
 * The six, assessed:
 *
 * | Rune | Posture | Recorded | Assessment |
 * |---|---|---|---|
 * | `badge` | `inline` | `coreConfig.Badge` | correct — an inline span |
 * | `tint`, `bg` | `configurator` | `coreConfig.Tint` / `.Bg` | correct — they supply the axis |
 * | `icon` | `inline` in substance | `tags/icon.ts` | correct — no `data-rune`, so no `RuneConfig` to hold the field |
 * | `xref` | `inline` in substance | `tags/xref.ts` (`inline: true`) | correct — resolves to an inline link |
 * | `expand` | `none` | `coreConfig.Expand` | **legacy, not principled** — see the note there |
 *
 * `expand` is the one that reads as an accident: it is a block-level disclosure,
 * so the block axes would all mean something on it. Giving it those axes means
 * migrating it to `createContentModelSchema`, which WORK-534 scopes out; `none`
 * records the gap rather than letting it pass as a decision.
 */
export type UniversalAttributePosture = 'auto' | 'inline' | 'configurator' | 'none';

/** The prose behind a non-`auto` posture, for tooling that explains itself.
 *  Re-exported from the transform registry rather than restated, so the schema
 *  layer and the structure contract give the same reason. */
export const POSTURE_REASONS = UNIVERSAL_POSTURE_REASONS;

export interface UniversalAttributeInput {
	/** Defaults to `auto`. */
	posture?: UniversalAttributePosture;
	/** The rune's own join tables, as declared in its tag module (WORK-533). */
	structure?: RuneStructure;
	/** The rune's declared author attributes. `cover` and `content-place` gate on
	 *  the rune declaring a `media-position` / `content-place` *modifier*, and
	 *  those modifiers are read from author attributes the schema declares
	 *  anyway — which is why `modifiers` did not need to move out of config. */
	declaredAttributes?: Iterable<string>;
}

export interface UniversalAttributeAvailability {
	/** Universal attribute names this rune may carry. */
	available: ReadonlySet<string>;
	/** Axis → why it is unavailable here. Same strings the structure contract
	 *  records, because they come from the same call. */
	unavailable: ReadonlyMap<string, string>;
}

/**
 * Resolve which universal attributes apply to one rune.
 *
 * A non-`auto` posture short-circuits: nothing structural is consulted, because
 * the reason is about the rune's kind rather than its anatomy.
 */
export function resolveUniversalAttributes(
	input: UniversalAttributeInput = {},
): UniversalAttributeAvailability {
	const posture = input.posture ?? 'auto';
	if (posture !== 'auto') {
		const reason = POSTURE_REASONS[posture];
		return {
			available: new Set(),
			unavailable: new Map(Object.keys(AXIS_ATTRIBUTES).map((axis) => [axis, reason])),
		};
	}

	// A config-shaped view of what the schema knows. The gates read exactly these
	// four fields; `block` is required by the type and unused by every gate.
	const asConfig = {
		block: '',
		sections: input.structure?.sections,
		mediaSlots: input.structure?.mediaSlots,
		frameTarget: input.structure?.frameTarget,
		modifiers: Object.fromEntries(
			[...(input.declaredAttributes ?? [])].map((name) => [name, { source: 'attribute' as const }]),
		),
	} as RuneConfig;

	const unavailable = new Map<string, string>();
	for (const facet of UNIVERSAL_AXIS_FACETS) {
		const described = facet.describeForRune(asConfig, '');
		if (typeof described === 'string') unavailable.set(facet.axis, described);
	}

	const available = new Set<string>();
	for (const [axis, names] of Object.entries(AXIS_ATTRIBUTES)) {
		if (unavailable.has(axis)) continue;
		for (const name of names) available.add(name);
	}
	// Axes with no author-facing attributes (density, content-measure,
	// content-place) can still be unavailable; they simply remove nothing here.
	return { available, unavailable };
}
