import type { RendererNode } from '@refrakt-md/types';
import type { LayoutPageData } from '@refrakt-md/transform';
import { layoutTransform, renderToHtml, matchRouteRule } from '@refrakt-md/transform';
import type { NextTheme } from './types.js';

export interface RenderPageInput {
	theme: NextTheme;
	page: LayoutPageData;
}

/**
 * Render a page's content to an HTML string.
 *
 * Resolves the layout from route rules, applies the layout transform,
 * and produces the final HTML string.
 */
export function renderPage(input: RenderPageInput): string {
	const { theme, page } = input;

	// Resolve layout from route rules
	const layoutName = matchRouteRule(page.url, theme.manifest.routeRules ?? []);
	const layoutConfig = theme.layouts[layoutName] ?? theme.layouts['default'];

	if (!layoutConfig) {
		// No layout config — render the bare renderable
		return renderToHtml(page.renderable as RendererNode);
	}

	// Apply layout transform → HTML
	const tree = layoutTransform(layoutConfig, page, 'rf');
	return renderToHtml(tree);
}
