import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, Node } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, bodyOnly, asNodes } from '../lib/index.js';

function splitBarZones(nodes: Node[]): { left: Node[]; right: Node[] } {
	const hrIndex = nodes.findIndex((n) => n.type === 'hr');
	if (hrIndex < 0) return { left: nodes, right: [] };
	return {
		left: nodes.slice(0, hrIndex),
		right: nodes.slice(hrIndex + 1),
	};
}

export const bar = createContentModelSchema({
	attributes: {},
	contentModel: bodyOnly(),
	transform(resolved, _attrs, config) {
		const zones = splitBarZones(asNodes(resolved.body));

		const leftNodes = Markdoc.transform(zones.left, config) as RenderableTreeNode[];
		const rightNodes = Markdoc.transform(zones.right, config) as RenderableTreeNode[];

		const left = new Tag('div', {}, leftNodes);
		const right =
			zones.right.length > 0 ? new Tag('div', { 'data-align': 'end' }, rightNodes) : null;

		const children: RenderableTreeNode[] = right ? [left, right] : [left];

		return new Tag(
			'div',
			{
				'data-rune': 'bar',
				'data-zone-layout': 'bar',
			},
			children,
		);
	},
});
