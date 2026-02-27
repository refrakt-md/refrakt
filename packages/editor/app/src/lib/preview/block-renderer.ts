import Markdoc from '@markdoc/markdoc';
import { tags, nodes, serializeTree } from '@refrakt-md/runes';
import { createTransform, renderToHtml } from '@refrakt-md/transform';
import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/theme-base';

/** Runes needing external resources or runtime data — show placeholder in editor */
const RUNTIME_ONLY_TYPES = new Set([
	'Nav', 'NavGroup', 'NavItem',   // needs RfContext.pages
]);

/**
 * Restore postTransform hooks that were stripped during JSON serialization.
 * The server strips functions from the themeConfig before sending it as JSON;
 * we merge them back from the statically-imported baseConfig.
 */
function restorePostTransforms(config: ThemeConfig): ThemeConfig {
	const runes = { ...config.runes };
	for (const [name, rune] of Object.entries(baseConfig.runes)) {
		if (rune.postTransform && runes[name]) {
			runes[name] = { ...runes[name], postTransform: rune.postTransform };
		}
	}
	return { ...config, runes };
}

/**
 * Render a single block's Markdoc source to HTML via the identity transform.
 * Pure function, runs client-side, sub-millisecond per block.
 *
 * Returns `{ html, isComponent }`:
 * - `html`: the rendered HTML string
 * - `isComponent`: true if the block's root rune needs runtime resources (needs placeholder)
 */
export function renderBlockPreview(
	source: string,
	themeConfig: ThemeConfig,
	highlightTransform?: ((tree: RendererNode) => RendererNode) | null,
): { html: string; isComponent: boolean } {
	const ast = Markdoc.parse(source);
	const fullConfig = restorePostTransforms(themeConfig);
	const renderable = Markdoc.transform(ast, {
		tags,
		nodes,
		variables: { __source: source, __icons: fullConfig.icons },
	});
	const serialized = serializeTree(renderable) as RendererNode;

	// Check if the root rune needs runtime resources (placeholder)
	const isComponent = checkIsRuntimeOnly(serialized);

	const transform = createTransform(fullConfig);
	let transformed = transform(serialized);

	// Apply syntax highlighting if available
	if (highlightTransform) {
		transformed = highlightTransform(transformed);
	}

	const html = renderToHtml(transformed);

	return { html, isComponent };
}

/** Walk the tree to check if any root-level rune needs runtime resources */
function checkIsRuntimeOnly(node: RendererNode): boolean {
	if (node === null || node === undefined) return false;
	if (typeof node === 'string' || typeof node === 'number') return false;
	if (Array.isArray(node)) return node.some(checkIsRuntimeOnly);
	if ('attributes' in node && node.attributes?.typeof) {
		return RUNTIME_ONLY_TYPES.has(node.attributes.typeof);
	}
	return false;
}
