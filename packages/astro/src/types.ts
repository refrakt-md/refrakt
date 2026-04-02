import type { ThemeManifest } from '@refrakt-md/types';
import type { LayoutConfig } from '@refrakt-md/transform';

/**
 * Theme definition for the Astro adapter.
 *
 * Like HtmlTheme, this has no component registry — all runes render through
 * the identity transform and `renderToHtml()`. Behaviors are handled
 * client-side by `@refrakt-md/behaviors`.
 */
export interface AstroTheme {
	manifest: ThemeManifest;
	layouts: Record<string, LayoutConfig>;
}

/** Options for the refrakt Astro integration */
export interface RefraktAstroOptions {
	/** Path to refrakt.config.json (default: './refrakt.config.json') */
	configPath?: string;
}
