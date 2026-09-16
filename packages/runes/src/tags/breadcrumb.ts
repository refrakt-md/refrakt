import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

/** Sentinel meta property written by breadcrumb auto mode; consumed by corePipelineHooks.postProcess */
export const BREADCRUMB_AUTO_SENTINEL = '__breadcrumb-auto';

/**
 * SPEC-130 / WORK-571 — `breadcrumb` and `breadcrumb-item` as one declaration.
 *
 * The pair could not migrate separately: a position exists nowhere in the
 * content, so it has to be generated, and only the parent knows a child's index.
 * `generated: { position: 'index' }` is the whole vocabulary — `index` is the
 * only generator in the codebase, used by exactly two runes.
 *
 * The generator emits `String(index + 1)`, so the RDFa attribute and the JSON-LD
 * now agree on `position`. Before this the meta carried a *number*, which
 * `collectJsonLd` passed through verbatim while the rendered markup stringified
 * it — a drift the two-point invariant would otherwise have to tolerate (D8).
 */
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
			// Emit a placeholder with an empty items list and a sentinel meta tag.
			// The core post-process hook will replace the empty ol with resolved items.
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
				children: [separatorMeta, sentinelMeta, emptyList],
			});
		}

		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.list), config) as RenderableTreeNode[],
		);

		// Extract list items from children — each <li> with an <a> becomes a breadcrumb item
		const listItems: any[] = [];
		for (const node of children.toArray()) {
			if (Tag.isTag(node) && (node.name === 'ul' || node.name === 'ol')) {
				for (const li of (node as any).children) {
					if (Tag.isTag(li) && li.name === 'li') {
						// Find the link inside the list item
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
							// Last item (no link) — current page
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
			children: [separatorMeta, itemsList],
		});
	},
});
