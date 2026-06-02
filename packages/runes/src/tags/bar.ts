import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, Node } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, asNodes } from '../lib/index.js';

/** Split the bar body's node list on the FIRST top-level `hr` into
 *  `left` / `right` halves. 1 zone → everything is left, right is empty.
 *  2+ zones → left = before-hr, right = after-hr; subsequent hrs in the
 *  right half render as ordinary horizontal rules. Matches the body-zone
 *  convention `{% drawer %}` and `{% card %}` use, scaled to the two-group
 *  case the `bar` layout primitive renders (SPEC-080). */
function splitBarZones(nodes: Node[]): { left: Node[]; right: Node[] } {
	const hrIndex = nodes.findIndex(n => n.type === 'hr');
	if (hrIndex < 0) return { left: nodes, right: [] };
	return {
		left: nodes.slice(0, hrIndex),
		right: nodes.slice(hrIndex + 1),
	};
}

/**
 * Bar rune — block-level wrapper that renders the SPEC-080 `bar` layout
 * primitive (a horizontal flex row) over author-written content. The body
 * splits on a top-level `---` into a left group and a right group; the right
 * group is tagged `data-align="end"` so the shared
 * `[data-zone-layout="bar"] [data-align="end"] { margin-left: auto }` rule
 * pushes it to the row's end. Position-agnostic: place it in the eyebrow
 * slot for a kicker, or anywhere a labelled strip is wanted.
 *
 * Usage:
 *   {% bar %}
 *   ID-123
 *   ---
 *   {% badge sentiment="positive" %}done{% /badge %}
 *   {% /bar %}
 *
 *   {% bar %}
 *   Just one side — no right group.
 *   {% /bar %}
 */
export const bar = createContentModelSchema({
	attributes: {},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, _attrs, config) {
		const zones = splitBarZones(asNodes(resolved.body));

		const leftNodes = Markdoc.transform(zones.left, config) as RenderableTreeNode[];
		const rightNodes = Markdoc.transform(zones.right, config) as RenderableTreeNode[];

		const left = new Tag('div', {}, leftNodes);
		const right = zones.right.length > 0
			? new Tag('div', { 'data-align': 'end' }, rightNodes)
			: null;

		const children: RenderableTreeNode[] = right ? [left, right] : [left];

		// Same DOM as the engine's `bar` layout primitive so themes target
		// both via `[data-zone-layout="bar"]`.
		return new Tag('div', {
			'data-rune': 'bar',
			'data-zone-layout': 'bar',
		}, children);
	},
});
