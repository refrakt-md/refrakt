import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '../lib/index.js';
import { isMediaNode } from './common.js';
import { LAYOUT, layoutMatches } from '../layout-vocabulary.js';

export const gallery = createContentModelSchema({
	attributes: {
		layout: {
			type: String,
			required: false,
			matches: layoutMatches([LAYOUT.grid, LAYOUT.carousel], 'masonry'),
			description: 'Arrangement of images in the gallery',
		},
		columns: { type: Number, required: false, description: 'Number of columns in grid layout' },
		lightbox: {
			type: Boolean,
			required: false,
			description: 'Allow clicking images to view full-size',
		},
		caption: {
			type: String,
			required: false,
			description: 'Caption text displayed below the gallery',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const children = renderNodes(resolved.body, config);

		const layout = attrs.layout ?? 'grid';
		const columns = attrs.columns ?? 3;
		const lightbox = attrs.lightbox ?? true;
		const caption = attrs.caption ?? '';

		const images = children
			.flatten()
			.toArray()
			.filter((n) => isMediaNode(n)) as InstanceType<typeof Tag>[];
		const items = images.map((img) => {
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

		const captionTag = caption ? new Tag('figcaption', {}, [caption]) : undefined;

		const itemsContainer = new Tag('div', { 'data-name': 'items' }, items);

		const childNodes: any[] = [itemsContainer];
		if (captionTag) childNodes.push(captionTag);

		return createComponentRenderable({
			rune: 'gallery',
			tag: 'figure',
			properties: {
				layout: layoutMeta,
				lightbox: lightboxMeta,
				columns: columnsMeta,
				caption: captionTag,
			},
			children: childNodes,
		});
	},
});
