import type { ThemeConfig, RuneConfig } from './types.js';
import type { ThemeTokensConfig } from '@refrakt-md/types';
import type { RuneProvenance } from './provenance.js';
import { mergeThemeConfig, applyRuneExtensions } from './merge.js';
import type { ThemeConfigOverrides, RuneConfigExtension } from './merge.js';
import { selectLocaleBundle, mergeLocaleStrings, normalizeLocale, type LocalizedValue } from './i18n.js';

/** Casing-agnostic rune-name key: lowercases and strips non-alphanumerics so
 *  `HowTo`, `how-to`, and `howto` all collapse to one bucket. Bridges the
 *  provenance keys (`Plugin.runes` names, e.g. `howto`) to the PascalCase
 *  `theme.runes` / `config.runes` keys (e.g. `HowTo`). */
const normalizeRuneKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Inputs to the config assembly function */
export interface AssembleInput {
	/** Core (base) theme config — the starting point */
	coreConfig: ThemeConfig;

	/** Theme-level overrides (e.g., Lumina adding icons, prefix changes) */
	themeOverrides?: ThemeConfigOverrides;

	/** Plugin-contributed rune configs (keyed by typeof name) */
	pluginRunes?: Record<string, RuneConfig>;

	/** Plugin-contributed icons */
	pluginIcons?: Record<string, Record<string, string>>;

	/** Plugin-contributed background presets */
	pluginBackgrounds?: Record<string, Record<string, unknown>>;

	/** Plugin-contributed extensions to core rune configs */
	extensions?: Record<string, RuneConfigExtension>;

	/** Source provenance from mergePlugins (pass-through, enriched with core entries) */
	provenance?: Record<string, RuneProvenance>;

	/** Map of preset module specifier → loaded ThemeTokensConfig, for SPEC-056
	 *  preset-path tint resolution. Tints whose `extends` value matches a key
	 *  here have their chrome accents projected into TintTokens shape so the
	 *  engine emits inline `--tint-*` styles at runtime. */
	presetMap?: Record<string, ThemeTokensConfig>;

	/** SPEC-035 — active locale (BCP 47). When set, plugin/core translation
	 *  bundles are selected for it and merged into `config.strings`, and
	 *  `config.locale` is stamped so the engine localizes. */
	locale?: string;

	/** SPEC-035 — per-locale plugin translation bundles (from `mergePlugins`).
	 *  The active locale's dictionary is selected (with `de-AT`→`de` fallback)
	 *  and merged *under* the site's `ThemeConfig.strings` (site wins, Decision D5). */
	pluginTranslations?: Record<string, Record<string, LocalizedValue>>;

	/** SPEC-035 — first-party core translation bundles (from `packages/runes`),
	 *  keyed by locale. Lowest precedence, merged below plugin bundles. */
	coreTranslations?: Record<string, Record<string, LocalizedValue>>;
}

/** Result of theme config assembly */
export interface AssembleResult {
	/** The fully merged ThemeConfig ready for createTransform() */
	config: ThemeConfig;

	/** Complete provenance map (core runes added) */
	provenance: Record<string, RuneProvenance>;
}

/**
 * Assemble a complete ThemeConfig from core + plugins + theme overrides.
 *
 * Merge order (last wins for rune configs):
 *   1. Core config (coreConfig)
 *   2. Plugin-contributed rune configs (pluginRunes)
 *   3. Theme-level overrides (themeOverrides)
 *   4. Plugin extensions (additive — modifiers and structure are appended, not replaced)
 *
 * This is a pure, synchronous function. All async work (plugin loading,
 * module resolution) must happen before calling this.
 */
