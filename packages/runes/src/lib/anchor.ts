/**
 * Anchor resolution and extents (SPEC-131 steps 2–8; WORK-587, WORK-588).
 *
 * Addresses a region of a file by **name** rather than by coordinate. A line
 * range is a coordinate into a file nobody promised to hold still; an anchor
 * that stops matching fails loudly instead of rendering a plausible wrong span.
 *
 * Two independent halves. Finding the anchor is a regex problem and is easy.
 * Finding the extent is not a regex problem — but it is not a grammar problem
 * either, which is what makes ~200 table-driven lines beat a parser that would
 * work on TypeScript and be useless on the CSS, Markdown, JSON and shell the
 * docs also quote (D1).
 *
 * **Anchors match raw source; the mask only rejects.** Matching against masked
 * text blanks every string literal, so `match='"scripts"'` against
 * `package.json` could never match. The mask is still needed in the other
 * direction: an anchor landing *inside* a comment or a string is a false
 * positive and is skipped.
 *
 * **Depth is relative to the anchor, not to the file.** The spec's prototype
 * counted from file start, which is indistinguishable from anchor-relative for
 * the top-level symbols it was measured on — every one sits at depth 0. It is
 * wrong for any nested target: a key inside `"scripts"`, a method in a class, a
 * rule inside `@media`. `packages/lumina/styles/runes/hint.css` is the live
 * proof: the file is wrapped in `@layer skin {`, so `.rf-hint` sits at depth 1
 * and absolute counting returns the whole file instead of the rule.
 *
 * **Reaching EOF is a refusal, never a return.** Returning the remainder is
 * precisely the plausible-wrong render this spec exists to prevent (D4).
 */

import type { LanguageDefinition } from './languages.js';
import {
	docHeadStart,
	escapeRegExp,
	isRangeMasked,
	maskComments,
	maskSource,
	symbolAnchorPattern,
} from './mask.js';

/** The four structural families an extent can belong to (D11). */
export type ExtentStrategy = 'auto' | 'dedent' | 'section' | 'paired';

export interface AnchorOptions {
	/** Named declaration — builds its anchor from the language's keywords. */
	symbol?: string;
	/** Raw regex anchor. The general form; `symbol` is sugar over it (D3). */
	match?: string;
	/** Which match to take when the anchor is ambiguous, 1-based (D17). */
	occurrence?: number;
	/** Extent strategy. Defaults to `auto`. */
	extent?: ExtentStrategy;
	/** Regex ending the extent, **exclusive** of the matching line (D12). */
	until?: string;
	/** Regex ending the extent, **inclusive** of the matching line (D12). */
	through?: string;
	/** Include the preceding doc comment. Tri-state: unset takes the mode's
	 *  default — on for `symbol`, off for `match` (D9). */
	doc?: boolean;
}

/** A resolved region, in 1-indexed inclusive file coordinates. */
export interface AnchorResolution {
	start: number;
	end: number;
	/** Non-fatal diagnostics — ambiguity, principally (D14). */
	warnings: string[];
}

/** Raised for every refusal. The message names the file, the anchor, the
 *  reason and the fallback, per D4. */
export class AnchorResolutionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AnchorResolutionError';
	}
}

/** The fallback clause every refusal ends with (D4). A refusal that does not
 *  say what to do instead is a dead end. */
function fallbackAdvice(): string {
	return (
		'Use `until="…"` or `through="…"` to end the extent at a regex ' +
		'(`through` includes the matching line, `until` excludes it), or `lines=` to ' +
		'address by line range.'
	);
}

function refuse(file: string, anchorLabel: string, reason: string): never {
	throw new AnchorResolutionError(
		`could not resolve ${anchorLabel} in ${file} — ${reason} ${fallbackAdvice()}`,
	);
}

/** Absolute character offset of the start of each line. */
function lineOffsets(source: string): number[] {
	const offsets = [0];
	for (let i = 0; i < source.length; i++) {
		if (source[i] === '\n') offsets.push(i + 1);
	}
	return offsets;
}

/** Expand leading tabs and measure the indent column of a line. */
function indentWidth(line: string, tabWidth: number): number {
	let width = 0;
	for (const ch of line) {
		if (ch === ' ') width++;
		else if (ch === '\t') width += tabWidth - (width % tabWidth);
		else break;
	}
	return width;
}

/** Whether a line is blank or wholly a comment — skipped by continuation
 *  lookahead and by `dedent`. */
