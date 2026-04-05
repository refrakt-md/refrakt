import type { AdapterTheme } from '@refrakt-md/transform';

/**
 * Theme definition for the Astro adapter.
 *
 * Alias for the shared `AdapterTheme` — all non-Svelte adapters
 * use the same shape (manifest + layouts).
 */
export type AstroTheme = AdapterTheme;

/** Options for the refrakt Astro integration */
export interface RefraktAstroOptions {
	/** Path to refrakt.config.json (default: './refrakt.config.json') */
	configPath?: string;
}
