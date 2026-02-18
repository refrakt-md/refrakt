import Markdoc from '@markdoc/markdoc';
import { tags, nodes, serializeTree } from '@refrakt-md/runes';
import { identityTransform } from '@refrakt-md/lumina/transform';
import { createHighlightTransform } from '@refrakt-md/highlight';
import type { RendererNode } from '@refrakt-md/types';

let hlTransform: ((tree: RendererNode) => RendererNode) | null = null;
let hlCss = '';

/**
 * Initialize syntax highlighting. Call once on app startup.
 * Loads Shiki WASM — async, but subsequent calls are instant (cached).
 */
export async function initHighlight(): Promise<void> {
	const hl = await createHighlightTransform({
		theme: { light: 'github-light', dark: 'github-dark' },
	});
	hlTransform = hl;
	hlCss = hl.css;
}

/**
 * Run a Markdoc string through the full refrakt.md rendering pipeline.
 * Returns a RendererNode tree ready for Renderer.svelte.
 */
export function renderMarkdoc(source: string): RendererNode {
	// 1. Parse Markdoc → AST
	const ast = Markdoc.parse(source);

	// 2. Transform with rune schemas (reinterpret children, emit typeof markers)
	// Pass __source so sandbox/preview can extract raw HTML via node.lines
	const renderable = Markdoc.transform(ast, { tags, nodes, variables: { __source: source } });

	// 3. Serialize (Markdoc Tag instances → plain JSON objects)
	const serialized = serializeTree(renderable) as RendererNode;

	// 4. Identity transform (BEM classes, structural injection, meta consumption)
	const transformed = identityTransform(serialized);

	// 5. Syntax highlighting (find data-language elements, apply Shiki)
	return hlTransform ? hlTransform(transformed) : transformed;
}

/**
 * Get the CSS needed for syntax highlight themes.
 * Returns empty string if highlight hasn't been initialized.
 */
export function getHighlightCss(): string {
	return hlCss;
}
