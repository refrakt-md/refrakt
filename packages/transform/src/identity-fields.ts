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
 *  merge path into a `RuneConfig`. */
export const IDENTITY_FIELDS = ['block', 'modifiers', 'sections'] as const;

export type IdentityField = (typeof IDENTITY_FIELDS)[number];

/** Fields a SPEC-091 variant delta may not carry: the identity fields, plus
 *  `variants` itself — a delta restructures a rune, it does not nest another
 *  variant map inside itself. */
export const VARIANT_DELTA_RESERVED_FIELDS = [...IDENTITY_FIELDS, 'variants'] as const;

/** Which reserved fields a partial config actually carries, in declaration
 *  order. Presence is what counts — an explicit `sections: undefined` still
 *  shadows the base under a spread merge, so `in` is the right test. */
export function findReservedFields(
	partial: object,
	fields: readonly string[] = IDENTITY_FIELDS,
): string[] {
	return fields.filter((field) => field in partial);
}

/** The one wording for an identity violation, shared by both paths so a theme
 *  author and a variant author read the same sentence. */
export function identityFieldMessage(field: string): string {
	return `may not override the identity field "${field}" — it is rune identity, not theme configuration (ADR-028)`;
}
