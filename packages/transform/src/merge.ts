import type { ThemeConfig, RuneConfig, StructureEntry, TintDefinition, TintTokens, BgPresetDefinition } from './types.js';
import type { ThemeTokensConfig } from '@refrakt-md/types';

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
 * Per SPEC-056, `extends` may also reference a preset module path. When the
 * caller supplies a `presetMap` and the extends value matches a key in it,
 * the preset's chrome-accent tokens (color.bg / surface / text / muted /
 * primary / border) are projected into {@link TintTokens} shape and used
 * as the base. The preset's other scope-eligible namespaces (`syntax.*`,
 * `color.code.*`) are intentionally NOT projected by this function — they
 * land in static CSS via {@link generateScopedTintStylesheet} instead,
 * because they don't fit the 6-token `TintTokens` shape.
 *
 * Throws if a tint extends a name that doesn't exist in either map, or if
 * the extends chain contains a cycle. A preset path takes precedence over
 * a tint name if both resolve.
 */
export function resolveTintExtends(
	tints: Record<string, TintDefinition>,
	presetMap?: Record<string, ThemeTokensConfig>,
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

		// Preset-path extends — SPEC-056. Preset paths take precedence over
		// tint names if both resolve.
		if (presetMap && presetMap[tint.extends]) {
			const preset = presetMap[tint.extends];
			const presetAccents = extractChromeAccents(preset);
			const out: TintDefinition = {
				lockMode: tint.lockMode ?? presetAccents.lockMode,
				light: mergeTintTokens(presetAccents.light, tint.light),
				dark: mergeTintTokens(presetAccents.dark, tint.dark),
			};
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

/**
 * Project a {@link ThemeTokensConfig} preset into the chrome-accent
 * {@link TintTokens} shape — the 6 tokens tint already understands.
 *
 * Per SPEC-056's scope-eligibility filter, only `color.bg`, `color.surface`
 * (the `.base` slot), `color.text`, `color.muted`, `color.primary`, and
 * `color.border` map into the tint accent vocabulary. The preset's
 * `modes.dark` overlay (if present) populates `dark`. Presets that don't
 * set chrome accents return empty objects — most syntax-only presets
 * (niwaki) and integrated palettes that don't claim chrome (Nord) end
 * up here.
 */
function extractChromeAccents(preset: ThemeTokensConfig): {
	light?: TintTokens;
	dark?: TintTokens;
	lockMode?: 'light' | 'dark';
} {
	const light = projectColorAccents(preset.color);
	const darkOverlay = preset.modes?.dark?.color;
	const dark = darkOverlay ? projectColorAccents(darkOverlay) : undefined;
	return {
		light: Object.keys(light ?? {}).length > 0 ? light : undefined,
		dark: dark && Object.keys(dark).length > 0 ? dark : undefined,
	};
}

function projectColorAccents(color: ThemeTokensConfig['color']): TintTokens | undefined {
	if (!color) return undefined;
	const out: TintTokens = {};
	if (typeof color.bg === 'string') out.bg = color.bg;
	if (color.surface && typeof (color.surface as { base?: string }).base === 'string') {
		out.surface = (color.surface as { base: string }).base;
	}
	if (typeof color.text === 'string') out.text = color.text;
	if (typeof color.muted === 'string') out.muted = color.muted;
	if (typeof color.primary === 'string') out.primary = color.primary;
	if (typeof color.border === 'string') out.border = color.border;
	return Object.keys(out).length > 0 ? out : undefined;
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
