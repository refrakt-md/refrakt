import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, RenderableNodeCursor, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

class TimelineEntryModel extends Model {
	@attribute({ type: String, required: false })
	date: string = '';

	@attribute({ type: String, required: false })
	label: string = '';

	transform(): RenderableTreeNodes {
		const dateTag = new Tag('time', {}, [this.date]);
		const labelTag = new Tag('span', {}, [this.label]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.TimelineEntry, {
			tag: 'li',
			properties: {
				date: dateTag,
				label: labelTag,
			},
			refs: {
				body: body.tag('div'),
			},
			schema: {
				name: labelTag,
				description: dateTag,
			},
			children: [dateTag, labelTag, body.next()],
		});
	}
}

export const timelineEntry = createSchema(TimelineEntryModel);

export const timeline = createContentModelSchema({
	attributes: {
		direction: { type: String, required: false },
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
		const headerNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		// Combine explicit child tags (preamble items) with emitted section tags
		const allItems = [...asNodes(resolved.items), ...asNodes(resolved.sections)];
		const sectionNodes = new RenderableNodeCursor(
			Markdoc.transform(allItems, config) as RenderableTreeNode[],
		);
		const directionMeta = new Tag('meta', { content: attrs.direction ?? 'vertical' });

		const items = sectionNodes.tag('li').typeof('TimelineEntry');

		// Inject position meta into each entry for schema.org ListItem
		items.toArray().forEach((entry: any, index: number) => {
			if (Tag.isTag(entry)) {
				entry.children.push(new Tag('meta', { property: 'position', content: index + 1 }));
			}
		});

		const entriesList = new Tag('ol', {}, items.toArray());

		const children: any[] = [directionMeta];
		if (headerNodes.count() > 0) {
			children.push(headerNodes.wrap('header').next());
		}
		children.push(entriesList);

		return createComponentRenderable(schema.Timeline, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				direction: directionMeta,
				entry: items,
			},
			refs: { ...pageSectionProperties(headerNodes), entries: entriesList },
			schema: {
				itemListElement: items,
			},
			children,
		});
	},
});
