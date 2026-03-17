import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor, linkItem, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const cta = createContentModelSchema({
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
			{ name: 'actions', match: 'list|fence', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const header = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);

		// Transform actions with custom node overrides (same pattern as hero)
		const baseConfig = config;
		const actionConfig = {
			...config,
			nodes: {
				...config.nodes,
				item: linkItem,
				fence: {
					transform(node: Node) {
						const output = new RenderableNodeCursor(
							[Markdoc.transform(node, baseConfig)] as RenderableTreeNode[],
						);
						return new Tag('div', {}, [output.next()]);
					},
				},
			},
		};
		const actions = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.actions), actionConfig) as RenderableTreeNode[],
		);

		const actionsDiv = actions.wrap('div');

		return createComponentRenderable(schema.CallToAction, {
			tag: 'section',
			property: 'contentSection',
			class: attrs.class,
			properties: {},
			refs: {
				...pageSectionProperties(header),
				actions: actionsDiv,
				body: header.wrap('div'),
				action: actions.flatten().tags('li'),
				command: actions.flatten().tags('div'),
			},
			children: [
				header.wrap('header').next(),
				actionsDiv.next(),
			],
		});
	},
});
