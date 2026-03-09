import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const event = createContentModelSchema({
	attributes: {
		date: { type: String, required: false },
		endDate: { type: String, required: false },
		location: { type: String, required: false },
		url: { type: String, required: false },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'header', match: 'heading|paragraph|image', greedy: true },
			{ name: 'body', match: 'list|blockquote|tag', greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const header = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const dateMeta = new Tag('meta', { content: attrs.date ?? '' });
		const endDateMeta = new Tag('meta', { content: attrs.endDate ?? '' });
		const locationMeta = new Tag('meta', { content: attrs.location ?? '' });
		const urlMeta = new Tag('meta', { content: attrs.url ?? '' });

		const bodyDiv = body.wrap('div');

		return createComponentRenderable(schema.Event, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				date: dateMeta,
				endDate: endDateMeta,
				location: locationMeta,
				url: urlMeta,
			},
			refs: {
				body: bodyDiv,
			},
			children: [
				dateMeta,
				endDateMeta,
				locationMeta,
				urlMeta,
				header.wrap('header').next(),
				bodyDiv.next(),
			],
		});
	},
});
