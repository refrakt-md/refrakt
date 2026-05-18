import type { ThemeConfig, RuneConfig, StructureEntry, TintDefinition, TintTokens, BgPresetDefinition } from './types.js';

export interface ThemeConfigOverrides {
	prefix?: string;
	tokenPrefix?: string;
	icons?: Record<string, Record<string, string>>;
	runes?: Record<string, Partial<RuneConfig>>;
	tints?: Record<string, TintDefinition>;
	backgrounds?: Record<string, BgPresetDefinition>;
}

/** Deep-merge a base theme config with theme-specific overrides.
 *  Icons are merged by group, rune entries are shallow-merged per rune.
 *  Tints are merged shallow per name, then have `extends` chains resolved
 *  so each tint in the final config is fully expanded. */
export function mergeThemeConfig(base: ThemeConfig, overrides: ThemeConfigOverrides): ThemeConfig {
	const mergedRunes = { ...base.runes };
	if (overrides.runes) {
		for (const [key, value] of Object.entries(overrides.runes)) {
			mergedRunes[key] = { ...mergedRunes[key], ...value } as RuneConfig;
		}
	}

	const mergedTints = { ...base.tints, ...overrides.tints };
	const resolvedTints = mergedTints
		? resolveTintExtends(mergedTints)
		: mergedTints;

	return {
		prefix: overrides.prefix ?? base.prefix,
		tokenPrefix: overrides.tokenPrefix ?? base.tokenPrefix,
		icons: { ...base.icons, ...overrides.icons },
		runes: mergedRunes,
		tints: resolvedTints,
		backgrounds: { ...base.backgrounds, ...overrides.backgrounds },
	};
}

/**
 * Resolve `extends` chains across a tint definition map. Each tint that
 * declares `extends: <name>` has its base fully expanded (recursively) and
 * its own `light` / `dark` / `lockMode` layered on top per leaf. The
 * resolved map has no `extends` references — every tint is self-contained.
 *
 * Throws if a tint extends a name that doesn't exist in the map, or if
 * the extends chain contains a cycle.
 */
export function resolveTintExtends(
	tints: Record<string, TintDefinition>,
): Record<string, TintDefinition> {
	const resolved: Record<string, TintDefinition> = {};

	function resolve(name: string, visiting: Set<string>): TintDefinition {
		if (resolved[name]) return resolved[name];

		const tint = tints[name];
		if (!tint) {
			throw new Error(`Tint '${name}' extends unknown tint`);
		}

		if (!tint.extends) {
			const out: TintDefinition = { ...tint };
			delete out.extends;
			resolved[name] = out;
			return out;
		}

		if (visiting.has(name)) {
			const chain = [...visiting, name].join(' → ');
			throw new Error(`Circular tint extends chain: ${chain}`);
		}

		visiting.add(name);
		const base = resolve(tint.extends, visiting);
		visiting.delete(name);

		const out: TintDefinition = {
			lockMode: tint.lockMode ?? base.lockMode,
			light: mergeTintTokens(base.light, tint.light),
			dark: mergeTintTokens(base.dark, tint.dark),
		};
		resolved[name] = out;
		return out;
	}

	for (const name of Object.keys(tints)) {
		resolve(name, new Set());
	}

	return resolved;
}

function mergeTintTokens(
	base: TintTokens | undefined,
	override: TintTokens | undefined,
): TintTokens | undefined {
	if (!base && !override) return undefined;
	return { ...base, ...override };
}

/** Extension data for a single rune from a plugin */
export interface RuneConfigExtension {
	/** Additional modifier definitions to merge */
	modifiers?: Record<string, { source: 'meta' | 'attribute'; default?: string }>;
	/** Additional structural elements to inject */
	structure?: Record<string, StructureEntry>;
}

/**
 * Apply plugin extensions to core rune configs.
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
