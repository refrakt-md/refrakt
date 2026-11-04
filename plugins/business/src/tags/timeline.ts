import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	bodyOnly,
	asNodes,
	renderNodes,
	RenderableNodeCursor,
	pageSectionProperties,
} from '@refrakt-md/runes';

export const timelineEntrySchema = {
	type: 'ListItem',
	properties: { label: 'name', date: 'description' },
} as const;

export const timelineEntry = createContentModelSchema({
	schema: timelineEntrySchema,
	attributes: {
		date: {
			type: String,
			required: false,
			description: 'Date or time shown on this entry (e.g. "2024-03", "Q1 2025").',
		},
		label: {
			type: String,
			required: false,
			description: 'Short title or milestone name for the entry.',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const dateTag = new Tag('time', {}, [attrs.date ?? '']);
		const labelTag = new Tag('span', {}, [attrs.label ?? '']);
		const body = renderNodes(resolved.body, config).wrap('div');

		return createComponentRenderable({
			rune: 'timeline-entry',
			tag: 'li',
			refs: {
				date: dateTag,
				label: labelTag,
				body: body.tag('div'),
			},
			children: [dateTag, labelTag, body.next()],
		});
	},
});

export const timelineSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
} as const;

export const timelineSchema = {
	type: 'ItemList',
	lists: ['itemListElement'],
	children: {
		'timeline-entry': {
			type: 'ListItem',
			property: 'itemListElement',
			generated: { position: 'index' },
		},
	},
} as const;

export const timeline = createContentModelSchema({
	schema: timelineSchema,
	sections: timelineSections,
	attributes: {
		direction: {
			type: String,
			required: false,
			description: 'Axis along which entries are laid out (vertical or horizontal).',
		},
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'timeline-entry',
		emitAttributes: { date: '$date', label: '$label' },
		headingExtract: {
			fields: [
				{ name: 'date', match: 'text' as const, pattern: /^(.+?)\s*[-–—:]\s*/, optional: true },
				{ name: 'label', match: 'text' as const, pattern: 'remainder' as const },
			],
		},
		fields: [
			{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
			{ name: 'items', match: 'tag', optional: true, greedy: true },
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
	}),
	transform(resolved, attrs, config) {
		const headerNodes = renderNodes(resolved.header, config);
		const allItems = [...asNodes(resolved.items), ...asNodes(resolved.sections)];
		const sectionNodes = new RenderableNodeCursor(
			Markdoc.transform(allItems, config) as RenderableTreeNode[],
		);
		const directionMeta = new Tag('meta', { content: attrs.direction ?? 'vertical' });

		const items = sectionNodes.tag('li').typeof('TimelineEntry');

		const entriesList = new Tag('ol', {}, items.toArray());

		const children: any[] = [];
		if (headerNodes.count() > 0) {
			children.push(headerNodes.wrap('header').next());
		}
		children.push(entriesList);

		return createComponentRenderable({
			rune: 'timeline',
			tag: 'section',
			properties: {
				direction: directionMeta,
				entry: items,
			},
			refs: { ...pageSectionProperties(headerNodes), entries: entriesList },
			children,
		});
	},
});
