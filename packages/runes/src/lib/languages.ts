/**
 * The per-language lexical table (SPEC-131 D15, WORK-597).
 *
 * This module is **data**. The state machine that reads it lives in
 * `mask.ts`, and the split is deliberate — D15 draws the line between what is
 * declarative (comment prefixes, string delimiters, `symbol=` keywords, token
 * pairs, heading shapes, tab width) and what stays code (the masker, the depth
 * counter, continuation lookahead, the balance self-check).
 *
 * **Why a table and not a union regex (D10).** The obvious shortcut is to walk
 * `^\s*(//|#|\*|/\*)` across every language at once. In CSS that eats
 * `#header { … }` as a comment, and a head that silently swallows a preceding
 * rule is exactly the failure class SPEC-131 exists to remove. There are zero
 * such lines in Lumina today, so this repository would never notice — but
 * refrakt ships to projects whose files we have never seen.
 *
 * **A language absent from this table gets no guess.** No comment prefixes
 * means no head absorption and nothing masked, rather than a plausible default
 * that is wrong in a format nobody checked.
 *
 * **No config surface ships with this (D15).** `refrakt.config.json` gains no
 * `languages` or `anchors` key in this milestone. What ships is the
 * {@link mergeLanguages} seam, mirroring `mergeThemeConfig()`, so that
 * declaring a language later is an additive change rather than a retrofit of a
 * hard-coded table.
 */

import { inferLanguage } from '../lang-map.js';

/** A string delimiter and whether it may span a line break. */
export interface StringDelimiter {
	/** The opening and closing character(s) — the same on both ends. */
	delim: string;
	/** When false (the default) an unterminated string ends at the newline. */
	multiline?: boolean;
}

/**
 * A template delimiter — a string that can contain interpolated code.
 *
 * The interpolation tokens are table data rather than a hard-coded `${`,
 * because the masker must not branch per language (D15).
 */
export interface TemplateDelimiter {
	delim: string;
	/** Token that re-enters code state, e.g. `'${'`. Omit for no interpolation. */
	interpolationOpen?: string;
	/** Token that returns to template state, e.g. `'}'`. */
	interpolationClose?: string;
}

/**
 * A paired token — WORK-588's `extent="paired"` reads these.
 *
 * Declared here now rather than later because retrofitting a hard-coded table
 * is the expensive part, and the shape is what this module exists to get right.
 */
export interface TokenPair {
	open: string;
	close: string;
	/**
	 * `asymmetric` — distinct open/close, nests (`{% tabs %}` / `{% /tabs %}`).
	 * `symmetric` — same token both ends, cannot nest, first recurrence closes
	 * (a ``` fence).
	 * `selfClosing` — no close at all (`{% snippet /%}`, `<img>`); a `paired`
	 * scan anchored on one returns a single line rather than running to EOF.
	 */
	shape: 'asymmetric' | 'symmetric' | 'selfClosing';
}

/** A heading shape — WORK-588's `extent="section"` derives its terminator here. */
export interface HeadingShape {
	/**
	 * Matches a heading line. Capture group 1 must be the part whose **length**
	 * gives the nesting level (`###` → 3), so `section` can build a terminator
	 * for the anchor's own level without the author doing the arithmetic.
	 */
	pattern: string;
}

/** Everything the lexical layer knows about one language. */
export interface LanguageDefinition {
	/** Line-comment prefixes. Empty means the language has none. */
	lineComments: string[];
	/** Block-comment open/close pairs. */
	blockComments: Array<[open: string, close: string]>;
	/** Quote delimiters. */
	strings: StringDelimiter[];
	/** Template delimiters, which may contain interpolated code. */
	templates: TemplateDelimiter[];
	/** Escape character inside strings and templates. */
	escape?: string;
	/**
	 * Annotation prefixes that attach to a declaration (`@Component`,
	 * `#[derive]`, `@dataclass`). WORK-587 attaches these to the symbol always,
	 * independently of `doc`.
	 */
	annotations: string[];
	/** `symbol=` declaration keywords. */
	keywords: string[];
	/** Declaration modifiers permitted before a keyword. */
	modifiers: string[];
	/** Heading shapes — WORK-588 (`extent="section"`). */
	headings: HeadingShape[];
	/** Token pairs — WORK-588 (`extent="paired"`). */
	tokenPairs: TokenPair[];
	/** Columns a tab expands to — WORK-588 (`extent="dedent"`). */
	tabWidth: number;
}

/** A partial definition, as an override or a newly declared language. */
export type LanguageDefinitionOverrides = Partial<LanguageDefinition>;

/**
 * The C-family lexical core, for the languages that agree on it.
 *
 * A function rather than a shared object so each language gets its own arrays:
 * four definitions pointing at one `blockComments` array is a footgun waiting
 * for the first consumer that mutates what it was handed.
 */
