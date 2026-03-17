import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const shadowValues = ['none', 'soft', 'hard', 'elevated'] as const;
const bleedValues = ['none', 'top', 'bottom', 'both', 'end', 'bottom-end', 'top-end'] as const;

export const showcase = createContentModelSchema({
	attributes: {
		shadow: { type: String, required: false, matches: shadowValues.slice(), description: 'Shadow style around the showcase content' },
		bleed: { type: String, required: false, matches: bleedValues.slice(), description: 'Direction content extends beyond its container' },
		offset: { type: String, required: false, description: 'CSS offset from the container edge' },
		aspect: { type: String, required: false, description: 'Aspect ratio of the showcase area' },
		place: { type: String, required: false, matches: [
			'left', 'center', 'right', 'top', 'bottom',
			'top left', 'top center', 'top right',
			'bottom left', 'bottom center', 'bottom right',
		], description: 'Position of content within the showcase area' },
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

		const shadow = attrs.shadow ?? 'none';
		const bleed = attrs.bleed ?? 'none';
		const offset = attrs.offset ?? '';
		const aspect = attrs.aspect ?? '';
		const place = attrs.place ?? '';

		const properties: Record<string, any> = {};
		const childNodes: any[] = [];

		if (shadow && shadow !== 'none') {
			const meta = new Tag('meta', { content: shadow });
			properties.shadow = meta;
			childNodes.push(meta);
		}

		if (bleed && bleed !== 'none') {
			const meta = new Tag('meta', { content: bleed });
			properties.bleed = meta;
			childNodes.push(meta);
		}

		if (offset) {
			const meta = new Tag('meta', { content: offset });
			properties.offset = meta;
			childNodes.push(meta);
		}

		if (aspect) {
			const meta = new Tag('meta', { content: aspect });
			properties.aspect = meta;
			childNodes.push(meta);
		}

		if (place) {
			const meta = new Tag('meta', { content: place });
			properties.place = meta;
			childNodes.push(meta);
		}

		const viewport = new Tag('div', {}, children.toArray());

		childNodes.push(viewport);

		return createComponentRenderable(schema.Showcase, {
			tag: 'div',
			properties,
			refs: {
				viewport,
			},
			children: childNodes,
		});
	},
});
