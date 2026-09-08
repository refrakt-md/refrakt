import type { ThemeConfig, RuneConfig, StructureEntry, TintDefinition, TintTokens, BgPresetDefinition, FramePresetDefinition, BlockDef } from './types.js';
import type { ThemeTokensConfig } from '@refrakt-md/types';
import { IDENTITY_FIELDS, findReservedFields, identityFieldMessage } from './identity-fields.js';

/** A theme override that tried to redefine a rune (ADR-028). Reported, and the
 *  offending field is dropped — the rune's own declaration wins. */
export interface IdentityViolation {
	/** Config path, e.g. `runes.Card.sections`. */
	path: string;
	/** The rune's `theme.runes` key, e.g. `Card`. */
	rune: string;
	/** The identity field the override carried. */
	field: string;
	message: string;
}

export interface RuneConfigMergeOptions {
	/** Enforce ADR-028 on this merge: identity fields present in the override
	 *  are reported and dropped instead of shadowing the base. Off by default —
	 *  the engine's transform-time variant application (`engine.ts`) and the
	 *  contract generator merge deltas that `validateThemeConfig` has already
	 *  vetted, and neither is a place to emit config diagnostics. */
	guardIdentity?: boolean;
	/** Rune key, for the reported path. */
	runeName?: string;
	/** Violation sink. Defaults to a one-time `console.warn` per path. */
	onViolation?: (violation: IdentityViolation) => void;
}

/** Paths already warned about, so a dev-server re-assembly doesn't re-spam. */
const warnedIdentityPaths = new Set<string>();

function defaultIdentityViolationReporter(violation: IdentityViolation): void {
	if (warnedIdentityPaths.has(violation.path)) return;
	warnedIdentityPaths.add(violation.path);
	// eslint-disable-next-line no-console
	console.warn(`[refrakt] ${violation.message}`);
}

export interface ThemeConfigOverrides {
	prefix?: string;
	tokenPrefix?: string;
	icons?: Record<string, Record<string, string>>;
	runes?: Record<string, Partial<RuneConfig>>;
	tints?: Record<string, TintDefinition>;
	backgrounds?: Record<string, BgPresetDefinition>;
	frames?: Record<string, FramePresetDefinition>;
}

/** Deep-merge a base theme config with theme-specific overrides.
 *  Icons are merged by group, rune entries are shallow-merged per rune.
 *  Tints are merged shallow per name, then have `extends` chains resolved
 *  so each tint in the final config is fully expanded.
 *
 *  `presetMap` is forwarded to {@link resolveTintExtends} so that tints
 *  whose `extends` points at a preset module path (SPEC-056) get their
 *  chrome accents projected into {@link TintTokens} shape — the engine
 *  picks those up and emits inline `--tint-*` styles, which is what the
 *  `tint-mode` override mechanism in `tint.css` relies on. Without a
 *  `presetMap` the preset branch in `resolveTintExtends` is skipped, and
 *  preset-projected tints fall back to the chrome-accent CSS emitted by
 *  `generateScopedTintStylesheet` alone — sufficient for the page-mode
 *  case, insufficient for forced `tint-mode`. */
export function mergeThemeConfig(
	base: ThemeConfig,
	overrides: ThemeConfigOverrides,
	presetMap?: Record<string, ThemeTokensConfig>,
	onIdentityViolation?: (violation: IdentityViolation) => void,
): ThemeConfig {
	const mergedRunes = { ...base.runes };
	if (overrides.runes) {
		for (const [key, value] of Object.entries(overrides.runes)) {
			// ADR-028 — this is the theme-override path, so identity is guarded.
			// A key with no base entry is a *new* rune (a plugin contributing its
			// own), not an override: `mergeRuneConfig` short-circuits there and
			// the guard never applies, which is why plugins declaring `sections`
			// on their own runes are unaffected.
			mergedRunes[key] = mergeRuneConfig(mergedRunes[key], value, {
				guardIdentity: true,
				runeName: key,
				onViolation: onIdentityViolation,
			});
		}
	}

	const mergedTints = { ...base.tints, ...overrides.tints };
	const resolvedTints = mergedTints
		? resolveTintExtends(mergedTints, presetMap)
		: mergedTints;

	return {
		prefix: overrides.prefix ?? base.prefix,
		tokenPrefix: overrides.tokenPrefix ?? base.tokenPrefix,
		icons: { ...base.icons, ...overrides.icons },
		runes: mergedRunes,
		tints: resolvedTints,
		backgrounds: { ...base.backgrounds, ...overrides.backgrounds },
		frames: { ...base.frames, ...overrides.frames },
	};
}

