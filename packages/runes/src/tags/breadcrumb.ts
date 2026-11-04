import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, renderNodes } from '../lib/index.js';

export const BREADCRUMB_AUTO_SENTINEL = '__breadcrumb-auto';

export const breadcrumbSchema = {
	type: 'BreadcrumbList',
	lists: ['itemListElement'],
	children: {
		'breadcrumb-item': {
			type: 'ListItem',
			property: 'itemListElement',
			properties: { name: 'name', url: 'item' },
			generated: { position: 'index' },
		},
	},
} as const;

export const breadcrumb = createContentModelSchema({
	schema: breadcrumbSchema,
	attributes: {
		separator: {
			type: String,
			required: false,
			default: '/',
			description: 'Character between breadcrumb items',
		},
		auto: {
			type: Boolean,
			required: false,
			default: false,
			description: 'Automatically generate from page hierarchy',
		},
	},
	contentModel: (attrs) => {
		if (attrs.auto) {
			return { type: 'sequence' as const, fields: [] };
		}
		return {
			type: 'sequence' as const,
			fields: [{ name: 'list', match: 'list' as const, optional: true, greedy: true }],
		};
	},
	transform(resolved, attrs, config) {
		const separatorMeta = new Tag('meta', { content: attrs.separator });

		if (attrs.auto) {
			const sentinelMeta = new Tag('meta', {
				'data-field': BREADCRUMB_AUTO_SENTINEL,
				content: 'true',
			});
			const emptyList = new Tag('ol', {}, []);

			return createComponentRenderable({
				rune: 'breadcrumb',
				tag: 'nav',
				properties: {
					separator: separatorMeta,
				},
				refs: {
					items: emptyList,
				},
				children: [sentinelMeta, emptyList],
			});
		}

		const children = renderNodes(resolved.list, config);

		const listItems: any[] = [];
		for (const node of children.toArray()) {
			if (Tag.isTag(node) && (node.name === 'ul' || node.name === 'ol')) {
				for (const li of (node as any).children) {
					if (Tag.isTag(li) && li.name === 'li') {
						const link = (li as any).children.find((c: any) => Tag.isTag(c) && c.name === 'a');

						if (link) {
							const nameSpan = new Tag('span', { hidden: true }, link.children);
							const urlLink = new Tag('a', { href: link.attributes.href }, link.children);

							listItems.push(
								createComponentRenderable({
									rune: 'breadcrumb-item',
									tag: 'li',
									properties: {
										name: nameSpan,
										url: urlLink,
									},
									children: [nameSpan, urlLink],
								}) as any,
							);
						} else {
							const text = li.children
								.filter((c: any) => typeof c === 'string')
								.join('')
								.trim();
							const nameSpan = new Tag('span', {}, text ? [text] : li.children);

							listItems.push(
								createComponentRenderable({
									rune: 'breadcrumb-item',
									tag: 'li',
									properties: {
										name: nameSpan,
									},
									children: [nameSpan],
								}) as any,
							);
						}
					}
				}
			}
		}

		const itemsList = new Tag('ol', {}, listItems);

		return createComponentRenderable({
			rune: 'breadcrumb',
			tag: 'nav',
			properties: {
				separator: separatorMeta,
			},
			refs: {
				items: itemsList,
			},
			children: [itemsList],
		});
	},
});
