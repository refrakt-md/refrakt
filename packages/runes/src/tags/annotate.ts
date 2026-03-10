import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

export const annotateNote = createContentModelSchema({
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');

		return createComponentRenderable(schema.AnnotateNote, {
			tag: 'aside',
			properties: {},
			refs: {
				body: body.tag('div'),
			},
			children: [body.next()],
		});
	},
});

const variantType = ['margin', 'tooltip', 'inline'] as const;

export const annotate = createContentModelSchema({
	attributes: {
		variant: { type: String, required: false, matches: variantType.slice() },
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
		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'margin' });

		const notes = children.tag('aside').typeof('AnnotateNote');
		const body = children.wrap('div');

		return createComponentRenderable(schema.Annotate, {
			tag: 'div',
			properties: {
				note: notes,
				variant: variantMeta,
			},
			refs: { body: body.tag('div') },
			children: [variantMeta, body.next()],
		});
	},
});
