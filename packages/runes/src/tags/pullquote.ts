import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const alignValues = ['left', 'center', 'right'] as const;
const variantValues = ['default', 'accent', 'editorial'] as const;

export const pullquote = createContentModelSchema({
	attributes: {
		align: { type: String, required: false, matches: alignValues.slice(), description: 'Text alignment of the quote' },
		variant: { type: String, required: false, matches: variantValues.slice(), description: 'Visual style of the quote block' },
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

		const alignMeta = new Tag('meta', { content: attrs.align ?? 'center' });
		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'default' });

		// Extract blockquote or use all children as the quote text
		const blockquote = children.tag('blockquote');
		const quoteChildren = blockquote.count() > 0
			? blockquote.limit(1).toArray()
			: children.tag('p').toArray();

		const childNodes: any[] = [...quoteChildren, alignMeta, variantMeta];

		return createComponentRenderable({ rune: 'pull-quote',
			tag: 'blockquote',
			properties: {
				align: alignMeta,
				variant: variantMeta,
			},
			children: childNodes,
		});
	},
});
