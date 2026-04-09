import type { RendererNode } from '@refrakt-md/types';

/**
 * Apply HTML-adapter-specific tree transforms before rendering.
 *
 * Table wrapping and code block structure are now handled by Markdoc node
 * schemas in @refrakt-md/runes, so this function is a passthrough.
 * Retained for API compatibility and future extensibility.
 */
export function applyHtmlTransforms(node: RendererNode): RendererNode {
	return node;
}
