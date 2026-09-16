import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	asNodes,
	stripSchemaOrg,
} from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const accordionItemSections = { body: 'body' } as const;

/**
 * SPEC-130 / WORK-570 — retype and wrap, declared.
 *
 * The body `<div>` becomes the `Answer`, and its content becomes that answer's
 * `text`. The rune used to do both by hand: set `typeof` on a node it did not
 * create, then wrap its children in a `<div property="text">`.
 *
 * **The wrapper is conformant, not a workaround, and must not be optimised
 * away.** RDFa Core 1.1 §7.5 step 11 resolves a property's object as `@content`
 * → literal; else `@typeof` present and `@about` absent → *the typed resource*;
 * else a plain literal from the text. So an element carrying both `property` and
 * `typeof` has its object fixed to the typed resource and its own text is
 * unreachable as a literal. Drop the inner element and
 * `_:a text "…"` disappears from the RDFa — while `collectJsonLd`, which is not
 * a conformant distiller, would go on emitting it. Since SPEC-082 renders the
 * SEO carriers inline, refrakt publishes both channels on the same page, so the
 * two would assert different graphs on every accordion.
 *
 * What was wrong was that the rune hand-wrote it. `text:` moves the wrapping
 * into the applier and leaves the rune declaring only the role.
 */
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
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
	},
	transform(resolved, attrs, config) {
		const nameTag = new Tag('summary', {}, [attrs.name ?? '']);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');
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

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const accordionSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
} as const;

/**
 * SPEC-130 / WORK-570 — the container, declared beside the item it holds.
 *
 * `schema="none"` (WORK-552) is the author-side out for an accordion that is not
 * a FAQ, and its relationship to this table is now visible in one place: the
 * applier honours the attribute and suppresses the whole subtree, so the
 * emission and the suppression are no longer two unrelated pieces of code.
 *
 * Deliberately **no `lists: ['mainEntity']`**. D6 would be defensible here, but
 * this item's whole evidence is a byte-identical diff, and declaring a list
 * changes a one-question accordion's JSON-LD from an object to an array. That is
 * a separate, deliberate change rather than a side effect of a refactor.
 */
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

		const children =
			headerNodes.count() > 0
				? [headerNodes.wrap('header').next(), itemsContainer.next()]
				: [itemsContainer.next()];

		return createComponentRenderable({
			rune: 'accordion',
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
