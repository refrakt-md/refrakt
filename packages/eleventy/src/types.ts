import type { AdapterTheme } from '@refrakt-md/transform';

/**
 * Theme definition for the Eleventy adapter.
 *
 * Alias for the shared `AdapterTheme` — all non-Svelte adapters
 * use the same shape (manifest + layouts).
 */
export type EleventyTheme = AdapterTheme;

/** Options for the refrakt Eleventy plugin */
export interface RefraktEleventyOptions {
	/** Path to refrakt.config.json (default: './refrakt.config.json') */
	configPath?: string;
	/** CSS files to passthrough copy (resolved from theme) */
	cssFiles?: string[];
	/** Path prefix for copied CSS (default: '/css') */
	cssPrefix?: string;
	/** Path to the behaviors JS bundle for passthrough copy */
	behaviorFile?: string;
	/** Path prefix for copied JS (default: '/js') */
	jsPrefix?: string;
}
