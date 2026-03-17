import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, asNodes } from '../lib/index.js';

const regionMode = ['replace', 'prepend', 'append'] as const;

export const region = createContentModelSchema({
	attributes: {
		name: { type: String, required: true, description: 'Name of the layout region to fill' },
		mode: { type: String, required: false, matches: regionMode.slice(), errorLevel: 'critical', default: 'replace', description: 'How content is placed: replace, prepend, or append' },
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
			'data-region': attrs.name,
			'data-mode': attrs.mode,
		}, children);
	},
});
