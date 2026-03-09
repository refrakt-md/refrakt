import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const alignValues = ['left', 'right'] as const;
const ratioValues = ['1:2', '1:1', '2:1'] as const;

export const mediatext = createContentModelSchema({
	attributes: {
		align: { type: String, required: false, matches: alignValues.slice() },
		ratio: { type: String, required: false, matches: ratioValues.slice() },
		wrap: { type: Boolean, required: false },
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

		const align = attrs.align ?? 'left';
		const ratio = attrs.ratio ?? '1:1';
		const wrap = attrs.wrap ?? false;

		const alignMeta = new Tag('meta', { content: align });
		const ratioMeta = new Tag('meta', { content: ratio });
		const wrapMeta = wrap ? new Tag('meta', { content: 'true' }) : undefined;

		// Separate image paragraphs from body content.
		// Markdown wraps ![img](url) in <p> tags, so we check for paragraphs
		// containing only an image and extract the <img> from them.
		const mediaChildren: any[] = [];
		const bodyChildren: any[] = [];

		for (const node of children.toArray()) {
			if (Markdoc.Tag.isTag(node) && node.name === 'p' &&
				node.children.length === 1 &&
				Markdoc.Tag.isTag(node.children[0]) && node.children[0].name === 'img') {
				mediaChildren.push(node.children[0]);
			} else if (Markdoc.Tag.isTag(node) && node.name === 'img') {
				mediaChildren.push(node);
			} else {
				bodyChildren.push(node);
			}
		}

		const mediaTag = new Tag('div', {}, mediaChildren);
		const bodyTag = new Tag('div', {}, bodyChildren);

		const childNodes: any[] = [alignMeta, ratioMeta];
		if (wrapMeta) childNodes.push(wrapMeta);
		childNodes.push(mediaTag, bodyTag);

		return createComponentRenderable(schema.MediaText, {
			tag: 'div',
			properties: {
				align: alignMeta,
				ratio: ratioMeta,
				...(wrapMeta ? { wrap: wrapMeta } : {}),
			},
			refs: {
				media: mediaTag,
				body: bodyTag,
			},
			children: childNodes,
		});
	},
});
