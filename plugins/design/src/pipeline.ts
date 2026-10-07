import Markdoc from '@markdoc/markdoc';
import type { RegistersIndex } from '@refrakt-md/runes';
import { readField as readNodeField } from '@refrakt-md/transform';
import type { PluginPipelineHooks, DesignTokens } from '@refrakt-md/types';

const { Tag } = Markdoc;

function mapTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => unknown): unknown {
	if (Markdoc.Tag.isTag(node)) {
		const mapped = fn(node);
		if (mapped !== node) return mapped;
		const newChildren = node.children.map((c) => mapTags(c, fn));
		const changed = newChildren.some((c, i) => c !== node.children[i]);
		return changed ? new Tag(node.name, node.attributes, newChildren as any[]) : node;
	}
	if (Array.isArray(node)) return node.map((n) => mapTags(n, fn));
	return node;
}

/**
 * SPEC-144 / WORK-613 — `design-context` declares what it registers (its
 * `registers` block), and the core participant registers it and fills this
 * plugin's `aggregated` slot with the name index. What stays is the part a
 * declaration cannot express: writing the tokens into each `sandbox`, a rune
 * this plugin does not own (SPEC-144 D2 — resolution, not registration).
 */
export const designPipelineHooks: PluginPipelineHooks = {
	postProcess(page, aggregated, ctx) {
		const designData = aggregated['design'] as RegistersIndex | undefined;
		if (!designData?.entityByName || designData.entityByName.size === 0) return page;

		let modified = false;
		const newRenderable = mapTags(page.renderable, (tag) => {
			if (tag.attributes['data-rune'] !== 'sandbox') return tag;
			// SPEC-082: bag-first (data-rune-fields), legacy <meta data-field> fallback.
			const scope = readNodeField(tag, 'context') || 'default';
			const tokens = designData.entityByName.get(scope)?.data as DesignTokens | undefined;
			if (!tokens) {
				if (scope !== 'default') {
					ctx.warn(
						`Sandbox references design context "${scope}" which is not defined on any page`,
						page.url,
					);
				}
				return tag;
			}
			modified = true;
			const injected = new Tag('meta', {
				'data-field': 'design-tokens',
				content: JSON.stringify(tokens),
			});
			return new Tag(tag.name, tag.attributes, [...tag.children, injected]);
		});

		if (!modified) return page;
		return { ...page, renderable: newRenderable as typeof page.renderable };
	},
};
