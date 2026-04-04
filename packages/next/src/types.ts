import type { ThemeManifest } from '@refrakt-md/types';
import type { LayoutConfig } from '@refrakt-md/transform';

/**
 * Theme definition for the Next.js adapter.
 *
 * Like HtmlTheme, this has no component registry — all runes render through
 * the identity transform and behaviors are handled client-side by
 * @refrakt-md/behaviors via the BehaviorInit client component.
 */
export interface NextTheme {
	manifest: ThemeManifest;
	layouts: Record<string, LayoutConfig>;
}
