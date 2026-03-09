import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const lore = createContentModelSchema({
	attributes: {
		title: { type: String, required: true },
		category: { type: String, required: false },
		spoiler: { type: Boolean, required: false },
		tags: { type: String, required: false },
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
			children: [titleTag, categoryMeta, spoilerMeta, tagsMeta, body.next()],
		});
	},
});
