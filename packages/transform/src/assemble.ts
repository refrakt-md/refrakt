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

	/** Package-contributed rune configs (keyed by typeof name) */
	packageRunes?: Record<string, RuneConfig>;

	/** Package-contributed icons */
	packageIcons?: Record<string, Record<string, string>>;

	/** Package-contributed extensions to core rune configs */
	extensions?: Record<string, RuneConfigExtension>;

	/** Source provenance from mergePackages (pass-through, enriched with core entries) */
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
 * Assemble a complete ThemeConfig from core + packages + theme overrides.
 *
 * Merge order (last wins for rune configs):
 *   1. Core config (coreConfig)
 *   2. Package-contributed rune configs (packageRunes)
 *   3. Theme-level overrides (themeOverrides)
 *   4. Package extensions (additive — modifiers and structure are appended, not replaced)
 *
 * This is a pure, synchronous function. All async work (package loading,
 * module resolution) must happen before calling this.
 */
export function assembleThemeConfig(input: AssembleInput): AssembleResult {
	const {
		coreConfig,
		themeOverrides,
		packageRunes,
		packageIcons,
		extensions,
		provenance: inputProvenance = {},
	} = input;

	// Step 1: Start with core config
	let config = coreConfig;

	// Step 2: Merge package-contributed rune configs and icons
	if (packageRunes && Object.keys(packageRunes).length > 0) {
		const packageOverrides: ThemeConfigOverrides = { runes: packageRunes };
		if (packageIcons && Object.keys(packageIcons).length > 0) {
			packageOverrides.icons = packageIcons;
		}
		config = mergeThemeConfig(config, packageOverrides);
	} else if (packageIcons && Object.keys(packageIcons).length > 0) {
		config = mergeThemeConfig(config, { icons: packageIcons });
	}

	// Step 3: Apply theme overrides (highest non-extension priority)
	if (themeOverrides) {
		config = mergeThemeConfig(config, themeOverrides);
	}

	// Step 4: Apply package extensions (additive — merges modifiers and structure entries)
	if (extensions && Object.keys(extensions).length > 0) {
		config = applyRuneExtensions(config, extensions);
	}

	// Step 5: Build complete provenance (add core runes not already tracked)
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
