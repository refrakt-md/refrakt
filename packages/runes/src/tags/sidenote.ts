import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
	fieldMetas,
} from '../lib/index.js';

const variantType = ['sidenote', 'footnote', 'tooltip'] as const;

export const sidenoteSections = { body: 'body' } as const;

export const sidenote = createContentModelSchema({
	sections: sidenoteSections,
	provides: ['prose'],
	attributes: {
		variant: {
			type: String,
			required: false,
			matches: variantType.slice(),
			description: 'Display style: sidenote, footnote, or tooltip',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const body = renderNodes(resolved.body, config);
		const bodyDiv = body.wrap('div');

		return createComponentRenderable({
			rune: 'sidenote',
			tag: 'aside',
			properties: fieldMetas(attrs, config, {
				variant: 'sidenote',
			}),
			refs: {
				body: bodyDiv,
			},
			children: [bodyDiv.next()],
		});
	},
});
