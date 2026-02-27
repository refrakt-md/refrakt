import type { ThemeManifest } from '@refrakt-md/types';
import type { LayoutConfig } from '@refrakt-md/transform';

/**
 * A resolved Astro theme: the manifest plus layout configs.
 *
 * Unlike SvelteTheme, there's no component registry or element overrides.
 * All runes render through the identity transform → renderToHtml() pipeline.
 * Interactive features use @refrakt-md/behaviors web components.
 */
export interface AstroTheme {
	manifest: ThemeManifest;
	/** Layout name → declarative LayoutConfig */
	layouts: Record<string, LayoutConfig>;
}

/** Options passed to the refrakt() integration factory */
export interface AstroPluginOptions {
	/** Path to refrakt.config.json (default: './refrakt.config.json') */
	configPath?: string;
	/** Additional packages to add to ssr.noExternal */
	noExternal?: string[];
}
