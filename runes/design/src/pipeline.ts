import Markdoc from '@markdoc/markdoc';
import type { PackagePipelineHooks, DesignTokens } from '@refrakt-md/types';

const { Tag } = Markdoc;

function walkTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => void): void {
	if (Markdoc.Tag.isTag(node)) {
		fn(node);
		for (const child of node.children) walkTags(child, fn);
	} else if (Array.isArray(node)) {
		node.forEach(n => walkTags(n, fn));
	}
}

function mapTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => unknown): unknown {
	if (Markdoc.Tag.isTag(node)) {
		const mapped = fn(node);
		if (mapped !== node) return mapped;
		const newChildren = node.children.map(c => mapTags(c, fn));
		const changed = newChildren.some((c, i) => c !== node.children[i]);
		return changed ? new Tag(node.name, node.attributes, newChildren as any[]) : node;
	}
	if (Array.isArray(node)) return node.map(n => mapTags(n, fn));
	return node;
}

export const designPipelineHooks: PackagePipelineHooks = {
	register(pages, registry, ctx) {
		for (const page of pages) {
			walkTags(page.renderable, (tag) => {
				if (tag.attributes['typeof'] !== 'DesignContext') return;
				const tokensMeta = tag.children.find(c => Markdoc.Tag.isTag(c) && c.attributes.property === 'tokens');
				const scopeMeta = tag.children.find(c => Markdoc.Tag.isTag(c) && c.attributes.property === 'scope');
				if (!tokensMeta || !Markdoc.Tag.isTag(tokensMeta)) return;
				const scope = (Markdoc.Tag.isTag(scopeMeta) ? scopeMeta.attributes.content as string : '') || 'default';
				try {
					const tokens = JSON.parse(tokensMeta.attributes.content as string) as DesignTokens;
					registry.register({ type: 'design-context', id: scope, sourceUrl: page.url, data: tokens as Record<string, unknown> });
				} catch {
					ctx.warn(`Failed to parse design tokens`, page.url);
				}
			});
		}
	},

	aggregate(registry) {
		const contexts: Record<string, DesignTokens> = {};
		for (const entity of registry.getAll('design-context')) {
			contexts[entity.id] = entity.data as DesignTokens;
		}
		return { contexts };
	},

	postProcess(page, aggregated, ctx) {
		const designData = aggregated['design'] as { contexts: Record<string, DesignTokens> } | undefined;
		if (!designData?.contexts || Object.keys(designData.contexts).length === 0) return page;

		let modified = false;
		const newRenderable = mapTags(page.renderable, (tag) => {
			if (tag.attributes['typeof'] !== 'Sandbox') return tag;
			const contextMeta = tag.children.find(c => Markdoc.Tag.isTag(c) && c.attributes.property === 'context');
			const scope = (Markdoc.Tag.isTag(contextMeta) ? contextMeta.attributes.content as string : '') || 'default';
			const tokens = designData.contexts[scope];
			if (!tokens) {
				if (scope !== 'default') {
					ctx.warn(`Sandbox references design context "${scope}" which is not defined on any page`, page.url);
				}
				return tag;
			}
			modified = true;
			const injected = new Tag('meta', { property: 'design-tokens', content: JSON.stringify(tokens) });
			return new Tag(tag.name, tag.attributes, [...tag.children, injected]);
		});

		if (!modified) return page;
		return { ...page, renderable: newRenderable as typeof page.renderable };
	},
};
