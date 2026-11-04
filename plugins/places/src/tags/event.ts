import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	asNodes,
	renderNodes,
	RenderableNodeCursor,
	pageSectionProperties,
	unwrapParagraphImages,
	fieldMetas,
} from '@refrakt-md/runes';

export const eventSections = { headline: 'title', blurb: 'description', body: 'body' } as const;

export const eventSchema = {
	type: 'Event',
	properties: {
		headline: 'name',
		blurb: 'description',
		date: 'startDate',
		endDate: 'endDate',
		url: 'url',
	},
	entities: {
		location: { type: 'Place', property: 'location', properties: { location: 'name' } },
	},
} as const;

export const event = createContentModelSchema({
	schema: eventSchema,
	sections: eventSections,
	provides: ['prose'],
	attributes: {
		date: {
			type: String,
			required: false,
			description: 'Start date of the event (e.g. 2025-06-15).',
		},
		endDate: { type: String, required: false, description: 'End date for multi-day events.' },
		location: {
			type: String,
			required: false,
			description: 'Venue or place name where the event is held.',
		},
		url: { type: String, required: false, description: 'Link to the event page or ticket source.' },
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
			unwrapParagraphImages(
				Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
			),
		);
		const body = renderNodes(resolved.body, config);

		const sectionProps = pageSectionProperties(header);

		const bodyDiv = body.wrap('div');

		const resultChildren: any[] = [...header.toArray(), bodyDiv.next()];

		return createComponentRenderable({
			rune: 'event',
			tag: 'article',
			properties: fieldMetas(attrs, config, {
				date: '',
				endDate: '',
				location: '',
				url: '',
			}),
			refs: {
				...sectionProps,
				body: bodyDiv,
			},
			children: resultChildren,
		});
	},
});
