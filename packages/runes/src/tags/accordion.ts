import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes, stripSchemaOrg } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const accordionItemSections = { body: 'body' } as const;

export const accordionItem = createContentModelSchema({
	sections: accordionItemSections,
	provides: ['prose'],
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

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const accordionSections = { preamble: 'preamble', headline: 'title', blurb: 'description' } as const;

export const accordion = createContentModelSchema({
	sections: accordionSections,
	attributes: {
		multiple: { type: Boolean, required: false, description: 'Allow multiple panels to be open at once' },
		schema: { type: String, required: false, matches: ['none'], description: 'Set to "none" to emit no schema.org markup. Use it when the panels are not a FAQ — a list of definitions, say — so the page does not publish fabricated Question entries. Suppresses the items too, not just the container.' },
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

		// An accordion with neither items nor a header has nothing to show, and
		// the `FAQPage` below would be structured data claiming a page of
		// questions with no questions in it. Render nothing at all.
		//
		// This is reachable now that items can come from a `{% data %}` whose
		// result is legitimately empty (BUG-011) — a shared block wrapping
		// generated items cannot know in advance whether there will be any.
		if (items.count() === 0 && headerNodes.count() === 0) return null;

		// SPEC-130 / WORK-552 — an accordion is not always a FAQ. Strip the whole
		// subtree, not just the root: `accordion-item` declares `Question`
		// independently, and leaving those with no `FAQPage` around them is worse
		// than either consistent state.
		//
		// Done here rather than in a later pass because `extractSeo` reads the
		// transform output; see `stripSchemaOrg`.
		const noSchema = attrs.schema === 'none';
		if (noSchema) stripSchemaOrg(sectionNodes.nodes);

		const children = headerNodes.count() > 0
			? [headerNodes.wrap('header').next(), itemsContainer.next()]
			: [itemsContainer.next()];

		return createComponentRenderable({ rune: 'accordion',
			...(noSchema ? {} : { schemaOrgType: 'FAQPage', schema: { mainEntity: items } }),
			tag: 'section',
			property: 'contentSection',
			properties: {
				item: items,
			},
			refs: { ...pageSectionProperties(headerNodes), items: itemsContainer },
			children,
		});
	},
});
