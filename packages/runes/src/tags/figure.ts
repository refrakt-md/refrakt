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

		const imgs = children.flatten().tag('img').toArray();

		// For caption fallback, skip paragraphs that only contain an image
		const textParagraphs = children.tag('p').toArray().filter(p => {
			const kids = (p.children || []).filter((c: any) => Markdoc.Tag.isTag(c));
			return !(kids.length === 1 && kids[0].name === 'img');
		});

		const captionContent = attrs.caption || undefined;
		const captionTag = captionContent
			? new Tag('figcaption', {}, [captionContent])
			: textParagraphs.length > 0
				? new Tag('figcaption', {}, [textParagraphs[0]])
				: undefined;

		const sizeMeta = attrs.size ? new Tag('meta', { content: attrs.size }) : undefined;
		const alignMeta = attrs.align ? new Tag('meta', { content: attrs.align }) : undefined;
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