function isBlankOrComment(line: string, lang: LanguageDefinition | undefined): boolean {
	const text = line.trim();
	if (text.length === 0) return true;
	if (!lang) return false;
	if (lang.lineComments.some((p) => text.startsWith(p))) return true;
	if (lang.blockComments.some(([open]) => text.startsWith(open))) return true;
	// A `*` continuation inside a block comment, recognised only where the
	// language actually has block comments.
	if (lang.blockComments.length > 0 && text.startsWith('*')) return true;
	return false;
}

/**
 * Tokens that mean "the previous line was not finished".
 *
 * Without this lookahead a union type with a comment between members ends
 * early — one of the three termination rules that each cost an iteration of
 * the spec's prototype to find.
 */
const CONTINUATION = /^(\||&|\.|\?|:|,|\)|\]|\}|=>|extends\b)/;

/** Count delimiters on a masked line. */
function countDelimiters(line: string): {
	brace: number;
	paren: number;
	bracket: number;
	semicolonAtDepth: boolean;
	closingBraceIndex: number;
} {
	let brace = 0;
	let paren = 0;
	let bracket = 0;
	let semicolonAtDepth = false;
	let closingBraceIndex = -1;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '{') brace++;
		else if (ch === '}') {
			brace--;
			if (closingBraceIndex === -1) closingBraceIndex = i;
		} else if (ch === '(') paren++;
		else if (ch === ')') paren--;
		else if (ch === '[') bracket++;
		else if (ch === ']') bracket--;
		else if (ch === ';' && brace === 0 && paren === 0 && bracket === 0) {
			semicolonAtDepth = true;
		}
	}

	return { brace, paren, bracket, semicolonAtDepth, closingBraceIndex };
}

/** Whether the anchor declares a `type` alias, which never terminates on a
 *  brace — a type-level object literal is not a body. */
function isTypeAlias(line: string, lang: LanguageDefinition | undefined): boolean {
	if (!lang?.keywords.includes('type')) return false;
	const modifiers = lang.modifiers.map(escapeRegExp).join('|');
	const prefix = modifiers.length > 0 ? `((${modifiers})\\s+)*` : '';
	return new RegExp(`^\\s*${prefix}type\\s+`).test(line);
}

/** Every line whose anchor regex matches outside a masked region. */
function enumerateMatches(
	source: string,
	/** The **comment-only** mask, not the full one — see `maskComments`. A JSON
	 *  key is a string literal, and rejecting matches inside literals would
	 *  make every key unaddressable. */
	commentMask: string,
	lines: string[],
	pattern: RegExp,
): number[] {
	const offsets = lineOffsets(source);
	const found: number[] = [];

	for (let i = 0; i < lines.length; i++) {
		// A fresh regex per line: a caller-supplied `match=` may carry flags,
		// and a sticky or global one would otherwise carry lastIndex across
		// lines and skip matches.
		const re = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
		const m = re.exec(lines[i]);
		if (!m) continue;

		const from = offsets[i] + m.index;
		if (isRangeMasked(source, commentMask, from, from + m[0].length)) continue;

		found.push(i);
	}

	return found;
}

/**
 * The `auto` extent — delimiter balance.
 *
 * Returns the 0-indexed inclusive end line, or `-1` when the scan reached EOF
 * without terminating.
 */
function extentAuto(
	maskedLines: string[],
	anchorLine: number,
	typeAlias: boolean,
	lang: LanguageDefinition | undefined,
	rawLines: string[],
): number {
	// `auto` is the balanced-delimiter family's strategy. In an
	// indentation-structured or tag-paired language there is no `;` and no
	// matching `}` to find, so the honest answer is to refuse and name the
	// strategy that fits — not to let the brace-less rule below terminate on
	// the first line that happens to sit at the anchor's depth, which in
	// Python is the very next one.
	if (!lang?.delimited) return -1;

	let brace = 0;
	let paren = 0;
	let bracket = 0;
	let openedBrace = false;

	for (let i = anchorLine; i < maskedLines.length; i++) {
		const counts = countDelimiters(maskedLines[i]);

		// A `;` at anchor depth terminates — but only when nothing this line
		// opened is still open, which `countDelimiters` already accounts for by
		// tracking depth within the line.
		const braceBefore = brace;
		brace += counts.brace;
		paren += counts.paren;
		bracket += counts.bracket;

		if (braceBefore === 0 && counts.brace > 0) openedBrace = true;

		// Rule 1 — `}` closing a brace block opened at anchor depth. Parens and
		// brackets nest but never end a statement. Suppressed for `type`.
		if (!typeAlias && openedBrace && brace === 0 && paren === 0 && bracket === 0) {
			return i;
		}

		// Rule 2 — `;` at anchor depth.
		if (counts.semicolonAtDepth && brace === 0 && paren === 0 && bracket === 0) {
			return i;
		}

		// Rule 3 — a brace-less statement ends at the first line back at anchor
		// depth that is not followed by a continuation.
		if (!openedBrace && brace === 0 && paren === 0 && bracket === 0 && i > anchorLine) {
			let j = i + 1;
			while (j < rawLines.length && isBlankOrComment(rawLines[j], lang)) j++;
			if (j >= rawLines.length) return i;
			if (!CONTINUATION.test(rawLines[j].trim())) return i;
		}
	}

	return -1;
}