/**
 * Per-rune config merge with SPEC-080 awareness.
 *
 * Most fields shallow-merge (override replaces base). The block-model
 * fields `metaFields`, `blocks`, and `layout` merge by inner key so a
 * theme can override a single field, block, or container's order without
 * restating the full plugin map.
 *
 * With `guardIdentity`, the ADR-028 identity fields (`block`, `modifiers`,
 * `sections`) are stripped from the override before merging: a theme may not
 * redefine what a rune *is*, only how it looks. `variants` is deliberately not
 * guarded here — SPEC-091 lets a theme add axes and override value deltas, and
 * the by-axis merge below exists for exactly that.
 */
export function mergeRuneConfig(
	base: RuneConfig | undefined,
	override: Partial<RuneConfig>,
	options: RuneConfigMergeOptions = {},
): RuneConfig {
	// No base means this key introduces a rune rather than overriding one —
	// there is no identity to protect, and the declaration is the rune's own.
	if (!base) return override as RuneConfig;

	const effectiveOverride = options.guardIdentity
		? stripIdentityFields(override, options)
		: override;

	const merged: RuneConfig = { ...base, ...effectiveOverride };

	if (base.metaFields || override.metaFields) {
		merged.metaFields = { ...base.metaFields, ...override.metaFields };
	}

	if (base.blocks || override.blocks) {
		const blocks: Record<string, BlockDef> = { ...base.blocks };
		if (override.blocks) {
			for (const [name, def] of Object.entries(override.blocks)) {
				blocks[name] = def;
			}
		}
		merged.blocks = blocks;
	}

	if (base.layout || override.layout) {
		merged.layout = { ...base.layout, ...override.layout };
	}

	// SPEC-091 — variants merge by axis, then by value. A theme adds new axes
	// or overrides individual axis/value deltas without restating the rune's
	// full variant map. (The engine reuses this same merge to apply a selected
	// delta over base at transform time.)
	if (base.variants || override.variants) {
		const variants: Record<string, Record<string, Partial<RuneConfig>>> = { ...base.variants };
		if (override.variants) {
			for (const [axis, byValue] of Object.entries(override.variants)) {
				variants[axis] = { ...variants[axis], ...byValue };
			}
		}
		merged.variants = variants;
	}

	return merged;
}

/** Drop the ADR-028 identity fields from a theme override, reporting each one.
 *  Returns the input untouched when it carries none — the overwhelmingly
 *  common case, and the one that must stay allocation-free. */
function stripIdentityFields(
	override: Partial<RuneConfig>,
	options: RuneConfigMergeOptions,
): Partial<RuneConfig> {
	const violations = findReservedFields(override, IDENTITY_FIELDS);
	if (violations.length === 0) return override;

	const rune = options.runeName ?? '<rune>';
	const report = options.onViolation ?? defaultIdentityViolationReporter;
	const cleaned: Partial<RuneConfig> = { ...override };

	for (const field of violations) {
		delete cleaned[field as keyof RuneConfig];
		const path = `runes.${rune}.${field}`;
		report({
			path,
			rune,
			field,
			message: `${path}: theme overrides ${identityFieldMessage(field)}. The override is ignored; the rune's own declaration stands.`,
		});
	}

	return cleaned;
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
