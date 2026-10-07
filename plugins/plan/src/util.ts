import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;

/** Remove top-level `hr` elements from a renderable node array.
 *  Plan content uses `---` as editorial separators in markdown source;
 *  these don't serve a purpose in the rendered output. */
export function stripHorizontalRules(nodes: RenderableTreeNode[]): RenderableTreeNode[] {
	return nodes.filter((n) => !(n instanceof Tag && n.name === 'hr'));
}
