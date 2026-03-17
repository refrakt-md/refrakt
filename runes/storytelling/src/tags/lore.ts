import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const lore = createContentModelSchema({
	attributes: {
		title: { type: String, required: true, description: 'Heading displayed for this lore entry.' },
		category: { type: String, required: false, description: 'Grouping label used to organize lore entries (e.g. history, magic, culture).' },
		spoiler: { type: Boolean, required: false, description: 'Enable/disable spoiler protection that hides content until revealed.' },
		tags: { type: String, required: false, description: 'Comma-separated keywords for filtering and cross-referencing.' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const titleTag = new Tag('span', {}, [attrs.title ?? '']);
		const categoryMeta = new Tag('meta', { content: attrs.category ?? '' });
		const spoilerMeta = new Tag('meta', { content: String(attrs.spoiler ?? false) });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');

		return createComponentRenderable(schema.Lore, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				title: titleTag,
				category: categoryMeta,
				spoiler: spoilerMeta,
				tags: tagsMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			schema: {
				headline: titleTag,
				articleSection: categoryMeta,
			},
			children: [titleTag, categoryMeta, spoilerMeta, tagsMeta, body.next()],
		});
	},
});
