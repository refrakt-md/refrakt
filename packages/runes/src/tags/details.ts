import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

export const details = createContentModelSchema({
	attributes: {
		summary: { type: String, required: false, description: 'Clickable summary text shown when collapsed' },
		open: { type: Boolean, required: false, description: 'Expand the details section by default' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const summaryText = attrs.summary || 'Details';
		const summaryTag = new Tag('summary', {}, [summaryText]);
		const body = children.wrap('div');

		const tag = createComponentRenderable(schema.Details, {
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
