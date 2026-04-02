import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const sizeValues = ['small', 'medium', 'large', 'full'] as const;
const alignValues = ['left', 'center', 'right'] as const;

export const figure = createContentModelSchema({
	attributes: {
		size: { type: String, required: false, matches: sizeValues.slice(), description: 'Display width of the figure' },
		align: { type: String, required: false, matches: alignValues.slice(), description: 'Horizontal alignment of the figure' },
		caption: { type: String, required: false, description: 'Caption text displayed below the figure' },
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

		const imgs = children.tag('img').toArray();
		const childNodes: any[] = [...imgs];
		if (captionTag) childNodes.push(captionTag);
		if (sizeMeta) childNodes.push(sizeMeta);
		if (alignMeta) childNodes.push(alignMeta);

		return createComponentRenderable({ rune: 'figure', schemaOrgType: 'ImageObject',
			tag: 'figure',
			properties: {
				...(sizeMeta ? { size: sizeMeta } : {}),
				...(alignMeta ? { align: alignMeta } : {}),
			},
			refs: {
				...(captionTag ? { caption: captionTag } : {}),
			},
			schema: {
				...(imgs.length > 0 ? { contentUrl: imgs[0] } : {}),
				...(captionTag ? { caption: captionTag } : {}),
			},
			children: childNodes,
		});
	},
});
