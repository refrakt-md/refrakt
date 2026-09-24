/**
 * The masker (SPEC-131 step 1, WORK-597).
 *
 * Blanks comments and string/template literals so that delimiter counting is
 * safe, **preserving newlines** so the masked text has the same line count and
 * the same line offsets as its input. Every later stage of the resolver reads
 * positions off one and applies them to the other, so that correspondence is
 * the module's central invariant, not an implementation detail.
 *
 * This is a lexer, not a parser. It has no per-language branching: every
 * prefix, delimiter and escape it recognises comes from the table in
 * `languages.ts` (D15). A language absent from that table is returned
 * unchanged — the conservative answer, since a guessed mask blanks real code.
 *
 * **Anchors match raw source; the mask only rejects.** SPEC-131 is explicit
 * that matching against masked text would blank every string literal, so
 * `match='"scripts"'` against `package.json` could never match. The mask's job
 * at the anchor step is the other direction: an anchor landing *inside* a
 * masked region is a false positive. {@link isMasked} is that test.
 *
 * **Regex literals are not lexed (D8).** `/…/` is left as code, so a regex
 * containing an unbalanced brace throws the depth count off. This is the known
 * cause of the single silent-wrong case and most of the refusals in SPEC-131's
 * 1,360-symbol measurement. Fixing it is perhaps 15 more lines and is
 * deliberately deferred to WORK-590, which picks it up only if the migration
 * surfaces refusals that need it — the error it produces is overwhelmingly the
 * safe kind. `mask.test.ts` pins the resulting behaviour rather than asserting
 * it is correct.
 */

import type { LanguageDefinition } from './languages.js';

/** Longest-first, so `'''` is tried before `'` and `<!--` before `<`. */
function byLengthDesc<T>(items: T[], len: (item: T) => number): T[] {
	return [...items].sort((a, b) => len(b) - len(a));
}

type Context =
	/** Ordinary code. */
	| { type: 'code' }
	/** Inside a template literal. */
	| { type: 'template'; delim: string; open?: string; close?: string }
	/** Inside a template's interpolation — code again, tracking brace depth so
	 *  the *matching* close token returns to template state. */
	| { type: 'interp'; close: string; depth: number };

/**
 * Blank comments and literals, preserving every newline.
 *
 * The result always has the same `length` as `source`, so an index into one is
 * an index into the other.
 *
 * @param source Raw file text.
 * @param lang The language's lexical definition, or `undefined` for a language
 *   absent from the table — in which case the source is returned unchanged.
 */
export function maskSource(source: string, lang: LanguageDefinition | undefined): string {
	if (!lang) return source;

	const n = source.length;
	const out = source.split('');
	const escapeChar = lang.escape;

	const lineComments = byLengthDesc(lang.lineComments, (c) => c.length);
	const blockComments = byLengthDesc(lang.blockComments, ([open]) => open.length);
	const strings = byLengthDesc(lang.strings, (s) => s.delim.length);
	const templates = byLengthDesc(lang.templates, (t) => t.delim.length);

	/** Blank [from, to), never touching a newline. */
	const blank = (from: number, to: number): void => {
		for (let k = from; k < to && k < n; k++) {
			if (out[k] !== '\n') out[k] = ' ';
		}
	};

	const endOfLine = (from: number): number => {
		const nl = source.indexOf('\n', from);
		return nl === -1 ? n : nl;
	};

	/** Scan a quoted run starting at `from` (on its opening delimiter). */
	const scanString = (from: number, delim: string, multiline: boolean): number => {
		let k = from + delim.length;
		while (k < n) {
			if (escapeChar && source.startsWith(escapeChar, k)) {
				k += escapeChar.length + 1;
				continue;
			}
			if (source.startsWith(delim, k)) return k + delim.length;
			// An unterminated single-line string ends at the newline rather than
			// consuming the rest of the file.
			if (!multiline && source[k] === '\n') return k;
			k++;
		}
		return n;
	};

	const stack: Context[] = [{ type: 'code' }];
	let i = 0;

	while (i < n) {
		const top = stack[stack.length - 1];

		if (top.type === 'template') {
			if (escapeChar && source.startsWith(escapeChar, i)) {
				blank(i, i + escapeChar.length + 1);
				i += escapeChar.length + 1;
				continue;
			}
			if (top.open && source.startsWith(top.open, i)) {
				blank(i, i + top.open.length);
				i += top.open.length;
				stack.push({ type: 'interp', close: top.close ?? '}', depth: 0 });
				continue;
			}
			if (source.startsWith(top.delim, i)) {
				blank(i, i + top.delim.length);
				i += top.delim.length;
				stack.pop();
				continue;
			}
			blank(i, i + 1);
			i++;
			continue;
		}

		// `code` and `interp` share every lexical rule; they differ only in that
		// `interp` counts braces so it knows which close token is its own.
		let advanced = false;

		for (const prefix of lineComments) {
			if (source.startsWith(prefix, i)) {
				const eol = endOfLine(i);
				blank(i, eol);
				i = eol;
				advanced = true;
				break;
			}
		}
		if (advanced) continue;

		for (const [open, close] of blockComments) {
			if (source.startsWith(open, i)) {
				const found = source.indexOf(close, i + open.length);
				const end = found === -1 ? n : found + close.length;
				blank(i, end);
				i = end;
				advanced = true;
				break;
			}
		}
		if (advanced) continue;

		for (const template of templates) {
			if (source.startsWith(template.delim, i)) {
				blank(i, i + template.delim.length);
				i += template.delim.length;
				stack.push({
					type: 'template',
					delim: template.delim,
					open: template.interpolationOpen,
					close: template.interpolationClose,
				});
				advanced = true;
				break;
			}
		}
		if (advanced) continue;

		for (const str of strings) {
			if (source.startsWith(str.delim, i)) {
				const end = scanString(i, str.delim, str.multiline === true);
				blank(i, end);
				i = end;
				advanced = true;
				break;
			}
		}
		if (advanced) continue;

		if (top.type === 'interp') {
			if (source.startsWith(top.close, i)) {
				if (top.depth === 0) {
					blank(i, i + top.close.length);
					i += top.close.length;
					stack.pop();
					continue;
				}
				top.depth--;
			} else if (source[i] === '{') {
				top.depth++;
			}
		}

		i++;
	}

	return out.join('');
}

