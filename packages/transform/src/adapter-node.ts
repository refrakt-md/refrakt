import type { RefraktConfig } from '@refrakt-md/types';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
	normalizeRefraktConfig,
	type NormalizedRefraktConfig,
} from './config-normalize.js';

export {
	normalizeRefraktConfig,
	resolveSite,
	resolvePlanConfig,
	DEFAULT_SITE_NAME,
} from './config-normalize.js';
export type { NormalizedRefraktConfig, NormalizeOptions } from './config-normalize.js';

// Token preset loader (SPEC-048) — Node-only because it uses dynamic import
// and require.resolve to find packaged preset modules.
export { loadPreset, loadPresets } from './preset-loader.js';

// Site-level token-overrides CSS composer (SPEC-048 + SPEC-056) — Node-only
// because it transitively uses `loadPresets`. Adapters call this to produce
// the per-site CSS that layers on top of the theme package's barrel.
export { composeSiteTokensCss } from './site-tokens.js';

// Vite plugin wrappers for the per-site CSS modules — shared by the Astro
// and Nuxt adapters so they emit byte-identical `virtual:refrakt/site-tokens.css`
// and `virtual:refrakt/runes.css` modules. SvelteKit uses its own virtual-module
// path under `packages/sveltekit/src/virtual-modules.ts`.
export {
	createSiteTokensVitePlugin,
	createRunesCssVitePlugin,
	SITE_TOKENS_VIRTUAL_ID,
	RUNES_VIRTUAL_ID,
} from './site-tokens-vite.js';
export type { MinimalVitePlugin } from './site-tokens-vite.js';

// Tree-shaken per-rune CSS — used by every adapter to ship only the rune
// blocks actually present in the page corpus.
export { computeUsedCssBlocks, buildUsedCssImports } from './used-css.js';

/**
 * Load and normalize a refrakt.config.json file.
 *
 * Returns the normalized config. Paths in nested-shape (`site` / `sites`)
 * inputs are absolutized against the config file's directory so adapters see
 * file-relative semantics. Flat-shape paths are left as-is for legacy
 * cwd-relative resolution.
 *
 * Node.js only — not safe for browser bundles.
 */
export function loadRefraktConfig(
	configPath: string,
	options: { suppressFlatShapeWarning?: boolean } = {},
): NormalizedRefraktConfig {
	const absPath = resolve(configPath);
	if (!existsSync(absPath)) {
		throw new Error(
			`refrakt.config.json not found at ${absPath}. ` +
				`Create one or pass --config to specify the path.`,
		);
	}
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(absPath, 'utf-8'));
	} catch (err) {
		throw new Error(`Failed to parse refrakt.config.json at ${absPath}: ${(err as Error).message}`);
	}
	return normalizeRefraktConfig(raw, {
		configDir: dirname(absPath),
		suppressFlatShapeWarning: options.suppressFlatShapeWarning,
	});
}

/**
 * Load a refrakt.config.json file and return both the raw input and the
 * normalized form. Useful for tools (like the migration command) that need to
 * preserve the original shape on disk while still consulting the normalized
 * fields for logic.
 */
export function loadRefraktConfigWithRaw(
	configPath: string,
	options: { suppressFlatShapeWarning?: boolean } = {},
): {
	raw: RefraktConfig;
	normalized: NormalizedRefraktConfig;
	configDir: string;
} {
	const absPath = resolve(configPath);
	if (!existsSync(absPath)) {
		throw new Error(
			`refrakt.config.json not found at ${absPath}. ` +
				`Create one or pass --config to specify the path.`,
		);
	}
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(absPath, 'utf-8'));
	} catch (err) {
		throw new Error(`Failed to parse refrakt.config.json at ${absPath}: ${(err as Error).message}`);
	}
	const configDir = dirname(absPath);
	return {
		raw: raw as RefraktConfig,
		normalized: normalizeRefraktConfig(raw, {
			configDir,
			suppressFlatShapeWarning: options.suppressFlatShapeWarning,
		}),
		configDir,
	};
}
