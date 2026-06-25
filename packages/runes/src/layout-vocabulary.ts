/**
 * Canonical layout vocabulary (ADR-018).
 *
 * Many runes expose an arrangement axis through a `layout` string attribute.
 * The attribute *name* is universal, but the *values* historically drifted —
 * the same concept wore different spellings across runes. This module is the
 * single shared source for the **canonical** layout tokens so the spelling
 * cannot drift and importing a token implies its contract.
 *
 * Two tiers, distinguished by contract (not popularity):
 *
 *   - **Canonical tokens** (here) carry a shared DOM/behavior contract: the same
 *     value implies the same emitted structure and behavior wherever it appears
 *     (e.g. `carousel` → `data-layout="carousel"` + the shared track/item
 *     contract + the shared behavior).
 *   - **Local tokens** are arrangements unique to one rune with no shared
 *     machinery (e.g. `masonry`, `table`). They stay declared inline on the rune,
 *     *because* they don't generalise. Local values are sanctioned, not a smell.
 *
 * **Graduation rule:** a value enters this pool when a *second* rune needs the
 * same concept with the same contract. Until then it stays local.
 *
 * **Usage:** build a rune's `layout` `matches` from canonical picks plus any
 * local literals — `layout: { type: String, matches: layoutMatches([LAYOUT.grid, LAYOUT.list], 'masonry') }`.
 * No rune is required to support every canonical token.
 *
 * The seed set is `grid` and `list`; `carousel` graduates in SPEC-100.
 */

/** Canonical layout tokens. Each carries a shared DOM/behavior contract. */
export const LAYOUT = {
	grid: 'grid',
	list: 'list',
} as const;

/** Union of the canonical layout token values. */
export type CanonicalLayout = (typeof LAYOUT)[keyof typeof LAYOUT];

/** The canonical pool as a readonly array (for validation / introspection). */
export const CANONICAL_LAYOUTS: readonly CanonicalLayout[] = Object.values(LAYOUT);

/**
 * Build a `layout` `matches` array from canonical picks plus any rune-local
 * literals. Returns a fresh mutable array (Markdoc's `matches` expects one).
 *
 * @example
 * layout: { type: String, matches: layoutMatches([LAYOUT.grid, LAYOUT.list], 'masonry') }
 */
export function layoutMatches(canonical: readonly CanonicalLayout[], ...local: string[]): string[] {
	return [...canonical, ...local];
}
