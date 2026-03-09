import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const sizeValues = ['small', 'medium', 'large', 'full'] as const;
const alignValues = ['left', 'center', 'right'] as const;

export const figure = createContentModelSchema({
	attributes: {
		size: { type: String, required: false, matches: sizeValues.slice() },
		align: { type: String, required: false, matches: alignValues.slice() },
		caption: { type: String, required: false },
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

		const captionContent = attrs.caption || undefined;
		const captionTag = captionContent
			? new Tag('figcaption', {}, [captionContent])
			: children.tag('p').count() > 0
				? new Tag('figcaption', {}, children.tag('p').limit(1).toArray())
				: undefined;

		const sizeMeta = attrs.size ? new Tag('meta', { content: attrs.size }) : undefined;
		const alignMeta = attrs.align ? new Tag('meta', { content: attrs.align }) : undefined;

		const childNodes: any[] = [...children.tag('img').toArray()];
		if (captionTag) childNodes.push(captionTag);
		if (sizeMeta) childNodes.push(sizeMeta);
		if (alignMeta) childNodes.push(alignMeta);

		return createComponentRenderable(schema.Figure, {
			tag: 'figure',
			properties: {
				...(captionTag ? { caption: captionTag } : {}),
				...(sizeMeta ? { size: sizeMeta } : {}),
				...(alignMeta ? { align: alignMeta } : {}),
			},
			children: childNodes,
		});
	},
});
