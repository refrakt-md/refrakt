/**
 * Locale-aware string resolution (SPEC-035) — the P0 foundation every other
 * i18n zone builds on.
 *
 * The design goals encoded here:
 *
 * - **Zero-config English.** With no `locale` / `strings` configured, resolution
 *   always returns the call-site English `fallback`, so transform output is
 *   byte-identical to a pre-i18n build.
 * - **Render-scoped context, never module-global state.** The active locale and
 *   merged dictionary live in a {@link LocaleContext} slice threaded through
 *   consumers (Decision D6). This is the load-bearing forward-compatibility
 *   constraint for a future multi-locale build (SPEC-035 "Forward Compatibility"):
 *   nothing here reads or writes a process-level "current locale".
 * - **Per-key first-match fallback** (Decision D5): a scalar lookup, not a deep
 *   merge. A missing key degrades to English *per key*, so partial bundles are safe.
 *
 * Named `resolveLocaleString` (not `resolveString`) to avoid colliding with the
 * unrelated `resolveString()` in `packages/runes/src/data-pipeline.ts`, which
 * interpolates `{{ }}` template variables against data-pipeline sources.
 */

/** CLDR plural categories, as returned by `Intl.PluralRules`. */
export type PluralMap = Partial<Record<Intl.LDMLPluralRule, string>>;

/** A dictionary value: a literal string, or a per-category map for plurals
 *  (Decision D2). The resolver dispatches on the value's shape, so a key can
 *  later become a plural map (or, hypothetically, an ICU string) without a
 *  format-wide migration. */
export type LocalizedValue = string | PluralMap;

/**
 * The render-scoped locale slice threaded into engine label renderers, computed
 * transforms, layout builders, and `postTransform` hooks (Decision D6).
 *
 * Deliberately narrow — `{ locale, strings }`, not the full `ThemeConfig` —
 * matching the engine's convention of passing explicit slices (`icons`,
 * `modifierValues`). It must be constructed once per render and passed by value;
 * it must **never** be stored in module-global mutable state.
 */
export interface LocaleContext {
	/** BCP 47 locale identifier. Defaults to `'en'`. */
	locale: string;
	/** The merged, locale-selected dictionary. Missing keys fall back to the
	 *  English literal supplied at the call site. */
	strings: Record<string, LocalizedValue>;
}

/** The default locale used when a site configures none. */
export const DEFAULT_LOCALE = 'en';

/**
 * A zero-config English context — no configured strings, default locale.
 * Consumers that have not yet been threaded a real context can use this to keep
 * resolution calls uniform; it always returns the English `fallback`.
 */
export const EN_LOCALE_CONTEXT: LocaleContext = { locale: DEFAULT_LOCALE, strings: {} };

/**
 * Normalise an arbitrary configured locale value into a usable BCP 47 tag,
 * falling back to {@link DEFAULT_LOCALE}. Whitespace-only / non-string inputs
 * resolve to English rather than producing a bogus `<html lang>`.
 */
export function normalizeLocale(locale: unknown): string {
	return typeof locale === 'string' && locale.trim() !== '' ? locale.trim() : DEFAULT_LOCALE;
}

/**
 * Build a {@link LocaleContext} from a resolved locale + merged dictionary. A
 * thin convenience so call sites don't hand-assemble the slice (and so the
 * locale is normalised consistently).
 */
export function createLocaleContext(
	locale: unknown,
	strings: Record<string, LocalizedValue> = {},
): LocaleContext {
	return { locale: normalizeLocale(locale), strings };
}

/**
 * Progressive BCP 47 subtag stripping: `de-AT-1996` → `de-AT` → `de` → (drop).
 * Returns the candidate tags most-specific first, **not** including the final
 * empty drop — the caller's English literal is the universal floor below these.
 *
 * Used by the per-key fallback (Decision D5) and by bundle selection in
 * `mergePlugins()` so a `de-AT` site still resolves a plugin's `de` bundle.
 */
export function localeFallbackChain(locale: string): string[] {
	const normalized = normalizeLocale(locale);
	const parts = normalized.split('-');
	const chain: string[] = [];
	for (let i = parts.length; i > 0; i--) {
		chain.push(parts.slice(0, i).join('-'));
	}
	return chain;
}

/**
 * Interpolate the `{n}` placeholder with the given count. Kept separate so both
 * the scalar and plural resolvers share identical interpolation semantics.
 */
function interpolateCount(template: string, count: number): string {
	return template.replace(/\{n\}/g, String(count));
}

/**
 * Resolve a scalar localized string.
 *
 * First-match, per key (Decision D5): if the context's dictionary holds a string
 * value for `key`, it wins; otherwise the English `fallback` is returned. A
 * plural-map value at this key is treated as "no scalar translation" and falls
 * through to `fallback` — callers with counts must use {@link resolvePluralString}.
 */
export function resolveLocaleString(ctx: LocaleContext, key: string, fallback: string): string {
	const value = ctx.strings[key];
	return typeof value === 'string' ? value : fallback;
}

/**
 * Resolve a count-bearing localized string via `Intl.PluralRules` (Decision D2).
 *
 * - A `PluralMap` value selects the category for `count` in the active locale,
 *   falling back to the map's `other` entry, then the English `fallback`.
 * - A plain string value is used directly (a translator who didn't need plural
 *   inflection can supply one form).
 * - A missing key uses `fallback`.
 *
 * `{n}` in the chosen template is replaced with `count` in every branch.
 */
export function resolvePluralString(
	ctx: LocaleContext,
	key: string,
	count: number,
	fallback: string,
): string {
	const value = ctx.strings[key];
	if (value && typeof value === 'object') {
		const category = new Intl.PluralRules(ctx.locale).select(count);
		const template = value[category] ?? value.other ?? fallback;
		return interpolateCount(template, count);
	}
	if (typeof value === 'string') return interpolateCount(value, count);
	return interpolateCount(fallback, count);
}

/**
 * Select the best-matching bundle for a locale from a per-locale bundle map,
 * applying the D5 region-strip fallback (`de-AT` → `de`). Returns an empty
 * object when nothing matches — the English floor lives at the call site, not here.
 *
 * Used to select a plugin's shipped `translations[locale]` and core's own
 * first-party bundle before merging into {@link LocaleContext.strings}.
 */
export function selectLocaleBundle(
	bundles: Record<string, Record<string, LocalizedValue>> | undefined,
	locale: string,
): Record<string, LocalizedValue> {
	if (!bundles) return {};
	for (const candidate of localeFallbackChain(locale)) {
		if (bundles[candidate]) return bundles[candidate];
	}
	return {};
}

/**
 * Merge a list of dictionaries into one, later entries winning per key
 * (first-match precedence is expressed by ordering: pass lowest-precedence
 * first, site overrides last). A scalar per-key overwrite, **not** a deep merge —
 * a site override replaces a plugin default wholesale for that key.
 */
export function mergeLocaleStrings(
	...dictionaries: Array<Record<string, LocalizedValue> | undefined>
): Record<string, LocalizedValue> {
	const merged: Record<string, LocalizedValue> = {};
	for (const dict of dictionaries) {
		if (!dict) continue;
		for (const [key, value] of Object.entries(dict)) {
			merged[key] = value;
		}
	}
	return merged;
}