function cFamily(): Pick<
	LanguageDefinition,
	'lineComments' | 'blockComments' | 'strings' | 'escape' | 'tabWidth'
> {
	return {
		lineComments: ['//'],
		blockComments: [['/*', '*/']],
		strings: [{ delim: '"' }, { delim: "'" }],
		escape: '\\',
		tabWidth: 4,
	};
}

/**
 * The built-in table.
 *
 * Keys are the highlight-language identifiers `LANG_MAP` already produces, so
 * extension → language identification is reused rather than duplicated.
 */
export const BASE_LANGUAGES: Readonly<Record<string, LanguageDefinition>> = Object.freeze({
	typescript: {
		...cFamily(),
		templates: [{ delim: '`', interpolationOpen: '${', interpolationClose: '}' }],
		annotations: ['@'],
		keywords: [
			'interface',
			'type',
			'class',
			'const',
			'let',
			'var',
			'function',
			'enum',
			'namespace',
		],
		modifiers: [
			'export',
			'default',
			'declare',
			'async',
			'abstract',
			'static',
			'public',
			'private',
			'protected',
			'readonly',
		],
		headings: [],
		tokenPairs: [],
	},
	javascript: {
		...cFamily(),
		templates: [{ delim: '`', interpolationOpen: '${', interpolationClose: '}' }],
		annotations: ['@'],
		keywords: ['class', 'const', 'let', 'var', 'function'],
		modifiers: ['export', 'default', 'async', 'static'],
		headings: [],
		tokenPairs: [],
	},
	json: {
		// JSON has no comments. Giving it `//` would blank a URL inside a string
		// value on any file that reached the masker before the string rule.
		lineComments: [],
		blockComments: [],
		strings: [{ delim: '"' }],
		templates: [],
		escape: '\\',
		annotations: [],
		keywords: [],
		modifiers: [],
		headings: [],
		tokenPairs: [],
		tabWidth: 2,
	},
	jsonc: {
		lineComments: ['//'],
		blockComments: [['/*', '*/']],
		strings: [{ delim: '"' }],
		templates: [],
		escape: '\\',
		annotations: [],
		keywords: [],
		modifiers: [],
		headings: [],
		tokenPairs: [],
		tabWidth: 2,
	},
	css: {
		// D10's hazard lives here: CSS has **no** line comment. `#header { … }`
		// is an id selector, and a `#` prefix would swallow the rule above any
		// anchor that followed it.
		lineComments: [],
		blockComments: [['/*', '*/']],
		strings: [{ delim: '"' }, { delim: "'" }],
		templates: [],
		escape: '\\',
		annotations: ['@'],
		keywords: [],
		modifiers: [],
		headings: [],
		tokenPairs: [],
		tabWidth: 2,
	},
	python: {
		lineComments: ['#'],
		blockComments: [],
		strings: [
			{ delim: '"""', multiline: true },
			{ delim: "'''", multiline: true },
			{ delim: '"' },
			{ delim: "'" },
		],
		templates: [],
		escape: '\\',
		annotations: ['@'],
		keywords: ['def', 'class'],
		modifiers: ['async'],
		headings: [],
		tokenPairs: [],
		tabWidth: 4,
	},
	rust: {
		...cFamily(),
		templates: [],
		annotations: ['#['],
		keywords: ['struct', 'impl', 'fn', 'trait', 'enum', 'type', 'const', 'mod'],
		modifiers: ['pub', 'async', 'unsafe', 'default'],
		headings: [],
		tokenPairs: [],
	},
	go: {
		...cFamily(),
		strings: [{ delim: '"' }, { delim: "'" }],
		templates: [{ delim: '`' }],
		annotations: [],
		keywords: ['func', 'type', 'var', 'const'],
		modifiers: [],
		headings: [],
		tokenPairs: [],
		tabWidth: 8,
	},
	yaml: {
		lineComments: ['#'],
		blockComments: [],
		strings: [{ delim: '"' }, { delim: "'" }],
		templates: [],
		escape: '\\',
		annotations: [],
		keywords: [],
		modifiers: [],
		headings: [],
		tokenPairs: [],
		tabWidth: 2,
	},
	toml: {
		lineComments: ['#'],
		blockComments: [],
		strings: [{ delim: '"' }, { delim: "'" }],
		templates: [],
		escape: '\\',
		annotations: [],
		keywords: [],
		modifiers: [],
		// A TOML table header is sibling-terminated; every table is level 1, so
		// the capture is the bracket itself.
		headings: [{ pattern: '^(\\[)[^\\[\\]]+\\]\\s*$' }],
		tokenPairs: [],
		tabWidth: 2,
	},
	bash: {
		lineComments: ['#'],
		blockComments: [],
		strings: [{ delim: '"' }, { delim: "'" }],
		templates: [],
		escape: '\\',
		annotations: [],
		keywords: ['function'],
		modifiers: [],
		headings: [],
		tokenPairs: [],
		tabWidth: 4,
	},
	html: {
		lineComments: [],
		blockComments: [['<!--', '-->']],
		strings: [{ delim: '"' }, { delim: "'" }],
		templates: [],
		annotations: [],
		keywords: [],
		modifiers: [],
		headings: [],
		tokenPairs: [
			{ open: '<', close: '</', shape: 'asymmetric' },
			{ open: '<img', close: '', shape: 'selfClosing' },
			{ open: '<br', close: '', shape: 'selfClosing' },
		],
		tabWidth: 2,
	},
	markdoc: {
		// Markdown's masker is recursive — fenced blocks and inline code spans
		// that frequently contain the very tokens being counted. SPEC-131 is
		// explicit that this is "not the same ~40 lines" as the C family, so it
		// is WORK-588's, alongside the strategies that need it. The shapes
		// below are declared now; nothing masks them yet.
		lineComments: [],
		blockComments: [['<!--', '-->']],
		strings: [],
		templates: [],
		annotations: [],
		keywords: [],
		modifiers: [],
		headings: [{ pattern: '^(#{1,6})\\s+\\S' }],
		tokenPairs: [
			{ open: '{%', close: '{% /', shape: 'asymmetric' },
			{ open: '```', close: '```', shape: 'symmetric' },
			{ open: '{%', close: '/%}', shape: 'selfClosing' },
		],
		tabWidth: 2,
	},
	svelte: {
		lineComments: [],
		blockComments: [['<!--', '-->']],
		strings: [{ delim: '"' }, { delim: "'" }],
		templates: [],
		annotations: [],
		keywords: [],
		modifiers: [],
		headings: [],
		tokenPairs: [{ open: '<', close: '</', shape: 'asymmetric' }],
		tabWidth: 2,
	},
	vue: {
		lineComments: [],
		blockComments: [['<!--', '-->']],
		strings: [{ delim: '"' }, { delim: "'" }],
		templates: [],
		annotations: [],
		keywords: [],
		modifiers: [],
		headings: [],
		tokenPairs: [{ open: '<', close: '</', shape: 'asymmetric' }],
		tabWidth: 2,
	},
});

