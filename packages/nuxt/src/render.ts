import type { RendererNode } from '@refrakt-md/types';
import type { LayoutPageData } from '@refrakt-md/transform';
import { layoutTransform, renderToHtml, matchRouteRule } from '@refrakt-md/transform';
import type { NuxtTheme } from './types.js';

export interface RenderPageInput {
	theme: NuxtTheme;
	page: LayoutPageData;
}

/**
 * Render a page's content to an HTML string.
 *
 * Applies the layout transform using the theme's route rules to select the
 * appropriate layout, then produces an HTML string via `renderToHtml`.
 */
export function renderPage(input: RenderPageInput): string {
	const { theme, page } = input;
	const layoutName = matchRouteRule(page.url, theme.manifest.routeRules ?? []);
	const layoutConfig = theme.layouts[layoutName] ?? theme.layouts['default'];

	if (!layoutConfig) {
		return renderToHtml(page.renderable as RendererNode);
	}

	const tree = layoutTransform(layoutConfig, page, 'rf');
	return renderToHtml(tree);
}
