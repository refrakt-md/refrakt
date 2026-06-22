import type { RendererNode } from '@refrakt-md/types';
import type { LayoutConfig, LayoutPageData } from '@refrakt-md/transform';
import { layoutTransform, renderToHtml, matchRouteRule, withoutSearchLayout } from '@refrakt-md/transform';
import type { HtmlTheme } from './theme.js';
import { applyHtmlTransforms } from './tree-transforms.js';

export interface RenderPageInput {
	theme: HtmlTheme;
	page: LayoutPageData;
	/** Whether to render the site-wide search UI (header button + Cmd/Ctrl+K
	 *  dialog). Defaults to `true`. Pass `false` — sourced from
	 *  `SiteConfig.search` — to strip the search chrome from this page. */
	search?: boolean;
}

/**
 * Render a page's content to an HTML string.
 *
 * Applies the layout transform, HTML-specific tree transforms (table wrapping),
 * and produces the final HTML string. Does NOT include the `<!DOCTYPE>` shell —
 * use `renderFullPage` for that.
 */
export function renderPage(input: RenderPageInput): string {
	const { theme, page, search } = input;

	// Resolve layout from route rules
	const layoutName = matchRouteRule(page.url, theme.manifest.routeRules ?? []);
	let layoutConfig = theme.layouts[layoutName] ?? theme.layouts['default'];

	if (!layoutConfig) {
		// No layout config — render the bare renderable
		const transformed = applyHtmlTransforms(page.renderable) as RendererNode;
		return renderToHtml(transformed);
	}

	if (search === false) {
		layoutConfig = withoutSearchLayout(layoutConfig);
	}

	// Apply layout transform → tree transforms → HTML
	const tree = layoutTransform(layoutConfig, page, 'rf');
	const transformed = applyHtmlTransforms(tree) as RendererNode;
	return renderToHtml(transformed);
}
