import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

/** Sentinel meta property written by breadcrumb auto mode; consumed by corePipelineHooks.postProcess */
export const BREADCRUMB_AUTO_SENTINEL = '__breadcrumb-auto';

class BreadcrumbModel extends Model {
	@attribute({ type: String, required: false })
	separator: string = '/';

	/**
	 * When true, emit a placeholder that the cross-page pipeline will resolve
	 * into a fully populated breadcrumb using the site's page hierarchy.
	 * The rune content is ignored in auto mode.
	 */
	@attribute({ type: Boolean, required: false })
	auto: boolean = false;

	transform(): RenderableTreeNodes {
		const separatorMeta = new Tag('meta', { content: this.separator });

		if (this.auto) {
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

		const children = this.transformChildren();

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
	}
}

export const breadcrumb = createSchema(BreadcrumbModel);