/** The `dedent` extent — consume blank lines and lines indented deeper than
 *  the anchor. For Python, YAML, and anything else where indentation carries
 *  the block. */
function extentDedent(
	rawLines: string[],
	anchorLine: number,
	lang: LanguageDefinition | undefined,
): number {
	const tabWidth = lang?.tabWidth ?? 4;
	const anchorIndent = indentWidth(rawLines[anchorLine], tabWidth);

	let end = anchorLine;
	for (let i = anchorLine + 1; i < rawLines.length; i++) {
		if (rawLines[i].trim().length === 0) continue; // blank lines do not end it
		if (indentWidth(rawLines[i], tabWidth) > anchorIndent) {
			end = i;
			continue;
		}
		break;
	}
	return end;
}

/**
 * The `section` extent — consume forward to the next sibling at the anchor's
 * own level.
 *
 * The terminator is **derived from the anchor line** rather than supplied by
 * the author: a `###` heading ends at the next `^#{1,3}\s`, a `[tool.poetry]`
 * table at the next `^\[`. Anchor on a `###` and an author-written `^## ` is
 * simply wrong, which is why this is a strategy rather than a burden.
 */
function extentSection(
	rawLines: string[],
	maskedLines: string[],
	anchorLine: number,
	lang: LanguageDefinition | undefined,
): number | undefined {
	if (!lang || lang.headings.length === 0) return undefined;

	for (const heading of lang.headings) {
		const re = new RegExp(heading.pattern);
		const m = re.exec(rawLines[anchorLine]);
		if (!m) continue;

		const level = (m[1] ?? '').length;

		for (let i = anchorLine + 1; i < rawLines.length; i++) {
			// Siblings are sought in the **masked** text: a `## ` inside a
			// fenced example is not a heading, and treating it as one truncates
			// the section at the first code block that shows one.
			const sib = re.exec(maskedLines[i]);
			if (!sib) continue;
			if ((sib[1] ?? '').length <= level) return i - 1;
		}
		return rawLines.length - 1;
	}

	return undefined;
}

/** The `paired` extent — balance a matching token pair rather than a
 *  delimiter. Handles the three token shapes the table distinguishes. */
function extentPaired(
	rawLines: string[],
	maskedLines: string[],
	anchorLine: number,
	lang: LanguageDefinition | undefined,
): number | undefined {
	if (!lang || lang.tokenPairs.length === 0) return undefined;

	const anchorText = rawLines[anchorLine];

	// Self-closing first: there is no close token, so a scan would run to EOF.
	for (const pair of lang.tokenPairs) {
		if (pair.shape !== 'selfClosing') continue;
		if (pair.close.length > 0 && anchorText.includes(pair.close)) return anchorLine;
	}

	for (const pair of lang.tokenPairs) {
		if (pair.shape === 'selfClosing') continue;
		if (!anchorText.includes(pair.open)) continue;

		if (pair.shape === 'symmetric') {
			// Cannot nest — the first recurrence closes. Fence markers survive
			// masking, so the masked text is the right thing to scan.
			for (let i = anchorLine + 1; i < rawLines.length; i++) {
				if (maskedLines[i].includes(pair.open)) return i;
			}
			return undefined;
		}

		// Asymmetric and nestable — count depth on the **masked** text, so a
		// `{% tab %}` inside an inline code span does not move the count. The
		// anchor line itself is read raw, since that is what the author matched.
		let depth = 0;
		for (let i = anchorLine; i < rawLines.length; i++) {
			const text = i === anchorLine ? rawLines[i] : maskedLines[i];
			const closes = occurrences(text, pair.close);
			// An open token is only an open when it is not the close token's
			// own prefix: `{% /tabs %}` contains `{%`.
			const opens = occurrences(text, pair.open) - closes;
			depth += opens - closes;
			if (i > anchorLine || opens > 0) {
				if (depth <= 0) return i;
			}
		}
		return undefined;
	}

	return undefined;
}

function occurrences(haystack: string, needle: string): number {
	if (needle.length === 0) return 0;
	let count = 0;
	let idx = haystack.indexOf(needle);
	while (idx !== -1) {
		count++;
		idx = haystack.indexOf(needle, idx + needle.length);
	}
	return count;
}

