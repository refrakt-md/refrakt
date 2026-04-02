import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createComponentRenderable, createContentModelSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

function tagText(nodes: any[]): string {
	return nodes.map((n: any) => {
		if (typeof n === 'string') return n;
		if (Tag.isTag(n)) return tagText(n.children);
		return '';
	}).join('').trim();
}

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
		const bodyNode = bodyDivs.nodes[0];
		const answerText = Tag.isTag(bodyNode) ? tagText(bodyNode.children) : '';
		const textMeta = new Tag('meta', { content: answerText });

		for (const node of bodyDivs.nodes) {
			if (Tag.isTag(node)) {
				node.attributes['typeof'] = 'Answer';
				node.children.push(textMeta);
			}
		}

		return createComponentRenderable(schema.AccordionItem, {
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
				text: textMeta,
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

		return createComponentRenderable(schema.Accordion, {
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
