import type { AdapterTheme } from '@refrakt-md/transform';

/**
 * Theme definition for the Nuxt adapter.
 *
 * Alias for the shared `AdapterTheme` — all non-Svelte adapters
 * use the same shape (manifest + layouts).
 */
export type NuxtTheme = AdapterTheme;

export interface RefraktNuxtOptions {
	configPath?: string;
}