export function assembleThemeConfig(input: AssembleInput): AssembleResult {
	const {
		coreConfig,
		themeOverrides,
		pluginRunes,
		pluginIcons,
		pluginBackgrounds,
		extensions,
		provenance: inputProvenance = {},
		presetMap,
		locale,
		pluginTranslations,
		coreTranslations,
	} = input;

	let config = coreConfig;

	const hasPluginRunes = pluginRunes && Object.keys(pluginRunes).length > 0;
	const hasPluginIcons = pluginIcons && Object.keys(pluginIcons).length > 0;
	const hasPluginBgs = pluginBackgrounds && Object.keys(pluginBackgrounds).length > 0;

	if (hasPluginRunes || hasPluginIcons || hasPluginBgs) {
		const pluginOverrides: ThemeConfigOverrides = {};
		if (hasPluginRunes) pluginOverrides.runes = pluginRunes;
		if (hasPluginIcons) pluginOverrides.icons = pluginIcons;
		if (hasPluginBgs) pluginOverrides.backgrounds = pluginBackgrounds as Record<string, any>;
		config = mergeThemeConfig(config, pluginOverrides, presetMap);
	}

	if (themeOverrides) {
		config = mergeThemeConfig(config, themeOverrides, presetMap);
	}

	if (extensions && Object.keys(extensions).length > 0) {
		config = applyRuneExtensions(config, extensions);
	}

	const fullProvenance: Record<string, RuneProvenance> = { ...inputProvenance };
	for (const typeofName of Object.keys(config.runes)) {
		if (!fullProvenance[typeofName]) {
			fullProvenance[typeofName] = {
				qualifiedId: `core:${typeofName}`,
				source: 'core',
			};
		}
	}

	// SPEC-035 — stamp each plugin rune's i18n `scope` from its provenance so the
	// engine can derive auto keys `{scope}.{block}.{ref}` without carrying the
	// whole provenance map. Only plugin runes are stamped (with the plugin short
	// name); core and local runes are left untouched — the engine defaults an
	// absent scope to 'core', so their output stays byte-identical.
	//
	// `config.runes` is keyed by PascalCase typeof, but plugin provenance is keyed
	// by the plugin's own rune name (`Plugin.runes` keys, often lower/kebab), so
	// match on a casing-agnostic normalisation of both sides. Built from the
	// *input* provenance (the real plugin entries) rather than `fullProvenance`,
	// whose loop above adds spurious `core:` entries for the same runes that would
	// otherwise clobber the plugin entry in this map.
	const provByNorm = new Map<string, RuneProvenance>();
	for (const [key, entry] of Object.entries(inputProvenance)) {
		provByNorm.set(normalizeRuneKey(key), entry);
	}
	let stampedAny = false;
	const runesWithScope: Record<string, RuneConfig> = {};
	for (const [typeofName, runeConfig] of Object.entries(config.runes)) {
		const pluginName = provByNorm.get(normalizeRuneKey(typeofName))?.pluginName;
		if (pluginName && !runeConfig.scope) {
			runesWithScope[typeofName] = { ...runeConfig, scope: pluginName };
			stampedAny = true;
		} else {
			runesWithScope[typeofName] = runeConfig;
		}
	}
	if (stampedAny) config = { ...config, runes: runesWithScope };

	// SPEC-035 — resolve the locale dictionary. Precedence (Decision D5, per key,
	// lowest → highest): core first-party bundle → plugin bundles → the site's
	// own `ThemeConfig.strings` (always wins). Each bundle is locale-selected with
	// the `de-AT`→`de` region-strip fallback. `config.locale` is stamped so the
	// engine builds its LocaleContext from it.
	if (locale !== undefined) {
		const resolvedLocale = normalizeLocale(locale);
		const coreStrings = selectLocaleBundle(coreTranslations, resolvedLocale);
		const pluginStrings = selectLocaleBundle(pluginTranslations, resolvedLocale);
		const siteStrings = config.strings ?? {};
		config = {
			...config,
			locale: resolvedLocale,
			strings: mergeLocaleStrings(coreStrings, pluginStrings, siteStrings),
		};
	}

	return { config, provenance: fullProvenance };
}
