import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes, pageSectionProperties } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const itineraryStop = createContentModelSchema({
	attributes: {
		time: { type: String, required: false },
		location: { type: String, required: false },
		duration: { type: String, required: false },
		activity: { type: String, required: false },
		lat: { type: String, required: false },
		lng: { type: String, required: false },
	},
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
	},
	transform(resolved, attrs, config) {
		const timeTag = new Tag('time', {}, [attrs.time ?? '']);
		const locationTag = new Tag('span', {}, [attrs.location ?? '']);
		const durationMeta = new Tag('meta', { content: attrs.duration ?? '' });
		const activityMeta = new Tag('meta', { content: attrs.activity ?? '' });
		const latMeta = new Tag('meta', { content: attrs.lat ?? '' });
		const lngMeta = new Tag('meta', { content: attrs.lng ?? '' });
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');

		return createComponentRenderable(schema.ItineraryStop, {
			tag: 'li',
			properties: {
				time: timeTag,
				location: locationTag,
				duration: durationMeta,
				activity: activityMeta,
				lat: latMeta,
				lng: lngMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [timeTag, locationTag, durationMeta, activityMeta, latMeta, lngMeta, body.next()],
		});
	},
});

export const itineraryDay = createContentModelSchema({
	attributes: {
		label: { type: String, required: false },
		date: { type: String, required: false },
	},
	contentModel: {
		type: 'sections',
		sectionHeading: 'heading',
		fields: [
			{ name: 'header', match: 'paragraph', optional: true, greedy: true },
		],
		sectionModel: {
			type: 'sequence',
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
		emitTag: 'itinerary-stop',
		headingExtract: {
			fields: [
				{ name: 'time', match: 'text' as const, pattern: /^(.+?)\s*[-–—]\s*/ },
				{ name: 'location', match: 'text' as const, pattern: 'remainder' as const },
			],
		},
		emitAttributes: {
			time: '$time',
			location: '$location',
		},
	},
	transform(resolved, attrs, config) {
		const headerNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		const stopsRendered = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.sections), config) as RenderableTreeNode[],
		);

		const stopsStream = stopsRendered.tag('li').typeof('ItineraryStop');

		const labelTag = new Tag('h3', {}, [attrs.label ?? '']);
		const dateMeta = new Tag('meta', { content: attrs.date ?? '' });

		const stopsList = new Tag('ol', {}, stopsStream.toArray());

		const children: any[] = [labelTag, dateMeta];
		if (headerNodes.count() > 0) {
			children.push(headerNodes.wrap('div').next());
		}
		children.push(stopsList);

		return createComponentRenderable(schema.ItineraryDay, {
			tag: 'article',
			properties: {
				label: labelTag,
				date: dateMeta,
				stop: stopsStream,
			},
			refs: {
				stops: stopsList,
			},
			children,
		});
	},
});

export const itinerary = createContentModelSchema({
	attributes: {
		variant: { type: String, required: false },
		direction: { type: String, required: false },
	},
	contentModel: {
		when: [
			{
				condition: { hasChild: 'heading:2' },
				model: {
					type: 'sections' as const,
					sectionHeading: 'heading:2',
					fields: [
						{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
					],
					sectionModel: {
						type: 'sequence' as const,
						fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
					},
					emitTag: 'itinerary-day',
					emitAttributes: {
						label: '$heading',
					},
				},
			},
		],
		default: {
			type: 'sections' as const,
			sectionHeading: 'heading:2',
			fields: [],
			sectionModel: {
				type: 'sequence' as const,
				fields: [],
			},
			emitTag: 'itinerary-day',
			implicitSection: { attributes: { label: '' } },
		},
	},
	transform(resolved, attrs, config) {
		const headerNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		const bodyStream = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.sections), config) as RenderableTreeNode[],
		);

		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'day-by-day' });
		const directionMeta = new Tag('meta', { content: attrs.direction ?? 'vertical' });

		const days = bodyStream.tag('article').typeof('ItineraryDay');
		const daysContainer = new Tag('div', {}, days.toArray());

		const children: any[] = [variantMeta, directionMeta];
		if (headerNodes.count() > 0) {
			children.push(headerNodes.wrap('header').next());
		}
		children.push(daysContainer);

		return createComponentRenderable(schema.Itinerary, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(headerNodes),
				variant: variantMeta,
				direction: directionMeta,
				day: days,
			},
			refs: { days: daysContainer },
			children,
		});
	},
});
