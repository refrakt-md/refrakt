import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, Node } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, asNodes } from '../lib/index.js';

/** Split the eyebrow body's node list on the FIRST top-level `hr` into
 *  `left` / `right` halves. 1 zone → everything is left, right is empty.
 *  2+ zones → left = before-hr, right = after-hr; subsequent hrs in the
 *  right half render as ordinary horizontal rules. Matches the body-zone
 *  convention `{% drawer %}` and `{% card %}` use, scaled to the two-slot
 *  case the `split` layout primitive needs (SPEC-079). */
function splitEyebrowZones(nodes: Node[]): { left: Node[]; right: Node[] } {
	const hrIndex = nodes.findIndex(n => n.type === 'hr');
	if (hrIndex < 0) return { left: nodes, right: [] };
	return {
		left: nodes.slice(0, hrIndex),
		right: nodes.slice(hrIndex + 1),
	};
}

/**
 * Eyebrow rune — block-level wrapper that renders the SPEC-079 `split`
 * layout primitive over author-written content. The body splits on a
 * top-level `---` into `left` / `right` halves; same DOM as a projected
 * `zones.eyebrow = { left, right }` declaration.
 *
 * Use inside any container rune (card, drawer, recipe, hero) to add a
 * contextual strip above the title, or standalone in prose to render an
 * eyebrow row independently.
 *
 * Usage:
 *   {% eyebrow %}
 *   ID-123
 *   ---
 *   {% badge sentiment="positive" %}done{% /badge %}
 *   {% /eyebrow %}
 *
 *   {% eyebrow %}
 *   Just one side — no right slot.
 *   {% /eyebrow %}
 */
export const eyebrow = createContentModelSchema({
	attributes: {},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, _attrs, config) {
		const zones = splitEyebrowZones(asNodes(resolved.body));

		const leftNodes = Markdoc.transform(zones.left, config) as RenderableTreeNode[];
		const rightNodes = Markdoc.transform(zones.right, config) as RenderableTreeNode[];

		const left = new Tag('div', { 'data-eyebrow-slot': 'left' }, leftNodes);
		const right = zones.right.length > 0
			? new Tag('div', { 'data-eyebrow-slot': 'right' }, rightNodes)
			: null;

		const children: RenderableTreeNode[] = right ? [left, right] : [left];

		// Emit the same DOM shape as the engine's `split` layout primitive
		// so themes can target both via `[data-zone-layout="split"]`.
		return new Tag('div', {
			'data-rune': 'eyebrow',
			'data-zone': 'eyebrow',
			'data-zone-layout': 'split',
		}, children);
	},
});
