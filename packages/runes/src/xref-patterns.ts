/**
 * Cross-reference pattern compilation.
 *
 * Compiles user-authored `XrefPattern` config entries from `refrakt.config.json`
 * into validated, ready-to-use `CompiledXrefPattern` objects. The runtime
 * resolver (in `xref-resolve.ts`) consumes the compiled forms to turn
 * unresolved xref IDs into URLs.
 *
 * Validation rules (per SPEC-065):
 * - `match` must compile as a JavaScript regex; anchored to whole-string match
 *   by default (`^` and `$` auto-applied unless explicit anchors are present
 *   at the start/end of the pattern).
 * - `template` placeholders must each be `id` or a named group of the regex.
 * - `type` defaults to `"external"`. The value `"unresolved"` is reserved.
 * - `label` defaults to `"{id}"` and uses the same placeholder syntax as
 *   `template`.
 * - Duplicate `match` strings across entries are flagged as a warning (not an
 *   error; first-wins ordering still produces deterministic behaviour).
 */

import type { XrefPattern } from '@refrakt-md/types';

/** A pattern entry compiled and ready to be matched against an xref ID at
 *  resolve time. Authored {@link XrefPattern}s in `refrakt.config.json` are
 *  turned into this shape once per build via {@link compileXrefPatterns}. */
export interface CompiledXrefPattern {
	/** The compiled regex (already wrapped in whole-string anchors if needed). */
	match: RegExp;
	/** URL template — same string the author wrote, ready for placeholder
	 *  substitution by the resolver. */
	template: string;
	/** CSS modifier class value. Defaulted to `"external"` if the author
	 *  omitted it. */
	type: string;
	/** Link-text template. Defaulted to `"{id}"` if the author omitted it. */
	label: string;
	/** Named groups declared in the regex, in declaration order. The resolver
	 *  uses these (plus the implicit `{id}`) to validate template placeholders
	 *  at match time. */
	groupNames: string[];
}

/** Diagnostics produced by {@link compileXrefPatterns}. Compilation never
 *  throws — fatal cases (invalid regex, unknown placeholder, reserved type)
 *  are surfaced via `errors`; soft diagnostics (duplicate `match`) via
 *  `warnings`. Adapters decide how to render them. */
export interface CompiledXrefPatternsResult {
	patterns: CompiledXrefPattern[];
	errors: string[];
	warnings: string[];
}

/** Reserved `type` values that cannot be used in pattern entries. */
const RESERVED_TYPES = new Set(['unresolved']);

/** Match `(?<name>` declarations in a regex source. Used to enumerate named
 *  groups statically (JS `RegExp` instances don't expose group names without
 *  a successful match). */
const NAMED_GROUP_RE = /\(\?<([a-zA-Z_$][a-zA-Z0-9_$]*)>/g;

/** Match `{name}` placeholders in template / label strings. */
const PLACEHOLDER_RE = /\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;

/** Apply whole-string anchoring to the pattern source. If the author already
 *  added `^` and `$` (at the very start and end), the source is used as-is.
 *  Otherwise the source is wrapped in `^(?:...)$`. Stripping any partial
 *  anchors first avoids double-anchoring like `^^...$$`. */
function anchorPatternSource(source: string): string {
	if (source.startsWith('^') && source.endsWith('$')) return source;
	let inner = source;
	if (inner.startsWith('^')) inner = inner.slice(1);
	if (inner.endsWith('$')) inner = inner.slice(0, -1);
	return `^(?:${inner})$`;
}

/** Extract named-group names from a regex source, in declaration order. */
function extractGroupNames(source: string): string[] {
	const names: string[] = [];
	NAMED_GROUP_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = NAMED_GROUP_RE.exec(source)) !== null) {
		names.push(match[1]);
	}
	return names;
}

/** Find placeholder names used in a template/label string, deduplicated. */
function extractPlaceholders(template: string): string[] {
	const seen = new Set<string>();
	PLACEHOLDER_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = PLACEHOLDER_RE.exec(template)) !== null) {
		seen.add(match[1]);
	}
	return [...seen];
}

/**
 * Compile a list of authored xref patterns into runtime-ready form.
 *
 * Returns the compiled patterns alongside errors and warnings — callers
 * (typically the content-loader bootstrap) decide whether errors should
 * throw, log, or be passed back to the user.
 */
export function compileXrefPatterns(
	patterns: XrefPattern[] | undefined,
): CompiledXrefPatternsResult {
	const result: CompiledXrefPatternsResult = {
		patterns: [],
		errors: [],
		warnings: [],
	};
	if (!patterns || patterns.length === 0) return result;

	const seenMatches = new Set<string>();

	patterns.forEach((entry, idx) => {
		const ref = `xrefs[${idx}]`;

		// Validate required fields up front.
		if (typeof entry?.match !== 'string' || entry.match.length === 0) {
			result.errors.push(`${ref}: \`match\` is required and must be a non-empty string`);
			return;
		}
		if (typeof entry.template !== 'string' || entry.template.length === 0) {
			result.errors.push(`${ref}: \`template\` is required and must be a non-empty string`);
			return;
		}

		// Reserved type rejection.
		const type = entry.type ?? 'external';
		if (RESERVED_TYPES.has(type)) {
			result.errors.push(`${ref}: \`type\` value "${type}" is reserved`);
			return;
		}

		// Duplicate match warning (doesn't fail; first-wins ordering is stable).
		if (seenMatches.has(entry.match)) {
			result.warnings.push(`${ref}: duplicate \`match\` "${entry.match}" — earlier entry wins`);
		} else {
			seenMatches.add(entry.match);
		}

		// Compile the regex with whole-string anchoring.
		const sourceAnchored = anchorPatternSource(entry.match);
		let regex: RegExp;
		try {
			regex = new RegExp(sourceAnchored);
		} catch (e) {
			result.errors.push(`${ref}: invalid regex (${(e as Error).message})`);
			return;
		}

		// Enumerate named groups so the resolver can validate matches.
		const groupNames = extractGroupNames(entry.match);

		// Validate template + label placeholders against the available names
		// (`id` is implicit; everything else must be a captured group).
		const allowed = new Set<string>(['id', ...groupNames]);
		const label = entry.label ?? '{id}';
		const templatePlaceholders = extractPlaceholders(entry.template);
		const labelPlaceholders = extractPlaceholders(label);
		const unknown: string[] = [];
		for (const name of [...templatePlaceholders, ...labelPlaceholders]) {
			if (!allowed.has(name)) unknown.push(name);
		}
		if (unknown.length > 0) {
			const dedup = [...new Set(unknown)];
			result.errors.push(
				`${ref}: unknown placeholder${dedup.length === 1 ? '' : 's'} ${dedup.map(n => `{${n}}`).join(', ')} (must be \`{id}\` or a named group of the regex)`,
			);
			return;
		}

		result.patterns.push({
			match: regex,
			template: entry.template,
			type,
			label,
			groupNames,
		});
	});

	return result;
}
