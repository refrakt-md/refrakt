import type { ThemeConfig, RuneConfig } from './types.js';
import type { ThemeTokensConfig } from '@refrakt-md/types';
import type { RuneProvenance } from './provenance.js';
import { mergeThemeConfig, applyRuneExtensions } from './merge.js';
import type { ThemeConfigOverrides, RuneConfigExtension } from './merge.js';

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
	let stampedAny = false;
	const runesWithScope: Record<string, RuneConfig> = {};
	for (const [typeofName, runeConfig] of Object.entries(config.runes)) {
		const pluginName = fullProvenance[typeofName]?.pluginName;
		if (pluginName && !runeConfig.scope) {
			runesWithScope[typeofName] = { ...runeConfig, scope: pluginName };
			stampedAny = true;
		} else {
			runesWithScope[typeofName] = runeConfig;
		}
	}
	if (stampedAny) config = { ...config, runes: runesWithScope };

	return { config, provenance: fullProvenance };
}