/** Re-mask the extracted slice and verify `{}`, `()` and `[]` all balance.
 *  Required for `auto`, and **inert everywhere else** — D2. */
function isBalanced(slice: string, lang: LanguageDefinition | undefined): boolean {
	const masked = maskSource(slice, lang);
	let brace = 0;
	let paren = 0;
	let bracket = 0;

	for (const ch of masked) {
		if (ch === '{') brace++;
		else if (ch === '}') brace--;
		else if (ch === '(') paren++;
		else if (ch === ')') paren--;
		else if (ch === '[') bracket++;
		else if (ch === ']') bracket--;
		if (brace < 0 || paren < 0 || bracket < 0) return false;
	}

	return brace === 0 && paren === 0 && bracket === 0;
}

/** Annotations attach to the declaration **always**, independent of `doc`: a
 *  class quoted without its decorator is wrong in a way a class quoted without
 *  its doc comment is not. */
function absorbAnnotations(
	lines: string[],
	line: number,
	lang: LanguageDefinition | undefined,
): number {
	if (!lang || lang.annotations.length === 0) return line;

	let start = line;
	for (let i = line - 1; i >= 0; i--) {
		const text = lines[i].trim();
		if (text.length === 0) break;
		if (!lang.annotations.some((a) => text.startsWith(a))) break;
		// A line opening a block is a wrapper, not a decoration.
		if (text.endsWith('{')) break;
		start = i;
	}
	return start;
}

/**
 * Resolve an anchor to a line range.
 *
 * @param source Raw file text.
 * @param lang The language's lexical definition, or `undefined` when the
 *   language is absent from the table.
 * @param opts The authored attributes.
 * @param file Path used in refusal messages.
 */
