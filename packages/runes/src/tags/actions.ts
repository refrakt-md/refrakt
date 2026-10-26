import Markdoc from '@markdoc/markdoc';
import type { Config, Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { linkItem } from './common.js';

type AnyTag = InstanceType<typeof Tag>;

/**
 * `actions` (SPEC-160 D6) — a row of actions: buttons from a list of links,
 * and copyable command lines from fences.
 *
 * Each list item becomes `<li data-name="action">` with its rank as a data
 * attribute: `data-rank="primary"` on the first link of the whole region and
 * `secondary` on the rest, so a theme styles the rank and not the list
 * position. A fence becomes a `command` block, unranked.
 *
 * `hero` and `cta` build their actions region with {@link buildActions}, so the
 * nested rune is the same one a composition gets from `{% actions %}`.
 */
export function buildActions(nodes: readonly Node[], config: Config): AnyTag {
	// Use the original config inside the fence handler to avoid recursion
	// (same pattern as NodeStream.useNode — the inner transform uses the base
	// config, not the config with custom overrides).
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
	// Positional over the whole region, not per list: a region written as list,
	// fence, list has one primary action (WORK-654).
	const primary = items.find(hasLink);
	for (const item of items) {
		item.attributes['data-rank'] = item === primary ? 'primary' : 'secondary';
	}

	return createComponentRenderable({
		rune: 'actions',
		tag: 'div',
		refs: {
			// Naming the list is what lets the engine's BEM pass reach the items
			// inside it (`rf-actions__list`, `rf-actions__action`).
			list: rendered.tags('ul', 'ol').toArray() as AnyTag[],
			action: items,
			command: rendered.flatten().tags('div').toArray() as AnyTag[],
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
