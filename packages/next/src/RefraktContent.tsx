import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderPage } from './render.js';
import type { RenderPageInput } from './render.js';

interface RefraktContentProps extends RenderPageInput {
	className?: string;
}

/**
 * Server Component that renders refrakt content to HTML.
 *
 * Uses renderToHtml() + dangerouslySetInnerHTML for zero-hydration rendering.
 * React never processes the rf-* custom elements as components.
 *
 * For component overrides (ADR-008), use the `Renderer` from `@refrakt-md/react`
 * directly with `page.renderable`.
 */
export function RefraktContent({ theme, page, className }: RefraktContentProps): ReactNode {
	const html = renderPage({ theme, page });
	return createElement('div', { className, dangerouslySetInnerHTML: { __html: html } });
}
