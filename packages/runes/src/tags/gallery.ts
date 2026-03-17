import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const layoutValues = ['grid', 'carousel', 'masonry'] as const;
const gapValues = ['none', 'tight', 'default', 'loose'] as const;

export const gallery = createContentModelSchema({
	attributes: {
		layout: { type: String, required: false, matches: layoutValues.slice(), description: 'Arrangement of images in the gallery' },
		columns: { type: Number, required: false, description: 'Number of columns in grid layout' },
		lightbox: { type: Boolean, required: false, description: 'Allow clicking images to view full-size' },
		gap: { type: String, required: false, matches: gapValues.slice(), description: 'Space between gallery items' },
		caption: { type: String, required: false, description: 'Caption text displayed below the gallery' },
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

		const layout = attrs.layout ?? 'grid';
		const columns = attrs.columns ?? 3;
		const lightbox = attrs.lightbox ?? true;
		const gap = attrs.gap ?? 'default';
		const caption = attrs.caption ?? '';

		const images = children.flatten().tag('img').toArray();
		const items = images.map(img => {
			const alt = img.attributes?.alt || '';
			const itemChildren: any[] = [img];
			if (alt) {
				itemChildren.push(new Tag('figcaption', {}, [alt]));
			}
			return new Tag('figure', { 'data-name': 'item' }, itemChildren);
		});

		const layoutMeta = new Tag('meta', { content: layout });
		const lightboxMeta = new Tag('meta', { content: String(lightbox) });
		const columnsMeta = columns !== 3 ? new Tag('meta', { content: String(columns) }) : undefined;
		const gapMeta = gap !== 'default' ? new Tag('meta', { content: gap }) : undefined;

		const captionTag = caption
			? new Tag('figcaption', {}, [caption])
			: undefined;

		const itemsContainer = new Tag('div', { 'data-name': 'items' }, items);

		const metas: any[] = [layoutMeta, lightboxMeta, columnsMeta, gapMeta].filter(Boolean);
		const childNodes: any[] = [...metas, itemsContainer];
		if (captionTag) childNodes.push(captionTag);

		return createComponentRenderable(schema.Gallery, {
			tag: 'figure',
			properties: {
				layout: layoutMeta,
				lightbox: lightboxMeta,
				...(columnsMeta ? { columns: columnsMeta } : {}),
				...(gapMeta ? { gap: gapMeta } : {}),
				...(captionTag ? { caption: captionTag } : {}),
			},
			children: childNodes,
		});
	},
});
