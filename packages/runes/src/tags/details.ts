import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '../lib/index.js';

export const details = createContentModelSchema({
	attributes: {
		summary: {
			type: String,
			required: false,
			description: 'Clickable summary text shown when collapsed',
		},
		open: { type: Boolean, required: false, description: 'Expand the details section by default' },
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const children = renderNodes(resolved.body, config);

		const summaryText = attrs.summary || 'Details';
		const summaryTag = new Tag('summary', {}, [summaryText]);
		const body = children.wrap('div');

		const tag = createComponentRenderable({
			rune: 'details',
			tag: 'details',
			properties: {
				summary: summaryTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [summaryTag, body.next()],
		});

		if (attrs.open) (tag.attributes as Record<string, unknown>).open = true;

		return tag;
	},
});
