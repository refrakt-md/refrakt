import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	asNodes,
	RenderableNodeCursor,
	pageSectionProperties,
} from '@refrakt-md/runes';

// SPEC-130 / WORK-568 — Group B, the flat half of the pair. The entry declares
// what it says about itself; `timelineSchema` below declares the property that
// holds it and the position it sits at, because only the parent knows an index.
//
// `description` for the date is what shipped, recorded in the baseline. It is a
// stretch — `ListItem` has no date property, and `startDate` would need a
// different `@type` — but reproducing it exactly was that item's job; changing
// the claim is not.
export const timelineEntrySchema = {
	type: 'ListItem',
	properties: { label: 'name', date: 'description' },
} as const;

export const timelineEntry = createContentModelSchema({
	schema: timelineEntrySchema,
	attributes: {
		date: {
			type: String,
			required: false,
			description: 'Date or time shown on this entry (e.g. "2024-03", "Q1 2025").',
		},
		label: {
			type: String,
			required: false,
			description: 'Short title or milestone name for the entry.',
		},
	},
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
	},
	transform(resolved, attrs, config) {
		const dateTag = new Tag('time', {}, [attrs.date ?? '']);
		const labelTag = new Tag('span', {}, [attrs.label ?? '']);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');

		return createComponentRenderable({
			rune: 'timeline-entry',
			tag: 'li',
			refs: {
				date: dateTag,
				label: labelTag,
				body: body.tag('div'),
			},
			children: [dateTag, labelTag, body.next()],
		});
	},
});

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const timelineSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
} as const;

// SPEC-130 / WORK-571 — the other half of `position: 'index'`. `timeline` used
// to walk its entries and push a `<meta property="position">` into each; the
// index is now declared and the applier generates it, as `String(index + 1)` so
// the RDFa and the JSON-LD agree.
//
// `itemListElement` is a declared list, so a one-entry timeline emits an array
// like any other (D6). The `ItemList` itself carries no properties of its own —
// that is what shipped, and the entries keep it from being a bare entity (D4).
export const timelineSchema = {
	type: 'ItemList',
	lists: ['itemListElement'],
	children: {
		'timeline-entry': {
			type: 'ListItem',
			property: 'itemListElement',
			generated: { position: 'index' },
		},
	},
} as const;

export const timeline = createContentModelSchema({
	schema: timelineSchema,
	sections: timelineSections,
	attributes: {
		direction: {
			type: String,
			required: false,
			description: 'Axis along which entries are laid out (vertical or horizontal).',
		},
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'timeline-entry',
		emitAttributes: { date: '$date', label: '$label' },
		headingExtract: {
			fields: [
				{ name: 'date', match: 'text' as const, pattern: /^(.+?)\s*[-–—:]\s*/, optional: true },
				{ name: 'label', match: 'text' as const, pattern: 'remainder' as const },
			],
		},
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
		const directionMeta = new Tag('meta', { content: attrs.direction ?? 'vertical' });

		const items = sectionNodes.tag('li').typeof('TimelineEntry');

		const entriesList = new Tag('ol', {}, items.toArray());

		const children: any[] = [directionMeta];
		if (headerNodes.count() > 0) {
			children.push(headerNodes.wrap('header').next());
		}
		children.push(entriesList);

		return createComponentRenderable({
			rune: 'timeline',
			tag: 'section',
			property: 'contentSection',
			properties: {
				direction: directionMeta,
				entry: items,
			},
			refs: { ...pageSectionProperties(headerNodes), entries: entriesList },
			children,
		});
	},
});
