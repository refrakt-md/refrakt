/** Versioning & compatibility helpers for distributed extensions (ADR-023).
 *
 *  Extensions (themes, templates, preset packs) declare a `refrakt`
 *  compatibility range in their manifest; the install path validates it against
 *  the project's refrakt version and refuses/warns on a mismatch rather than
 *  letting it surface as a build crash. This module is intentionally
 *  dependency-free so both the CLI install path and `create-refrakt` can import
 *  it without pulling in a semver library.
 *
 *  The supported range grammar is the comparator-set form the scaffold emits —
 *  space-separated comparators (`>=0.25 <0.26`), each one of `>= > <= < =`
 *  followed by a `MAJOR.MINOR[.PATCH]` version. A missing/empty range means
 *  "universal — no constraint". This deliberately does not implement the full
 *  semver range grammar (`^`, `~`, `||`, pre-release tags); the scaffold never
 *  emits those, and keeping the parser small keeps `@refrakt-md/types`
 *  dependency-light. */

export interface SemverParts {
	major: number;
	minor: number;
	patch: number;
}

/** Parse a `MAJOR.MINOR[.PATCH]` version (pre-release/build metadata stripped). */
export function parseVersion(version: string): SemverParts | null {
	const core = version.trim().replace(/^v/, '').split(/[-+]/)[0] ?? '';
	const m = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(core);
	if (!m) return null;
	return { major: Number(m[1]), minor: Number(m[2]), patch: m[3] ? Number(m[3]) : 0 };
}

function cmp(a: SemverParts, b: SemverParts): number {
	return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/** Test a concrete version against a comparator-set range (see module doc).
 *  Returns false if the range is malformed (callers decide how to treat that). */
export function satisfiesRange(version: string, range: string): boolean {
	const v = parseVersion(version);
	if (!v) return false;
	const comparators = range.trim().split(/\s+/).filter(Boolean);
	if (comparators.length === 0) return true; // empty → universal
	for (const c of comparators) {
		const m = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(c);
		if (!m) return false;
		const op = m[1] ?? '=';
		const bound = parseVersion(m[2]!);
		if (!bound) return false;
		const d = cmp(v, bound);
		const ok =
			op === '>=' ? d >= 0 :
			op === '<=' ? d <= 0 :
			op === '>' ? d > 0 :
			op === '<' ? d < 0 :
			d === 0;
		if (!ok) return false;
	}
	return true;
}

export interface CompatResult {
	/** True when the project version satisfies the range, or the range is absent. */
	ok: boolean;
	/** Set when the declared range is present but malformed. */
	malformed?: boolean;
	/** Human-readable explanation when `ok` is false. */
	message?: string;
}

/** Validate a distributable's declared `refrakt` range against the project's
 *  refrakt version (ADR-023). A missing range is treated as universal (ok). A
 *  malformed range is reported as `{ ok: false, malformed: true }` so callers
 *  can downgrade it to a warning rather than a hard failure. */
export function checkRefraktCompat(
	range: string | undefined,
	projectVersion: string,
): CompatResult {
	if (!range || range.trim() === '') return { ok: true };
	const comparators = range.trim().split(/\s+/).filter(Boolean);
	// Detect a malformed range up front so we can distinguish "incompatible"
	// from "uninterpretable".
	for (const c of comparators) {
		const m = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(c);
		if (!m || !parseVersion(m[2]!)) {
			return {
				ok: false,
				malformed: true,
				message: `could not parse refrakt compatibility range "${range}"`,
			};
		}
	}
	if (satisfiesRange(projectVersion, range)) return { ok: true };
	return {
		ok: false,
		message: `needs refrakt ${range}, project has ${projectVersion}`,
	};
}
