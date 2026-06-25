import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { isMediaNode } from './common.js';
import { LAYOUT, layoutMatches } from '../layout-vocabulary.js';

export const gallery = createContentModelSchema({
	attributes: {
		// `grid` + `carousel` from the canonical const (ADR-018); `masonry` stays local.
		layout: { type: String, required: false, matches: layoutMatches([LAYOUT.grid, LAYOUT.carousel], 'masonry'), description: 'Arrangement of images in the gallery' },
		columns: { type: Number, required: false, description: 'Number of columns in grid layout' },
		lightbox: { type: Boolean, required: false, description: 'Allow clicking images to view full-size' },
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
		const caption = attrs.caption ?? '';

		// An image is an <img> or a scheme-resolved <svg> (placeholder:/icon:).
		const images = children.flatten().toArray().filter(n => isMediaNode(n)) as InstanceType<typeof Tag>[];
		const items = images.map(img => {
			// scheme svgs carry the label as aria-label rather than alt.
			const alt = img.attributes?.alt || img.attributes?.['aria-label'] || '';
			const itemChildren: any[] = [img];
			if (alt) {
				itemChildren.push(new Tag('figcaption', {}, [alt]));
			}
			return new Tag('figure', { 'data-name': 'item' }, itemChildren);
		});

		const layoutMeta = new Tag('meta', { content: layout });
		const lightboxMeta = new Tag('meta', { content: String(lightbox) });
		const columnsMeta = columns !== 3 ? new Tag('meta', { content: String(columns) }) : undefined;

		const captionTag = caption
			? new Tag('figcaption', {}, [caption])
			: undefined;

		const itemsContainer = new Tag('div', { 'data-name': 'items' }, items);

		const metas: any[] = [layoutMeta, lightboxMeta, columnsMeta].filter(Boolean);
		const childNodes: any[] = [...metas, itemsContainer];
		if (captionTag) childNodes.push(captionTag);

		return createComponentRenderable({ rune: 'gallery', schemaOrgType: 'ImageGallery',
			tag: 'figure',
			properties: {
				layout: layoutMeta,
				lightbox: lightboxMeta,
				...(columnsMeta ? { columns: columnsMeta } : {}),
				...(captionTag ? { caption: captionTag } : {}),
			},
			children: childNodes,
		});
	},
});
