import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '../lib/index.js';

const hintType = ['caution', 'check', 'note', 'warning'] as const;

export const hintSections = { header: 'header' } as const;

export const hint = createContentModelSchema({
	sections: hintSections,
	attributes: {
		type: {
			type: String,
			matches: hintType.slice(),
			errorLevel: 'critical',
			description: 'Visual style: caution, check, note, or warning',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const hintType = new Tag('meta', { content: attrs.type ?? 'note' });
		const body = renderNodes(resolved.body, config);
		const bodyDiv = body.wrap('div');

		return createComponentRenderable({
			rune: 'hint',
			tag: 'section',
			properties: {
				hintType,
			},
			refs: {
				body: bodyDiv.tag('div'),
			},
			children: [bodyDiv.next()],
		});
	},
});
