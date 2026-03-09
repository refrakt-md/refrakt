import Markdoc from '@markdoc/markdoc';
import { tags, nodes, serializeTree } from '@refrakt-md/runes';
import { createTransform, renderToHtml } from '@refrakt-md/transform';
import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
import type { SerializedTag, AggregatedData } from '@refrakt-md/types';
import { baseConfig } from '@refrakt-md/runes';

type PostTransformFn = (node: SerializedTag, context: { modifiers: Record<string, string>; parentType?: string }) => SerializedTag;

/** Runes needing external resources or runtime data — show placeholder in editor */
const RUNTIME_ONLY_TYPES = new Set([
	'Nav', 'NavGroup', 'NavItem',   // needs RfContext.pages
]);

/**
 * Restore functions that were lost during JSON serialization.
 * The server sends themeConfig as JSON; JSON.stringify silently drops functions.
 * We merge postTransform and styles (which may contain transform functions)
 * back from the statically-imported baseConfig (core runes) and from the
 * community tags bundle (community runes).
 */
function restoreFunctions(
	config: ThemeConfig,
	communityPostTransforms?: Record<string, PostTransformFn>,
	communityStyles?: Record<string, Record<string, unknown>>,
): ThemeConfig {
	const runes = { ...config.runes };
	// Core runes: restore from baseConfig
	for (const [name, rune] of Object.entries(baseConfig.runes)) {
		if (!runes[name]) continue;
		const patches: Record<string, unknown> = {};
		if (rune.postTransform) patches.postTransform = rune.postTransform;
		if (rune.styles) patches.styles = rune.styles;
		if (Object.keys(patches).length) {
			runes[name] = { ...runes[name], ...patches };
		}
	}
	// Community runes: restore from bundle exports
	if (communityPostTransforms) {
		for (const [name, postTransform] of Object.entries(communityPostTransforms)) {
			if (runes[name]) {
				runes[name] = { ...runes[name], postTransform };
			}
		}
	}
	if (communityStyles) {
		for (const [name, styles] of Object.entries(communityStyles)) {
			if (runes[name]) {
				runes[name] = { ...runes[name], styles };
			}
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
	extraTags?: Record<string, unknown>,
	communityPostTransforms?: Record<string, PostTransformFn>,
	aggregated?: AggregatedData,
	communityStyles?: Record<string, Record<string, unknown>>,
): { html: string; isComponent: boolean } {
	const ast = Markdoc.parse(source);
	const fullConfig = restoreFunctions(themeConfig, communityPostTransforms, communityStyles);
	const mergedTags = extraTags ? { ...tags, ...extraTags as Record<string, import('@markdoc/markdoc').Schema> } : tags;
	const renderable = Markdoc.transform(ast, {
		tags: mergedTags,
		nodes,
		variables: { __source: source, __icons: fullConfig.icons },
	});
	let serialized = serializeTree(renderable) as RendererNode;

	// Client-side equivalent of Phase 4: inject design tokens into sandbox nodes
	if (aggregated) {
		serialized = injectSandboxDesignTokens(serialized, aggregated) as RendererNode;
	}

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
	if ('attributes' in node && node.attributes?.['data-rune']) {
		return RUNTIME_ONLY_TYPES.has(node.attributes['data-rune']);
	}
	return false;
}

/**
 * Client-side equivalent of the design package's Phase 4 postProcess.
 * Walks the serialized tree and injects design-tokens meta into Sandbox nodes
 * based on their context attribute and the cached aggregated data.
 */
function injectSandboxDesignTokens(node: RendererNode, aggregated: AggregatedData): RendererNode {
	if (node === null || node === undefined) return node;
	if (typeof node === 'string' || typeof node === 'number') return node;
	if (Array.isArray(node)) {
		return node.map(n => injectSandboxDesignTokens(n as RendererNode, aggregated)) as RendererNode;
	}

	const tag = node as SerializedTag;
	if (tag.attributes?.['data-rune'] === 'Sandbox') {
		const design = aggregated['design'] as { contexts?: Record<string, unknown> } | undefined;
		const contexts = design?.contexts ?? {};
		const contextChild = tag.children?.find(
			c => (c as SerializedTag)?.attributes?.property === 'context',
		) as SerializedTag | undefined;
		const scope = (contextChild?.attributes?.content as string) ?? 'default';
		const tokens = contexts[scope];
		if (tokens) {
			const injected: SerializedTag = {
				$$mdtype: 'Tag',
				name: 'meta',
				attributes: { property: 'design-tokens', content: JSON.stringify(tokens) },
				children: [],
			};
			return { ...tag, children: [...(tag.children ?? []), injected] };
		}
	}

	if (tag.children?.length) {
		const newChildren = tag.children.map(c => injectSandboxDesignTokens(c as RendererNode, aggregated));
		return { ...tag, children: newChildren };
	}

	return tag;
}
