/**
 * Anchor-native presentation (SPEC-131 D13 + D16; WORK-589).
 *
 * Anchoring makes nested targets easy for the first time — a class method, a
 * key inside `"scripts"`, a rule inside `@media`, a step under `jobs:`. Two
 * existing attributes were defined in terms of `lines=` and stop making sense
 * under an anchor, and one new attribute is needed because the old form
 * re-couples the invocation to the coordinates anchoring exists to decouple it
 * from.
 *
 * **These are deliberately separate entry points, not folded into extraction.**
 * Two later items need to call the pipeline at a chosen point and an inlined
 * transform does not allow it:
 *
 * - WORK-590's codemod verifies a rewritten invocation produces a
 *   **byte-identical** slice, and that comparison runs **before** `reindent` —
 *   otherwise every nested target fails verification for a difference the
 *   codemod itself introduced.
 * - WORK-591's review-marker hash applies `reindent` **first**, so that moving
 *   a function into a class — which shifts every line two columns without
 *   changing a character of content — does not fire the marker.
 *
 * The ordering is easy to get backwards and produces a confusing failure in
 * each direction, which is why it is stated on both sides.
 */

/**
 * Strip the slice's common leading whitespace.
 *
 * Removing the *common* prefix preserves relative structure exactly, so the
 * result stays valid in indentation-significant languages: a dedented Python
 * method is a function, a dedented YAML subtree is that subtree rooted.
 *
 * Blank lines are ignored when measuring the prefix — a blank line inside a
 * block is not evidence that the block is flush left — and are emitted as
 * empty rather than as whatever whitespace they happened to carry.
 *
 * Tabs and spaces are compared as characters, not as widths: a slice mixing
 * them has no common prefix to strip, and guessing a tab width in order to
 * manufacture one would change bytes the author did not ask to change.
 */
export function reindent(content: string): string {
	const lines = content.split('\n');
	let prefix: string | undefined;

	for (const line of lines) {
		if (line.trim().length === 0) continue;
		const indent = line.slice(0, line.length - line.trimStart().length);
		if (prefix === undefined) {
			prefix = indent;
			continue;
		}
		// Shrink to the longest shared prefix.
		let i = 0;
		while (i < prefix.length && i < indent.length && prefix[i] === indent[i]) i++;
		prefix = prefix.slice(0, i);
		if (prefix.length === 0) break;
	}

	if (prefix === undefined || prefix.length === 0) return content;

	return lines
		.map((line) => {
			if (line.trim().length === 0) return '';
			return line.startsWith(prefix) ? line.slice(prefix.length) : line.trimStart();
		})
		.join('\n');
}

/**
 * Whether `reindent` applies, given the addressing mode and the attribute.
 *
 * **The default follows the addressing mode** (D16), for the same reason D9's
 * does. An author writing `lines="10-40"` has seen the file and chosen those
 * columns; changing how they render would be a silent visual change to every
 * existing line-addressed invocation. An author writing `symbol="…"` never saw
 * a column number — the resolver picked the region, so it owns presenting it
 * legibly.
 */
export function shouldReindent(anchored: boolean, attr: boolean | undefined): boolean {
	return attr ?? anchored;
}

/**
 * Line numbers within a slice whose text matches any of the given regexes.
 *
 * The anchor-native form of `highlight` (D13). A *numeric* highlight under an
 * anchor is no longer something an author can write from knowledge — the
 * resolver chose the region — so this matches on content instead.
 *
 * Returns 1-based offsets **within the slice**, which is what the fence's
 * `highlight` attribute expects once `linenumbers` has supplied the file
 * offset.
 *
 * @param content The resolved slice.
 * @param patterns One or more regex sources.
 */
export function highlightMatchLines(content: string, patterns: string[]): number[] {
	const compiled: RegExp[] = [];
	for (const raw of patterns) {
		if (raw.length === 0) continue;
		compiled.push(new RegExp(raw));
	}
	if (compiled.length === 0) return [];

	const hits: number[] = [];
	content.split('\n').forEach((line, i) => {
		if (compiled.some((re) => re.test(line))) hits.push(i + 1);
	});
	return hits;
}

/** Parse a `highlight-match` attribute into regex sources. Comma-separated,
 *  because an attribute is a string and authors reach for a list. */
export function parseHighlightMatch(raw: string | undefined): string[] {
	if (typeof raw !== 'string' || raw.trim().length === 0) return [];
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/** Render a list of 1-based slice offsets as the fence's `highlight` value. */
export function formatHighlight(lines: number[]): string {
	return lines.join(',');
}
