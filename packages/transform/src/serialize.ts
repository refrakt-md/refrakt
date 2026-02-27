import type { RendererNode } from '@refrakt-md/types';
import { isTag } from './helpers.js';

/** Convert a Markdoc Tag instance (or already-serialized tag) to a plain serializable object */
export function serialize(node: unknown): RendererNode {
	if (node === null || node === undefined) return node as RendererNode;
	if (typeof node === 'string' || typeof node === 'number') return node;
	if (isTag(node as RendererNode)) {
		const tag = node as any;
		return {
			$$mdtype: 'Tag',
			name: tag.name,
			attributes: tag.attributes,
			children: tag.children.map(serialize),
		};
	}
	return node as RendererNode;
}

/** Convert a Markdoc tree (single node or array) to serializable POJOs */
export function serializeTree(tree: unknown): RendererNode | RendererNode[] {
	if (Array.isArray(tree)) return tree.map(serialize);
	return serialize(tree);
}
