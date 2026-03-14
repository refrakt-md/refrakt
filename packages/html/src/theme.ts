import type { ThemeManifest } from '@refrakt-md/types';
import type { LayoutConfig } from '@refrakt-md/transform';

/**
 * Theme definition for the pure HTML adapter.
 *
 * Unlike SvelteTheme, this has no component registry or element overrides —
 * all runes render through the identity transform and behaviors are handled
 * client-side by @refrakt-md/behaviors.
 */
export interface HtmlTheme {
	manifest: ThemeManifest;
	layouts: Record<string, LayoutConfig>;
}
