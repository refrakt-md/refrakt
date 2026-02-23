import Markdoc from '@markdoc/markdoc';
import { tags, nodes, serializeTree } from '@refrakt-md/runes';
import { identityTransform } from '@refrakt-md/lumina/transform';
import { createHighlightTransform } from '@refrakt-md/highlight';
import type { RendererNode } from '@refrakt-md/types';

let hlTransform: ((tree: RendererNode) => RendererNode) | null = null;
let hlCss = '';

/**
 * Initialize syntax highlighting. Call once on app startup.
 */
export async function initHighlight(): Promise<void> {
	const hl = await createHighlightTransform();
	hlTransform = hl;
	hlCss = hl.css;
}

/**
 * Run a Markdoc string through the full refrakt.md rendering pipeline.
 */
export function renderMarkdoc(source: string): RendererNode {
	const ast = Markdoc.parse(source);
	const renderable = Markdoc.transform(ast, { tags, nodes, variables: { __source: source } });
	const serialized = serializeTree(renderable) as RendererNode;
	const transformed = identityTransform(serialized);
	return hlTransform ? hlTransform(transformed) : transformed;
}

/**
 * Get the CSS needed for syntax highlight themes.
 */
export function getHighlightCss(): string {
	return hlCss;
}
