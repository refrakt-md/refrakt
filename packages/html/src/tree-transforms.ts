import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import { isTag, makeTag } from '@refrakt-md/transform';

/**
 * Apply HTML-adapter-specific tree transforms before rendering.
 *
 * Currently:
 * - Wraps bare `<table>` elements in `<div class="rf-table-wrapper">` to match
 *   Lumina's responsive table styling (packages/lumina/styles/elements/table.css)
 */
export function applyHtmlTransforms(node: RendererNode): RendererNode {
	if (!isTag(node)) return node;

	// Recursively transform children first
	const children = node.children.map(applyHtmlTransforms);

	// Wrap top-level <table> elements in a wrapper div
	if (node.name === 'table') {
		return makeTag('div', { class: 'rf-table-wrapper' }, [
			{ ...node, children },
		]);
	}

	return { ...node, children };
}
