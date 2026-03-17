import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, asNodes } from '../lib/index.js';

export const layout = createContentModelSchema({
	attributes: {
		extends: { type: String, required: false, default: 'parent', description: 'Layout inheritance: parent or none' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', greedy: true, optional: true },
		],
	},
	transform(resolved, attrs, config) {
		const children = Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[];

		return new Tag('div', {
			'data-layout-def': true,
			'data-extends': attrs.extends,
		}, children);
	},
});
