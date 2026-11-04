import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	bodyOnly,
	asNodes,
	renderNodes,
	stripSchemaOrg,
} from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

export const accordionItemSections = { body: 'body' } as const;

export const accordionItemSchema = {
	type: 'Question',
	properties: { name: 'name' },
	children: {
		body: { type: 'Answer', property: 'acceptedAnswer', text: { body: 'text' } },
	},
} as const;

export const accordionItem = createContentModelSchema({
	schema: accordionItemSchema,
	sections: accordionItemSections,
	provides: ['prose'],
	attributes: {
		name: { type: String, required: true },
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const nameTag = new Tag('summary', {}, [attrs.name ?? '']);
		const body = renderNodes(resolved.body, config).wrap('div');
		const bodyDivs = body.tag('div');

		return createComponentRenderable({
			rune: 'accordion-item',
			tag: 'details',
			properties: {
				name: nameTag,
			},
			refs: {
				body: bodyDivs,
			},
			children: [nameTag, body.next()],
		});
	},
});

export const accordionSections = {
	preamble: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'title',
	blurb: 'description',
} as const;

export const accordionSchema = {
	type: 'FAQPage',
	children: { 'accordion-item': { type: 'Question', property: 'mainEntity' } },
} as const;

export const accordion = createContentModelSchema({
	schema: accordionSchema,
	sections: accordionSections,
	attributes: {
		multiple: {
			type: Boolean,
			required: false,
			description: 'Allow multiple panels to be open at once',
		},
		schema: {
			type: String,
			required: false,
			matches: ['none'],
			description:
				'Set to "none" to emit no schema.org markup. Use it when the panels are not a FAQ — a list of definitions, say — so the page does not publish fabricated Question entries. Suppresses the items too, not just the container.',
		},
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
		const headerNodes = renderNodes(resolved.header, config);
		const allItems = [...asNodes(resolved.items), ...asNodes(resolved.sections)];
		const sectionNodes = new RenderableNodeCursor(
			Markdoc.transform(allItems, config) as RenderableTreeNode[],
		);

		const items = sectionNodes.tag('details').typeof('AccordionItem');
		const itemsContainer = items.wrap('div');

		if (items.count() === 0 && headerNodes.count() === 0) return null;

		// Stripped here, not in a later pass: `extractSeo` reads this output.
		const noSchema = attrs.schema === 'none';
		if (noSchema) stripSchemaOrg(sectionNodes.nodes);

		const children =
			headerNodes.count() > 0
				? [headerNodes.wrap('header').next(), itemsContainer.next()]
				: [itemsContainer.next()];

		return createComponentRenderable({
			rune: 'accordion',
			tag: 'section',
			properties: {
				item: items,
			},
			refs: { ...pageSectionProperties(headerNodes), items: itemsContainer },
			children,
		});
	},
});
