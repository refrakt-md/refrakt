import type { ThemeConfig, RuneConfig } from '@refrakt-md/transform';

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
