import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

/** Sentinel meta property written by breadcrumb auto mode; consumed by corePipelineHooks.postProcess */
export const BREADCRUMB_AUTO_SENTINEL = '__breadcrumb-auto';

export const breadcrumb = createContentModelSchema({
	attributes: {
		separator: { type: String, required: false, default: '/' },
		auto: { type: Boolean, required: false, default: false },
	},
	contentModel: (attrs) => {
		if (attrs.auto) {
			return { type: 'sequence' as const, fields: [] };
		}
		return {
			type: 'sequence' as const,
			fields: [
				{ name: 'list', match: 'list' as const, optional: true, greedy: true },
			],
		};
	},
	transform(resolved, attrs, config) {
		const separatorMeta = new Tag('meta', { content: attrs.separator });

		if (attrs.auto) {
			// Emit a placeholder with an empty items list and a sentinel meta tag.
			// The core post-process hook will replace the empty ol with resolved items.
			const sentinelMeta = new Tag('meta', { 'data-field': BREADCRUMB_AUTO_SENTINEL, content: 'true' });
			const emptyList = new Tag('ol', {}, []);

			return createComponentRenderable(schema.Breadcrumb, {
				tag: 'nav',
				properties: {
					separator: separatorMeta,
				},
				refs: {
					items: emptyList,
				},
				children: [separatorMeta, sentinelMeta, emptyList],
			});
		}

		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.list), config) as RenderableTreeNode[],
		);

		// Extract list items from children — each <li> with an <a> becomes a breadcrumb item
		const listItems: any[] = [];
		let position = 0;
		for (const node of children.toArray()) {
			if (Tag.isTag(node) && (node.name === 'ul' || node.name === 'ol')) {
				for (const li of (node as any).children) {
					if (Tag.isTag(li) && li.name === 'li') {
						position++;
						const positionMeta = new Tag('meta', { content: position });

						// Find the link inside the list item
						const link = (li as any).children.find(
							(c: any) => Tag.isTag(c) && c.name === 'a'
						);

						if (link) {
							const nameSpan = new Tag('span', { hidden: true }, link.children);
							const urlLink = new Tag('a', { href: link.attributes.href }, link.children);

							listItems.push(
								createComponentRenderable(schema.BreadcrumbItem, {
									tag: 'li',
									properties: {
										name: nameSpan,
										url: urlLink,
									},
									schema: {
										name: nameSpan,
										item: urlLink,
										position: positionMeta,
									},
									children: [nameSpan, urlLink, positionMeta],
								}) as any
							);
						} else {
							// Last item (no link) — current page
							const text = li.children.filter((c: any) => typeof c === 'string').join('').trim();
							const nameSpan = new Tag('span', {}, text ? [text] : li.children);

							listItems.push(
								createComponentRenderable(schema.BreadcrumbItem, {
									tag: 'li',
									properties: {
										name: nameSpan,
									},
									schema: {
										name: nameSpan,
										position: positionMeta,
									},
									children: [nameSpan, positionMeta],
								}) as any
							);
						}
					}
				}
			}
		}

		const itemsList = new Tag('ol', {}, listItems);

		return createComponentRenderable(schema.Breadcrumb, {
			tag: 'nav',
			properties: {
				separator: separatorMeta,
			},
			refs: {
				items: itemsList,
			},
			schema: {
				itemListElement: listItems,
			},
			children: [separatorMeta, itemsList],
		});
	},
});
