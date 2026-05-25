import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';

/**
 * `article-card` (SPEC-070) — the reference plain-presentational card rune.
 *
 * Takes ordinary attributes (title, href, image, date, excerpt) and knows
 * nothing about `$item`, the registry, or collection. Usable standalone with
 * hand-authored attributes, or fed by a collection body template that maps
 * entity fields into these attributes:
 *
 *   {% article-card title=$item.data.title href=$item.url date=$item.data.date /%}
 */
export const articleCard = createContentModelSchema({
	attributes: {
		title: { type: String, required: false, default: '' },
		href: { type: String, required: false, default: '' },
		image: { type: String, required: false, default: '' },
		date: { type: String, required: false, default: '' },
		excerpt: { type: String, required: false, default: '' },
	},
	selfClosing: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const title = String(attrs.title ?? '');
		const href = String(attrs.href ?? '');
		const children: InstanceType<typeof Tag>[] = [];
		const refs: Record<string, InstanceType<typeof Tag>> = {};

		if (attrs.image) {
			const img = new Tag('img', { src: String(attrs.image), alt: title });
			refs.image = img;
			children.push(img);
		}

		const titleNode = href
			? new Tag('a', { href }, [title])
			: new Tag('span', {}, [title]);
		refs.title = titleNode;
		children.push(titleNode);

		if (attrs.date) {
			const time = new Tag('time', { datetime: String(attrs.date) }, [String(attrs.date)]);
			refs.date = time;
			children.push(time);
		}

		if (attrs.excerpt) {
			const p = new Tag('p', {}, [String(attrs.excerpt)]);
			refs.excerpt = p;
			children.push(p);
		}

		return createComponentRenderable({
			rune: 'article-card',
			tag: 'article',
			properties: {},
			refs,
			children,
		});
	},
});
