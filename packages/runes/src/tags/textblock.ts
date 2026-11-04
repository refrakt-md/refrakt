import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '../lib/index.js';

const alignValues = ['left', 'center', 'right', 'justify'] as const;

export const textBlockSections = { body: 'body' } as const;

export const textblock = createContentModelSchema({
	sections: textBlockSections,
	provides: ['prose'],
	attributes: {
		columns: { type: Number, required: false, description: 'Number of text columns' },
		lead: { type: Boolean, required: false, description: 'Style the first paragraph as a lead' },
		align: {
			type: String,
			required: false,
			matches: alignValues.slice(),
			description: 'Text alignment',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const children = renderNodes(resolved.body, config);

		const columns = attrs.columns ?? 1;
		const lead = attrs.lead ?? false;
		const align = attrs.align ?? 'left';

		const columnsMeta = columns > 1 ? new Tag('meta', { content: String(columns) }) : undefined;
		const leadMeta = lead ? new Tag('meta', { content: 'lead' }) : undefined;
		const alignMeta = align !== 'left' ? new Tag('meta', { content: align }) : undefined;

		const body = children.wrap('div');

		return createComponentRenderable({
			rune: 'text-block',
			tag: 'div',
			properties: {
				columns: columnsMeta,
				lead: leadMeta,
				align: alignMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [body.next()],
		});
	},
});
