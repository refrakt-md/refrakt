import Markdoc from '@markdoc/markdoc';
import { tags, nodes, serializeTree } from '@refrakt-md/runes';
import { createTransform, renderToHtml } from '@refrakt-md/transform';
import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';

/** Set of typeof values that are rendered by Svelte components and cannot be inlined */
const SVELTE_COMPONENT_TYPES = new Set([
	'Diagram', 'Nav', 'NavGroup', 'NavItem',
	'Chart', 'Comparison', 'ComparisonColumn', 'ComparisonRow',
	'Embed', 'Testimonial',
	'Map', 'MapPin',
	'Sandbox', 'DesignContext',
]);

/**
 * Render a single block's Markdoc source to HTML via the identity transform.
 * Pure function, runs client-side, sub-millisecond per block.
 *
 * Returns `{ html, isComponent }`:
 * - `html`: the rendered HTML string
 * - `isComponent`: true if the block's root rune is a Svelte component (needs placeholder)
 */
export function renderBlockPreview(
	source: string,
	themeConfig: ThemeConfig,
): { html: string; isComponent: boolean } {
	const ast = Markdoc.parse(source);
	const renderable = Markdoc.transform(ast, {
		tags,
		nodes,
		variables: { __source: source, __icons: themeConfig.icons },
	});
	const serialized = serializeTree(renderable) as RendererNode;

	// Check if the root rune is a Svelte component
	const isComponent = checkIsComponent(serialized);

	const transform = createTransform(themeConfig);
	const transformed = transform(serialized);
	const html = renderToHtml(transformed);

	return { html, isComponent };
}

/** Walk the tree to check if any root-level rune is a Svelte component */
function checkIsComponent(node: RendererNode): boolean {
	if (node === null || node === undefined) return false;
	if (typeof node === 'string' || typeof node === 'number') return false;
	if (Array.isArray(node)) return node.some(checkIsComponent);
	if ('attributes' in node && node.attributes?.typeof) {
		return SVELTE_COMPONENT_TYPES.has(node.attributes.typeof);
	}
	return false;
}