export function resolveAnchor(
	source: string,
	lang: LanguageDefinition | undefined,
	opts: AnchorOptions,
	file: string,
): AnchorResolution {
	const warnings: string[] = [];
	const rawLines = source.split('\n');
	// Two masks, answering two different questions. `masked` blanks every
	// literal and is what the depth counter reads; `commentMask` blanks only
	// commentary and is what the anchor step rejects against.
	const masked = maskSource(source, lang);
	const maskedLines = masked.split('\n');
	const commentMask = maskComments(source, lang);

	const usingSymbol = typeof opts.symbol === 'string' && opts.symbol.length > 0;
	const usingMatch = typeof opts.match === 'string' && opts.match.length > 0;

	if (usingSymbol && usingMatch) {
		throw new AnchorResolutionError(
			`snippet \`symbol\` and \`match\` are mutually exclusive — ${file} sets both. ` +
				'`symbol` names a declaration; `match` is a raw regex.',
		);
	}

	const anchorLabel = usingSymbol ? `symbol "${opts.symbol}"` : `match /${opts.match}/`;

	// --- Build the anchor pattern ------------------------------------------
	let pattern: RegExp;
	if (usingSymbol) {
		const src = symbolAnchorPattern(opts.symbol as string, lang);
		if (!src) {
			refuse(
				file,
				anchorLabel,
				`this language declares no \`symbol\` keywords, so a named declaration cannot be located.`,
			);
		}
		pattern = new RegExp(src);
	} else {
		try {
			pattern = new RegExp(opts.match as string);
		} catch (err) {
			throw new AnchorResolutionError(
				`snippet \`match\` value /${opts.match}/ is not a valid regular expression: ` +
					`${(err as Error).message}`,
			);
		}
	}

	// --- Enumerate every match once; the warning and `occurrence` both read
	// --- from this one list, so they cannot disagree (D14 + D17).
	const matches = enumerateMatches(source, commentMask, rawLines, pattern);

	if (matches.length === 0) {
		refuse(file, anchorLabel, 'no line matches the anchor.');
	}

	if (matches.length > 1) {
		const where = matches.map((i) => `${file}:${i + 1}`).join(', ');
		warnings.push(
			`snippet anchor ${anchorLabel} is ambiguous in ${file} — ${matches.length} lines match ` +
				`(${where}). Taking ${opts.occurrence ? `occurrence ${opts.occurrence}` : 'the first'}. ` +
				'Use a more specific `match=` regex, or `occurrence=` to select one.',
		);
	}

	const occurrence = opts.occurrence ?? 1;
	if (!Number.isInteger(occurrence) || occurrence < 1) {
		throw new AnchorResolutionError(
			`snippet \`occurrence\` must be a positive integer, got ${String(opts.occurrence)}.`,
		);
	}
	if (occurrence > matches.length) {
		// Never clamp to the last and never fall back to the first — a clamp is
		// the plausible-wrong render this spec exists to prevent (D17).
		const where = matches.map((i) => `${file}:${i + 1}`).join(', ');
		refuse(
			file,
			anchorLabel,
			`\`occurrence=${occurrence}\` was requested but only ${matches.length} ` +
				`match${matches.length === 1 ? '' : 'es'} exist${matches.length === 1 ? 's' : ''} (${where}).`,
		);
	}

	const anchorLine = matches[occurrence - 1];

	// --- Extent -------------------------------------------------------------
	const strategy: ExtentStrategy = opts.extent ?? 'auto';
	let end: number;
	let selfCheck = false;

	const hasUntil = typeof opts.until === 'string' && opts.until.length > 0;
	const hasThrough = typeof opts.through === 'string' && opts.through.length > 0;

	if (hasUntil && hasThrough) {
		throw new AnchorResolutionError(
			`snippet \`until\` and \`through\` are mutually exclusive — ${file} sets both. ` +
				'`through` includes the matching line; `until` excludes it.',
		);
	}

	if (hasUntil || hasThrough) {
		// D12 — two attributes on purpose. `until="^}"` in code wants the
		// terminator line in; `until="^## "` in Markdown wants it out. Either
		// default is silently wrong half the time.
		const raw = (hasThrough ? opts.through : opts.until) as string;
		let terminator: RegExp;
		try {
			terminator = new RegExp(raw);
		} catch (err) {
			throw new AnchorResolutionError(
				`snippet \`${hasThrough ? 'through' : 'until'}\` value /${raw}/ is not a valid ` +
					`regular expression: ${(err as Error).message}`,
			);
		}

		let found = -1;
		for (let i = anchorLine + 1; i < rawLines.length; i++) {
			if (terminator.test(rawLines[i])) {
				found = i;
				break;
			}
		}
		if (found === -1) {
			// A fallback that fails silently is worse than no fallback, because
			// every other refusal message points authors at it (D4).
			refuse(
				file,
				anchorLabel,
				`\`${hasThrough ? 'through' : 'until'}="${raw}"\` never matches after the anchor, ` +
					'so the extent has no end.',
			);
		}
		end = hasThrough ? found : found - 1;
		if (end < anchorLine) end = anchorLine;
	} else if (strategy === 'auto') {
		selfCheck = true;
		const typeAlias = isTypeAlias(rawLines[anchorLine], lang);
		const found = extentAuto(maskedLines, anchorLine, typeAlias, lang, rawLines);
		if (found === -1) {
			// Naming the strategy that fits is the difference between a refusal
			// an author can act on and one they have to research.
			const paired =
				lang && lang.tokenPairs.length > 0
					? ' This file is tag-paired, so `extent="paired"` is likely what you want.'
					: '';
			refuse(
				file,
				anchorLabel,
				'the `auto` extent reached end of file without finding a terminator, so the ' +
					'extent is unknown. `auto` balances delimiters, which only ends a construct in a ' +
					'brace-and-semicolon language. If this file is indentation-structured (Python, ' +
					`YAML), use \`extent="dedent"\`.${paired}`,
			);
		}
		end = found;
	} else if (strategy === 'dedent') {
		end = extentDedent(rawLines, anchorLine, lang);
	} else if (strategy === 'section') {
		const found = extentSection(rawLines, maskedLines, anchorLine, lang);
		if (found === undefined) {
			refuse(
				file,
				anchorLabel,
				'`extent="section"` needs a heading shape for this language, and the anchor line ' +
					'does not match one.',
			);
		}
		end = found;
	} else {
		const found = extentPaired(rawLines, maskedLines, anchorLine, lang);
		if (found === undefined) {
			refuse(
				file,
				anchorLabel,
				'`extent="paired"` found no matching close token for the anchor line.',
			);
		}
		end = found;
	}

	// --- Self-check (auto only — D2) ---------------------------------------
	if (selfCheck) {
		const slice = rawLines.slice(anchorLine, end + 1).join('\n');
		if (!isBalanced(slice, lang)) {
			refuse(
				file,
				anchorLabel,
				'the extracted slice is not delimiter-balanced, so the extent is wrong.',
			);
		}
	}

	// --- Head ---------------------------------------------------------------
	const annotationStart = absorbAnnotations(rawLines, anchorLine, lang);
	const includeDoc = opts.doc ?? usingSymbol;
	const start = includeDoc ? docHeadStart(rawLines, annotationStart, lang) : annotationStart;

	return { start: start + 1, end: end + 1, warnings };
}
