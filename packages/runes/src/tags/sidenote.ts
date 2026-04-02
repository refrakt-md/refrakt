import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const variantType = ['sidenote', 'footnote', 'tooltip'] as const;

export const sidenote = createContentModelSchema({
	attributes: {
		variant: { type: String, required: false, matches: variantType.slice(), description: 'Display style: sidenote, footnote, or tooltip' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'sidenote' });
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);
		const bodyDiv = body.wrap('div');

		return createComponentRenderable({ rune: 'sidenote',
			tag: 'aside',
			properties: {
				variant: variantMeta,
			},
			refs: {
				body: bodyDiv,
			},
			children: [variantMeta, bodyDiv.next()],
		});
	},
});
