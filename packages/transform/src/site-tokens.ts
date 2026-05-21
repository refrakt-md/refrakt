import type { SiteConfig, ThemeTokensConfig } from '@refrakt-md/types';
import {
	mergeThemeTokensConfigs,
	generateThemeStylesheet,
	generateScopedTintStylesheet,
	validateThemeTokensConfig,
	formatTokenValidationErrors,
} from './index.js';
import { loadPresets } from './preset-loader.js';

/**
 * Compose site-level token overrides into a single CSS string.
 *
 * Reads `site.theme.presets`, `site.theme.tokens`, and `site.theme.modes` (the
 * SPEC-048 object form of `SiteConfig.theme`). Returns empty string when the
 * site uses the legacy string-theme form or declares no overrides.
 *
 * Presets are loaded in declared order and merged left-to-right; site-level
 * `tokens` and `modes` layer last. The merged result is validated against the
 * token contract; validation errors throw so misconfigured sites fail at
 * adapter startup rather than producing broken CSS silently.
 *
 * The generated CSS is intended to *layer on top of* the theme package's
 * own CSS — it carries only the override deltas, which cascade through
 * `--rf-*` variables (last-write-wins).
 *
 * Node-only (uses dynamic `import` via `loadPresets` to resolve packaged
 * preset modules); exported through `@refrakt-md/transform/node`.
 */
export async function composeSiteTokensCss(site: SiteConfig, configDir: string): Promise<string> {
	const themeField = site.theme;
	if (typeof themeField === 'string' || !themeField) return '';

	const presetSpecs = themeField.presets ?? [];
	const inlineTokens = (themeField.tokens ?? {}) as ThemeTokensConfig;
	const inlineModes = themeField.modes as Record<string, unknown> | undefined;
	const siteTints = (site.tints ?? {}) as Record<string, { extends?: string }>;

	// Collect preset paths referenced by tint extends, for the scoped tint
	// projection (SPEC-056). A tint that extends a preset that isn't already
	// in `theme.presets` should still be projectable as a scoped tint, so we
	// gather them separately from the active-theme preset list.
	const tintPresetSpecs: string[] = [];
	for (const tint of Object.values(siteTints)) {
		const ext = tint.extends;
		if (typeof ext === 'string' && (ext.startsWith('@') || ext.startsWith('./') || ext.startsWith('../') || ext.startsWith('/'))) {
			if (!tintPresetSpecs.includes(ext) && !presetSpecs.includes(ext)) {
				tintPresetSpecs.push(ext);
			}
		}
	}

	const hasInline =
		Object.keys(inlineTokens).length > 0 || (inlineModes && Object.keys(inlineModes).length > 0);

	// Fast path: no overrides AND no preset-extending tints, no CSS to emit.
	if (presetSpecs.length === 0 && !hasInline && tintPresetSpecs.length === 0) return '';

	// Load active presets (for :root emission) and tint-referenced presets
	// (for scoped emission). Some paths may overlap; that's fine — load once,
	// reuse the config.
	const allPresetSpecs = [...presetSpecs, ...tintPresetSpecs];
	const allPresetConfigs = allPresetSpecs.length > 0
		? await loadPresets(allPresetSpecs, { from: configDir })
		: [];

	// Split back into active (drives :root cascade) vs tint-only (drives
	// scoped CSS only) — preserves the SPEC-056 invariant that a tint can
	// expose a preset without making it the active site theme.
	const activePresetConfigs = allPresetConfigs.slice(0, presetSpecs.length);
	const presetMap: Record<string, ThemeTokensConfig> = {};
	allPresetSpecs.forEach((spec, i) => { presetMap[spec] = allPresetConfigs[i]; });

	const blocks: string[] = [];

	// 1. Active-theme :root + mode CSS (existing behaviour).
	if (presetSpecs.length > 0 || hasInline) {
		const siteLayer: ThemeTokensConfig = { ...inlineTokens };
		if (inlineModes) {
			siteLayer.modes = inlineModes as ThemeTokensConfig['modes'];
		}

		const merged = mergeThemeTokensConfigs(...activePresetConfigs, siteLayer);

		// Validate the merged result; misconfigurations should surface at startup.
		const validation = validateThemeTokensConfig(merged);
		if (!validation.valid) {
			throw new Error(formatTokenValidationErrors(validation));
		}

		blocks.push(generateThemeStylesheet(merged));
	}

	// 2. Scoped tint stylesheet — SPEC-056 preset projections.
	if (Object.keys(siteTints).length > 0 && Object.keys(presetMap).length > 0) {
		const scopedTintCss = generateScopedTintStylesheet(siteTints, presetMap);
		if (scopedTintCss) blocks.push(scopedTintCss);
	}

	return blocks.join('\n');
}