/**
 * Whether the character at `index` falls inside a region the masker blanked.
 *
 * This is the anchor step's rejection test: a `.rf-hint {` mentioned in a
 * comment, or a `## Install` inside a fenced block, is a false positive rather
 * than a usable anchor. Compares against the raw source so that a space that
 * was always a space is not mistaken for a masked one.
 */
export function isMasked(source: string, masked: string, index: number): boolean {
	if (index < 0 || index >= source.length) return false;
	return masked[index] !== source[index];
}

/**
 * Whether any character of `[start, end)` was masked.
 *
 * An anchor regex matches a *range*, and a match that begins in code but runs
 * into a comment is still not a clean anchor.
 */
export function isRangeMasked(source: string, masked: string, start: number, end: number): boolean {
	for (let i = start; i < end && i < source.length; i++) {
		if (isMasked(source, masked, i)) return true;
	}
	return false;
}

/**
 * The first line of the contiguous comment block immediately above `line`.
 *
 * Returns `line` itself when there is nothing to absorb — which is always the
 * answer for a language absent from the table, because a definition with no
 * comment prefixes recognises no comment (D10). WORK-587's `doc` attribute is
 * the consumer; this is the lexical half of it and lives here because the
 * decision is entirely table-driven.
 *
 * Blank lines break the block: a comment separated from the declaration by an
 * empty line is a file header or a note about something else, not its
 * documentation.
 *
 * @param lines The file's lines.
 * @param line 0-indexed line of the declaration.
 * @param lang The language definition, or `undefined` for an unknown language.
 */
export function docHeadStart(
	lines: string[],
	line: number,
	lang: LanguageDefinition | undefined,
): number {
	if (!lang) return line;

	const prefixes = [...lang.lineComments];
	const blockOpens = lang.blockComments.map(([open]) => open);
	const blockCloses = lang.blockComments.map(([, close]) => close);
	// A `*` continuation line inside a `/* … */` block is not a comment opener
	// in its own right, so it is recognised only when the language has a block
	// comment at all — never as a global fallback.
	const continuations = blockOpens.length > 0 ? ['*'] : [];

	if (prefixes.length === 0 && blockOpens.length === 0) return line;

	let start = line;
	for (let i = line - 1; i >= 0; i--) {
		const text = lines[i].trim();
		if (text.length === 0) break;

		const isComment =
			prefixes.some((p) => text.startsWith(p)) ||
			blockOpens.some((o) => text.startsWith(o)) ||
			blockCloses.some((c) => text.endsWith(c)) ||
			continuations.some((c) => text.startsWith(c));

		if (!isComment) break;
		start = i;
	}

	return start;
}

/**
 * The regex source for a `symbol=` anchor, built from the language's keywords
 * and modifiers (D15: a template with one hole).
 *
 * `name` is escaped before interpolation — a symbol name containing `.` or `(`
 * spliced raw into a regex is injection from content.
 *
 * Returns `undefined` when the language declares no keywords, so the caller
 * refuses rather than falling back to a guessed pattern.
 */
export function symbolAnchorPattern(
	name: string,
	lang: LanguageDefinition | undefined,
): string | undefined {
	if (!lang || lang.keywords.length === 0) return undefined;

	const keywords = lang.keywords.map(escapeRegExp).join('|');
	const modifiers = lang.modifiers.map(escapeRegExp).join('|');
	const modifierPart = modifiers.length > 0 ? `((${modifiers})\\s+)*` : '';

	return `^([ \\t]*)${modifierPart}(${keywords})\\s*\\*?\\s+${escapeRegExp(name)}\\b`;
}

/** Escape a string for literal use inside a regular expression. */
export function escapeRegExp(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
