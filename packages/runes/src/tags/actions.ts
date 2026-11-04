import Markdoc from '@markdoc/markdoc';
import type { Config, Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { linkItem } from './common.js';

type AnyTag = InstanceType<typeof Tag>;

export function buildActions(nodes: readonly Node[], config: Config): AnyTag {
	const baseConfig = config;
	const actionConfig = {
		...config,
		nodes: {
			...config.nodes,
			item: linkItem,
			fence: {
				transform(node: Node) {
					const output = new RenderableNodeCursor([
						Markdoc.transform(node, baseConfig),
					] as RenderableTreeNode[]);
					return new Tag('div', {}, [output.next()]);
				},
			},
		},
	};
	const rendered = new RenderableNodeCursor(
		Markdoc.transform([...nodes], actionConfig) as RenderableTreeNode[],
	);

	const items = rendered.flatten().tags('li').toArray() as AnyTag[];
	const hasLink = (n: RenderableTreeNode): boolean =>
		Markdoc.Tag.isTag(n) && (n.name === 'a' || n.children.some(hasLink));
	const primary = items.find(hasLink);
	for (const item of items) {
		item.attributes['data-rank'] = item === primary ? 'primary' : 'secondary';
	}

	return createComponentRenderable({
		rune: 'actions',
		tag: 'div',
		refs: {
			list: rendered.tags('ul', 'ol').toArray() as AnyTag[],
			action: items,
			command: rendered.tags('div').toArray() as AnyTag[],
		},
		children: rendered.toArray(),
	}) as AnyTag;
}

export const actions = createContentModelSchema({
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'items', match: 'list|fence', optional: true, greedy: true }],
	},
	transform(resolved, _attrs, config) {
		const items = resolved.items;
		const nodes = (Array.isArray(items) ? items : items ? [items] : []) as Node[];
		return buildActions(nodes, config);
	},
});
