/**
 * Review markers for embedded source (SPEC-134, WORK-591).
 *
 * SPEC-131 answers *am I quoting the right region*. This answers the next
 * question up: **the region is right, and the prose around it no longer
 * describes what is in it.**
 *
 * A field is removed, a default flips, a parameter is reordered — the anchor
 * resolves perfectly, the code block renders real current code, and the
 * paragraph above it quietly becomes false. That is the *ordinary* case,
 * because editing a declaration is far more common than renaming or moving one.
 *
 * ```markdoc
 * {% snippet path="packages/types/src/config.ts" symbol="SiteConfig" reviewed="a3f91c4e" /%}
 * ```
 *
 * Resolution is unchanged. After the slice resolves it is normalized, hashed
 * and compared. A mismatch produces a diagnostic; the page still renders the
 * current code.
 *
 * **`reviewed`, not `pin` (D1).** This freezes nothing — the snippet still
 * tracks HEAD and re-resolves every build. What the attribute records is that a
 * human read this version and the surrounding prose matched. The name is
 * load-bearing: `pin=` would steer an author toward "this is frozen, nothing to
 * do here", which is the opposite of the intended response.
 */

import { createHash } from 'node:crypto';
import { reindent } from './present.js';

/** How much of the digest is stored inline. D4: change detection against one
 *  known expected value, not a lookup table, so the birthday bound does not
 *  apply. `packages/editor` already uses 8-character truncated hashes. */
const HASH_LENGTH = 8;

export interface HashPair {
	/** The stored hash — reindent, line endings, trailing whitespace. */
	strict: string;
	/** Additionally collapsing whitespace runs and dropping blank lines. */
	loose: string;
}

/**
 * The normalized form that gets hashed.
 *
 * **Normalization is the whole design.** Hash raw bytes and the marker fires on
 * every trailing space and every reformat — and a marker that cries wolf gets
 * deleted. Budget the normalization, not the hash: hashing is a line, and
 * getting normalization wrong produces a feature that is worse than not having
 * it.
 *
 * In order:
 *
 * 1. **Apply `reindent` first.** Moving a function into a class shifts every
 *    line two columns without changing a character of content.
 * 2. Normalize line endings, strip per-line trailing whitespace, normalize the
 *    trailing newline.
 * 3. **Stop. Comments stay in — D2.**
 *
 * Excluding comments would make markers quieter, and SPEC-131's masker could do
 * it for free. It is still wrong: a doc comment is very often the exact text
 * the surrounding prose paraphrases. If `@param timeout`'s description changes
 * meaning and the marker stays green, the feature has failed at the only job it
 * has.
 */
export function normalizeStrict(content: string): string {
	return reindent(content)
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((line) => line.replace(/[ \t]+$/, ''))
		.join('\n')
		.replace(/\n+$/, '');
}

/**
 * The loose form — strict, plus collapsing whitespace runs and dropping blank
 * lines.
 *
 * This exists so that "it was just the formatter" is a **fact the tool
 * establishes** rather than a judgement an author makes under time pressure
 * (D3). A repo-wide formatter run would otherwise invalidate every marker at
 * once, and an author re-stamping fifty of them learns nothing — the feature's
 * worst failure mode, and the strongest objection to it.
 */
export function normalizeLoose(content: string): string {
	return normalizeStrict(content)
		.split('\n')
		.map((line) => line.trim().replace(/\s+/g, ' '))
		.filter((line) => line.length > 0)
		.join('\n');
}

function digest(input: string): string {
	return createHash('sha256').update(input, 'utf8').digest('hex').slice(0, HASH_LENGTH);
}

/** Both hash levels for a resolved slice. */
export function hashSlice(content: string): HashPair {
	return {
		strict: digest(normalizeStrict(content)),
		loose: digest(normalizeLoose(content)),
	};
}

/** What a comparison against a stored marker concluded. */
export type MarkerVerdict =
	/** The stored hash still matches. Nothing to do. */
	| 'current'
	/** Strict differs, loose matches — the change is *provably* formatting
	 *  only, so it can be re-stamped silently (D3). */
	| 'formatting-only'
	/** Both differ. The content carries meaning; hold for review. */
	| 'stale';

export interface MarkerComparison {
	verdict: MarkerVerdict;
	stored: string;
	current: HashPair;
}

/**
 * Compare a stored marker against the slice as it is now.
 *
 * The stored value is compared against the **strict** hash. A stored marker
 * that matches neither level, but whose loose form matches the current loose
 * form, is formatting-only: the author reviewed content that still says the
 * same thing with different whitespace.
 */
export function compareMarker(
	stored: string,
	content: string,
	storedLoose?: string,
): MarkerComparison {
	const current = hashSlice(content);

	if (stored === current.strict) {
		return { verdict: 'current', stored, current };
	}

	// Without a stored loose hash the formatting-only case cannot be *proven*,
	// only guessed — and D3 is explicit that it must be proven. A single stored
	// value therefore degrades to `stale`, which is the safe direction: it asks
	// for a review that may turn out to be trivial, rather than skipping one
	// that mattered.
	if (storedLoose !== undefined && storedLoose === current.loose) {
		return { verdict: 'formatting-only', stored, current };
	}

	return { verdict: 'stale', stored, current };
}

/** Render a marker attribute value. Both levels are stored, separated by a
 *  colon, so the formatting-only case can be *proven* rather than assumed. */
export function formatMarker(pair: HashPair): string {
	return `${pair.strict}:${pair.loose}`;
}

/** Parse a stored marker value into its levels. A marker written before the
 *  loose level existed — or by hand — carries only the strict half. */
export function parseMarker(raw: string): { strict: string; loose?: string } {
	const [strict, loose] = raw.split(':');
	return loose ? { strict, loose } : { strict };
}

/**
 * Whether an invocation can meaningfully carry a marker.
 *
 * D10: a slice that cannot change can never fire, so stamping one means
 * nothing and the tool should say so rather than doing it. Today the only such
 * case is an invocation with no resolvable slice at all.
 */
export function canCarryMarker(opts: { hasPath: boolean; rune: string }): boolean {
	// `expand` embeds a whole document rather than a region, so there is
	// nothing of the right shape to hash — WORK-591's criterion, and the reason
	// WORK-593's editor does not stamp it.
	if (opts.rune === 'expand') return false;
	return opts.hasPath;
}
