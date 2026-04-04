import type { ThemeManifest } from '@refrakt-md/types';
import type { LayoutConfig } from '@refrakt-md/transform';

/**
 * Theme definition for the Eleventy adapter.
 *
 * Like HtmlTheme/AstroTheme, no component registry — all runes render
 * through the identity transform and renderToHtml().
 */
export interface EleventyTheme {
	manifest: ThemeManifest;
	layouts: Record<string, LayoutConfig>;
}

/** Options for the refrakt Eleventy plugin */
export interface RefraktEleventyOptions {
	/** Path to refrakt.config.json (default: './refrakt.config.json') */
	configPath?: string;
	/** CSS files to passthrough copy (resolved from theme) */
	cssFiles?: string[];
	/** Path prefix for copied CSS (default: '/css') */
	cssPrefix?: string;
}
