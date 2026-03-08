import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const layoutValues = ['grid', 'carousel', 'masonry'] as const;
const gapValues = ['none', 'tight', 'default', 'loose'] as const;

class GalleryModel extends Model {
	@attribute({ type: String, required: false, matches: layoutValues.slice() })
	layout: string = 'grid';

	@attribute({ type: Number, required: false })
	columns: number = 3;

	@attribute({ type: Boolean, required: false })
	lightbox: boolean = true;

	@attribute({ type: String, required: false, matches: gapValues.slice() })
	gap: string = 'default';

	@attribute({ type: String, required: false })
	caption: string = '';

	transform() {
		const children = this.transformChildren();

		const images = children.flatten().tag('img').toArray();
		const items = images.map(img => {
			const alt = img.attributes?.alt || '';
			const itemChildren: any[] = [img];
			if (alt) {
				itemChildren.push(new Tag('figcaption', {}, [alt]));
			}
			return new Tag('figure', { 'data-name': 'item' }, itemChildren);
		});

		const layoutMeta = new Tag('meta', { content: this.layout });
		const lightboxMeta = new Tag('meta', { content: String(this.lightbox) });
		const columnsMeta = this.columns !== 3 ? new Tag('meta', { content: String(this.columns) }) : undefined;
		const gapMeta = this.gap !== 'default' ? new Tag('meta', { content: this.gap }) : undefined;

		const captionTag = this.caption
			? new Tag('figcaption', {}, [this.caption])
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
	}
}

export const gallery = createSchema(GalleryModel);
