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
 */
export function RefraktContent({ theme, page, className }: RefraktContentProps) {
	const html = renderPage({ theme, page });
	return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
