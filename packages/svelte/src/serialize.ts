import { Tag } from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';

/** Convert a Markdoc Tag instance to a plain serializable object */
export function serialize(node: RenderableTreeNode): unknown {
	if (node === null || node === undefined) return node;
	if (typeof node === 'string' || typeof node === 'number') return node;
	if (Tag.isTag(node)) {
		return {
			$$mdtype: 'Tag',
			name: node.name,
			attributes: node.attributes,
			children: node.children.map(serialize),
		};
	}
	return node;
}

/** Convert a Markdoc tree (single node or array) to serializable POJOs */
export function serializeTree(tree: RenderableTreeNodes): unknown {
	if (Array.isArray(tree)) return tree.map(serialize);
	return serialize(tree);
}
