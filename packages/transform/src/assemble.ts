import type { ThemeConfig, RuneConfig } from './types.js';
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
		config = mergeThemeConfig(config, pluginOverrides);
	}

	if (themeOverrides) {
		config = mergeThemeConfig(config, themeOverrides);
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

	return { config, provenance: fullProvenance };
}
