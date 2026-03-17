import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const event = createContentModelSchema({
	attributes: {
		date: { type: String, required: false, description: 'Start date of the event (e.g. 2025-06-15).' },
		endDate: { type: String, required: false, description: 'End date for multi-day events.' },
		location: { type: String, required: false, description: 'Venue or place name where the event is held.' },
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
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const dateMeta = new Tag('meta', { content: attrs.date ?? '' });
		const endDateMeta = new Tag('meta', { content: attrs.endDate ?? '' });
		const locationMeta = new Tag('meta', { content: attrs.location ?? '' });
		const urlMeta = new Tag('meta', { content: attrs.url ?? '' });
		const sectionProps = pageSectionProperties(header);

		const bodyDiv = body.wrap('div');

		// Schema.org nested Place for location
		const locationWrapper = attrs.location ? new Tag('span', { typeof: 'Place', property: 'location' }, [
			new Tag('meta', { property: 'name', content: attrs.location }),
		]) : undefined;

		const resultChildren: any[] = [
			dateMeta,
			endDateMeta,
			locationMeta,
			urlMeta,
			header.wrap('header').next(),
			bodyDiv.next(),
		];
		if (locationWrapper) resultChildren.push(locationWrapper);

		return createComponentRenderable(schema.Event, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				date: dateMeta,
				endDate: endDateMeta,
				location: locationMeta,
				url: urlMeta,
			},
			refs: {
				...sectionProps,
				body: bodyDiv,
			},
			schema: {
				name: sectionProps.headline,
				description: sectionProps.blurb,
				startDate: dateMeta,
				endDate: endDateMeta,
				url: urlMeta,
			},
			children: resultChildren,
		});
	},
});
