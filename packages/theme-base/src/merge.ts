import type { ThemeConfig, RuneConfig, StructureEntry } from '@refrakt-md/transform';

export interface ThemeConfigOverrides {
	prefix?: string;
	tokenPrefix?: string;
	icons?: Record<string, Record<string, string>>;
	runes?: Record<string, Partial<RuneConfig>>;
}

/** Deep-merge a base theme config with theme-specific overrides.
 *  Icons are merged by group, rune entries are shallow-merged per rune. */
export function mergeThemeConfig(base: ThemeConfig, overrides: ThemeConfigOverrides): ThemeConfig {
	const mergedRunes = { ...base.runes };
	if (overrides.runes) {
		for (const [key, value] of Object.entries(overrides.runes)) {
			mergedRunes[key] = { ...mergedRunes[key], ...value } as RuneConfig;
		}
	}
	return {
		prefix: overrides.prefix ?? base.prefix,
		tokenPrefix: overrides.tokenPrefix ?? base.tokenPrefix,
		icons: { ...base.icons, ...overrides.icons },
		runes: mergedRunes,
	};
}

/** Extension data for a single rune from a community package */
export interface RuneConfigExtension {
	/** Additional modifier definitions to merge */
	modifiers?: Record<string, { source: 'meta' | 'attribute'; default?: string }>;
	/** Additional structural elements to inject */
	structure?: Record<string, StructureEntry>;
}

/**
 * Apply community package extensions to core rune configs.
 *
 * Extensions are additive — community modifiers and structure entries are
 * appended to existing config, never replacing core definitions.
 *
 * @param config - The base theme config to extend
 * @param extensions - Map of typeof name → extension config
 * @returns A new ThemeConfig with extensions applied
 */
export function applyRuneExtensions(
	config: ThemeConfig,
	extensions: Record<string, RuneConfigExtension>,
): ThemeConfig {
	const mergedRunes = { ...config.runes };

	for (const [typeofName, ext] of Object.entries(extensions)) {
		const existing = mergedRunes[typeofName];
		if (!existing) continue; // Skip extensions for runes not in config

		const merged: RuneConfig = { ...existing };

		// Append additional modifiers
		if (ext.modifiers) {
			merged.modifiers = { ...existing.modifiers, ...ext.modifiers };
		}

		// Append additional structure entries
		if (ext.structure) {
			merged.structure = { ...existing.structure, ...ext.structure };
		}

		mergedRunes[typeofName] = merged;
	}

	return {
		...config,
		runes: mergedRunes,
	};
}
