/**
 * ADR-043 decision 5 (WORK-672) — the theme vocabulary, and a check of which
 * of its values a theme styles.
 *
 * A theme configures no rune; it renders a vocabulary. What it can promise is
 * that every *value* of that vocabulary looks deliberate — every `metaType`,
 * sentiment, zone layout, section role, media kind and axis value — because a
 * rune written after the theme shipped speaks the same values. This module
 * holds the closed value lists that are defined here, and a pure check over
 * CSS text. `@refrakt-md/runes` assembles the whole vocabulary
 * (`themeVocabulary`), since several of its registries live there.
 */

/** The kinds a meta field may declare (`MetaField.metaType`). Emitted as
 *  `data-meta-type`; the base stylesheet draws `status`, `category` and `tag`
 *  as pills (WORK-671). */
export const META_TYPES = [
	'status',
	'category',
	'quantity',
	'temporal',
	'tag',
	'id',
	'code',
] as const;
export type MetaType = (typeof META_TYPES)[number];

/** Kinds the engine itself gives a value it renders richer than text: a link
 *  (`href`) and a rating (`rating`). Also `data-meta-type`. */
export const RENDERED_META_TYPES = ['link', 'rating'] as const;

/** What a meta field's value means (`sentimentMap`), emitted as
 *  `data-meta-sentiment`. */
export const SENTIMENTS = ['positive', 'negative', 'caution', 'neutral'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

/** The layouts a `blocks` entry renders with (`data-zone-layout`). */
export const LAYOUT_PRIMITIVES = ['bar', 'definition-list', 'lead'] as const;

/** One dimension of the vocabulary: the attribute it is written in, and its
 *  values. A dimension whose values are open (a preset name, a tint) has
 *  `values: null`: the attribute's presence is the vocabulary entry. */
export interface VocabularyDimension {
	/** A short name for reports: `meta-type`, `elevation`. */
	name: string;
	attribute: string;
	values: readonly string[] | null;
	/** Where the list comes from, for a reader of the report. */
	source: string;
}

/** One vocabulary entry: a value, with the selector that styles it. */
export interface VocabularyEntry {
	dimension: string;
	attribute: string;
	/** `null` for an open dimension's presence entry. */
	value: string | null;
	/** `[data-x="v"]`, or `[data-x]` for an open dimension. */
	selector: string;
}

export function vocabularyEntries(dimensions: readonly VocabularyDimension[]): VocabularyEntry[] {
	const out: VocabularyEntry[] = [];
	const seen = new Set<string>();
	for (const d of dimensions) {
		const values = d.values ?? [null];
		for (const value of values) {
			const selector = value === null ? `[${d.attribute}]` : `[${d.attribute}="${value}"]`;
			if (seen.has(selector)) continue;
			seen.add(selector);
			out.push({ dimension: d.name, attribute: d.attribute, value, selector });
		}
	}
	return out;
}

/** Where a value's styling comes from. */
export type CoverageSource = 'theme' | 'base' | 'none';

export interface VocabularyCoverageRow extends VocabularyEntry {
	/** `theme` when the theme's own CSS has a rule naming the value; `base`
	 *  when only the base stylesheet does; `none` when neither does. */
	coverage: CoverageSource;
}

/** Every selector in a stylesheet's text, comments and declarations removed,
 *  attribute selectors normalised to double quotes and no inner spaces. */
export function cssSelectors(css: string): string[] {
	const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const out: string[] = [];
	// A selector is the text before a `{` back to the previous `{`, `}` or `;`.
	const re = /([^{};]+)\{/g;
	for (let m = re.exec(text); m; m = re.exec(text)) {
		const sel = m[1].trim();
		if (!sel || sel.startsWith('@')) continue;
		out.push(normaliseSelector(sel));
	}
	return out;
}

function normaliseSelector(sel: string): string {
	return sel
		.replace(/\[\s*([\w-]+)\s*([~|^$*]?=)\s*'([^']*)'\s*\]/g, '[$1$2"$3"]')
		.replace(/\[\s*([\w-]+)\s*([~|^$*]?=)\s*"([^"]*)"\s*\]/g, '[$1$2"$3"]')
		.replace(/\[\s*([\w-]+)\s*([~|^$*]?=)\s*([\w-]+)\s*\]/g, '[$1$2"$3"]')
		.replace(/\[\s*([\w-]+)\s*\]/g, '[$1]');
}

/** Does any selector style this entry? A value entry needs its exact
 *  attribute-value selector; a presence entry is met by the bare attribute or
 *  by any value of it. */
function styles(selectors: readonly string[], entry: VocabularyEntry): boolean {
	if (entry.value !== null) return selectors.some((s) => s.includes(entry.selector));
	return selectors.some(
		(s) => s.includes(`[${entry.attribute}]`) || s.includes(`[${entry.attribute}=`),
	);
}

/**
 * ADR-043 decision 5 — for every vocabulary value, whether the theme styles
 * it, leaves it to the base stylesheet, or neither does. Pure: the caller
 * reads the CSS. Leaving a value to the base stylesheet is a legitimate answer
 * (`base`); `none` is a value nothing styles.
 */
export function vocabularyCoverage(
	entries: readonly VocabularyEntry[],
	themeCss: readonly string[],
	baseCss: readonly string[] = [],
): VocabularyCoverageRow[] {
	const theme = themeCss.flatMap(cssSelectors);
	const base = baseCss.flatMap(cssSelectors);
	return entries.map((entry) => ({
		...entry,
		coverage: styles(theme, entry) ? 'theme' : styles(base, entry) ? 'base' : 'none',
	}));
}
