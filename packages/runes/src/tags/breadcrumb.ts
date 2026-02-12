import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class BreadcrumbModel extends Model {
	@attribute({ type: String, required: false })
	separator: string = '/';

	transform(): RenderableTreeNodes {
		const separatorMeta = new Tag('meta', { content: this.separator });
		const children = this.transformChildren();

		// Extract list items from children — each <li> with an <a> becomes a breadcrumb item
		const listItems: any[] = [];
		for (const node of children.toArray()) {
			if (Tag.isTag(node) && (node.name === 'ul' || node.name === 'ol')) {
				for (const li of (node as any).children) {
					if (Tag.isTag(li) && li.name === 'li') {
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
									children: [nameSpan, urlLink],
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
									children: [nameSpan],
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
			children: [separatorMeta, itemsList],
		});
	}
}

export const breadcrumb = createSchema(BreadcrumbModel);