/**
 * Merge language overrides onto a base table, mirroring `mergeThemeConfig()`.
 *
 * A key with no base entry is a **newly declared language**, not an override,
 * and is taken whole — so the seam supports both extension surfaces D15 names
 * without either of them shipping a config key yet. A key that does exist is
 * merged field by field, with a provided array replacing the base array rather
 * than concatenating: a project narrowing a language's comment prefixes must
 * be able to remove one, which a concatenating merge makes impossible.
 */
export function mergeLanguages(
	base: Readonly<Record<string, LanguageDefinition>>,
	overrides: Record<string, LanguageDefinitionOverrides>,
): Record<string, LanguageDefinition> {
	const merged: Record<string, LanguageDefinition> = { ...base };

	for (const [name, override] of Object.entries(overrides)) {
		const existing = merged[name];
		if (!existing) {
			merged[name] = normalizeDefinition(override);
			continue;
		}
		merged[name] = {
			...existing,
			...override,
		};
	}

	return merged;
}

/** Fill a partial definition out to a complete one — an undeclared field is
 *  empty rather than inherited from an unrelated language. */
function normalizeDefinition(partial: LanguageDefinitionOverrides): LanguageDefinition {
	return {
		lineComments: partial.lineComments ?? [],
		blockComments: partial.blockComments ?? [],
		strings: partial.strings ?? [],
		templates: partial.templates ?? [],
		escape: partial.escape,
		annotations: partial.annotations ?? [],
		keywords: partial.keywords ?? [],
		modifiers: partial.modifiers ?? [],
		headings: partial.headings ?? [],
		tokenPairs: partial.tokenPairs ?? [],
		tabWidth: partial.tabWidth ?? 4,
	};
}

/**
 * Look up the lexical definition for a file path or language identifier.
 *
 * Accepts what `inferLanguage` accepts (a path, an extension, or a bare
 * extension) as well as a language id directly. Returns `undefined` for a
 * language not in the table — the caller must treat that as "no lexical
 * knowledge", never as a default.
 */
export function resolveLanguage(
	pathOrLang: string,
	table: Readonly<Record<string, LanguageDefinition>> = BASE_LANGUAGES,
): LanguageDefinition | undefined {
	if (typeof pathOrLang !== 'string' || pathOrLang.length === 0) return undefined;
	// A language id wins over extension inference, so `resolveLanguage('css')`
	// works without dressing it up as a filename.
	const direct = table[pathOrLang.toLowerCase()];
	if (direct) return direct;
	return table[inferLanguage(pathOrLang)];
}
