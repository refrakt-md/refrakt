/**
 * Identity fields — the one place the "a theme restructures a rune, never
 * redefines it" rule is expressed.
 *
 * ADR-028 settles the principle: **attribute applicability is a property of the
 * rune, never of the theme.** Applicability is derived from rune-structural
 * facts — which sections a rune has, which modifiers it declares — and those
 * facts are identity. A theme that could rewrite them could change what the
 * same markdown *means*, which is the portability premise the project rests on.
 *
 * Two merge paths reach `RuneConfig`, and both consume this module:
 *
 * - **Variant deltas** (SPEC-091) — validated in `validate.ts`. A delta is a
 *   modifier-keyed restructuring, so it may not touch identity, and it may not
 *   nest `variants` either.
 * - **Theme overrides** — enforced in `merge.ts`. `variants` is *not* reserved
 *   here: SPEC-091 explicitly lets a theme add axes or override individual
 *   value deltas, and `mergeRuneConfig` merges them by axis for that purpose.
 *
 * Everything else a theme may still override — `layout`, `structure`, `styles`,
 * `contentWrapper`, `staticModifiers`, `autoLabel`, `editHints`, `projection`
 * and the rest. It can hide, reorder, re-wrap and re-decorate; it just cannot
 * redefine what a section *is*.
 */

/** Fields that define what a rune *is* (ADR-028). Non-overridable on every
 *  merge path into a `RuneConfig`.
 *
 *  `mediaSlots` and `frameTarget` join the original three once the join tables
 *  move into their tag modules (SPEC-125 Phase 2). `frameTarget` in particular
 *  has to: frame applicability resolves as
 *  `config.frameTarget ?? (hasMediaSection(config.sections) ? 'media' : null)`,
 *  and the type has no `'none'` — so it can only ever *grant*. Left unguarded, a
 *  theme could add `frameTarget: 'self'` to a rune whose schema rejects
 *  `frame=`, config granting what the schema forbids: the same divergence this
 *  rule exists to close, inverted.
 *
 *  `universalAttributes` joins them in Phase 3: it decides what an author may
 *  write on the rune at all, which is the most direct form of "applicability is
 *  not theme configuration" there is. */
export const IDENTITY_FIELDS = [
	'block',
	'modifiers',
	'sections',
	'mediaSlots',
	'frameTarget',
	'universalAttributes',
	'provides',
	/** SPEC-130 / WORK-565 — a rune's schema.org table.
	 *
	 *  The strongest case in the list. Emission is a claim about the *content*,
	 *  not about the skin: a theme that could restate a rune's schema.org type
	 *  would be able to change what a site asserts about its own content by
	 *  changing its appearance (ADR-028). The table is declared on the rune and
	 *  referenced from config, exactly as `sections` is. */
	'schema',
	/** SPEC-158 D2 — ADR-030 rule 3's founding example. On a playlist the number
	 *  *is* the track number; restyling it as `connected` does not change how the
	 *  playlist looks, it deletes the track numbers. Whether the ordinal is
	 *  information is a fact about the content. `sequenceDirection` is the
	 *  responsive collapse rule 3 hands the theme, and stays overridable. */
	'sequence',
	/** SPEC-158 D3 — what *kind* of field a meta field is. `label`,
	 *  `sentimentMap` and `transform` stay presentational; the same split
	 *  `sections` / `blocks` draws, one level down. */
	'metaFields.*.metaType',
] as const;

export type IdentityField = (typeof IDENTITY_FIELDS)[number];

/** Fields a SPEC-091 variant delta may not carry: the identity fields, plus
 *  `variants` itself — a delta restructures a rune, it does not nest another
 *  variant map inside itself. */
export const VARIANT_DELTA_RESERVED_FIELDS = [...IDENTITY_FIELDS, 'variants'] as const;

/** Which reserved paths a partial config actually carries, in declaration
 *  order, as concrete paths (`metaFields.status.metaType`, never the `*`).
 *
 *  A path is dot-separated; a `*` segment matches every key of the object at
 *  that point, in its own key order. Presence is what counts, per segment — an
 *  explicit `sections: undefined` still shadows the base under a spread merge,
 *  so `in` is the right test at the last segment, and an explicit `undefined`
 *  there is still a violation (SPEC-158 D1). */
export function findReservedFields(
	partial: object,
	fields: readonly string[] = IDENTITY_FIELDS,
): string[] {
	const found: string[] = [];
	for (const field of fields) {
		if (!field.includes('.')) {
			if (field in partial) found.push(field);
			continue;
		}
		collectPath(partial, field.split('.'), [], found);
	}
	return found;
}

function collectPath(node: object, segments: string[], at: string[], found: string[]): void {
	const [head, ...rest] = segments;
	const keys = head === '*' ? Object.keys(node) : head in node ? [head] : [];
	for (const key of keys) {
		if (rest.length === 0) {
			found.push([...at, key].join('.'));
			continue;
		}
		const next = (node as Record<string, unknown>)[key];
		if (typeof next === 'object' && next !== null) collectPath(next, rest, [...at, key], found);
	}
}

/** SPEC-158 D4 — the attributes each identity field emits, stated by field so
 *  the refusal derives from the field rather than from a deny-list of names.
 *  A layout `attrs` map may not write any of them: it would assert, on a
 *  wrapper, what only the rune's own declaration may assert. `block` emits
 *  classes and `frameTarget` / `universalAttributes` gate author attributes
 *  rather than emitting one, so they contribute nothing here. `modifiers` emits
 *  `data-{name}` per declared modifier, which is per rune — see
 *  {@link derivedAttributeOwner}. */
export const IDENTITY_FIELD_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
	sections: ['data-section'],
	mediaSlots: ['data-media'],
	schema: ['typeof', 'property'],
	sequence: ['data-sequence'],
	'metaFields.*.metaType': ['data-meta-type'],
};

/** The identity field that derives `attribute` on a rune declaring
 *  `modifierNames`, or `undefined` when a layout `attrs` map may set it.
 *  `data-zone-layout` and other presentation attributes fall through
 *  (SPEC-158 D4 / SPEC-156 D5). */
export function derivedAttributeOwner(
	attribute: string,
	modifierNames: Iterable<string> = [],
): string | undefined {
	for (const [field, attrs] of Object.entries(IDENTITY_FIELD_ATTRIBUTES)) {
		if (attrs.includes(attribute)) return field;
	}
	for (const name of modifierNames) {
		// The engine kebab-cases a modifier name before emitting it (`engine.ts`).
		if (attribute === `data-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`) return 'modifiers';
	}
	return undefined;
}

/** The one wording for an identity violation, shared by both paths so a theme
 *  author and a variant author read the same sentence. */
export function identityFieldMessage(field: string): string {
	return `may not override the identity field "${field}" — it is rune identity, not theme configuration (ADR-028)`;
}

/** The wording for a layout `attrs` entry that writes an identity-derived
 *  attribute (SPEC-158 D4). */
export function derivedAttributeMessage(attribute: string, field: string): string {
	return `may not set "${attribute}" — it is derived from the identity field "${field}", not theme configuration (ADR-028)`;
}
