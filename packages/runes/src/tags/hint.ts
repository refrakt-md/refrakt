import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const hintType = ['caution', 'check', 'note', 'warning'] as const;

export const hint = createContentModelSchema({
	attributes: {
		type: { type: String, matches: hintType.slice(), errorLevel: 'critical', description: 'Visual style: caution, check, note, or warning' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const hintType = new Tag('meta', { content: attrs.type ?? 'note' });
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);
		const bodyDiv = body.wrap('div');

		return createComponentRenderable({ rune: 'hint',
			tag: 'section',
			property: 'contentSection',
			properties: {
				hintType,
			},
			refs: {
				body: bodyDiv.tag('div'),
			},
			children: [hintType, bodyDiv.next()],
		});
	},
});
