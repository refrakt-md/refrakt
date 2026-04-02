import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

export const accordionItem = createContentModelSchema({
	attributes: {
		name: { type: String, required: true },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const nameTag = new Tag('summary', {}, [attrs.name ?? '']);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');
		const bodyDivs = body.tag('div');

		// For FAQ schema: body div becomes Answer entity with text property
		// Wrap children in a div with property="text" so the visible content
		// serves as the schema.org property value (no duplicated meta tag)
		for (const node of bodyDivs.nodes) {
			if (Tag.isTag(node)) {
				node.attributes['typeof'] = 'Answer';
				node.children = [new Tag('div', { property: 'text' }, node.children)];
			}
		}

		return createComponentRenderable({ rune: 'accordion-item', schemaOrgType: 'Question',
			tag: 'details',
			properties: {
				name: nameTag,
			},
			refs: {
				body: bodyDivs,
			},
			schema: {
				name: nameTag,
				acceptedAnswer: bodyDivs,
			},
			children: [nameTag, body.next()],
		});
	},
});

export const accordion = createContentModelSchema({
	attributes: {
		multiple: { type: Boolean, required: false, description: 'Allow multiple panels to be open at once' },
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'accordion-item',
		emitAttributes: { name: '$heading' },
		fields: [
			{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
			{ name: 'items', match: 'tag', optional: true, greedy: true },
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
	}),
	transform(resolved, attrs, config) {
		const headerNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		// Combine explicit child tags (preamble items) with emitted section tags
		const allItems = [...asNodes(resolved.items), ...asNodes(resolved.sections)];
		const sectionNodes = new RenderableNodeCursor(
			Markdoc.transform(allItems, config) as RenderableTreeNode[],
		);

		const items = sectionNodes.tag('details').typeof('AccordionItem');
		const itemsContainer = items.wrap('div');

		const children = headerNodes.count() > 0
			? [headerNodes.wrap('header').next(), itemsContainer.next()]
			: [itemsContainer.next()];

		return createComponentRenderable({ rune: 'accordion', schemaOrgType: 'FAQPage',
			tag: 'section',
			property: 'contentSection',
			properties: {
				item: items,
			},
			refs: { ...pageSectionProperties(headerNodes), items: itemsContainer },
			schema: {
				mainEntity: items,
			},
			children,
		});
	},
});
