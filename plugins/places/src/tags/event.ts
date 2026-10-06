import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	asNodes,
	renderNodes,
	RenderableNodeCursor,
	pageSectionProperties,
	unwrapParagraphImages,
	fieldMetas,
} from '@refrakt-md/runes';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const eventSections = { headline: 'title', blurb: 'description', body: 'body' } as const;

// SPEC-130 / WORK-565 — the rune's schema.org mapping, as data.
//
// `location` is the case that makes `event` the second proof: its source exists
// only as an attribute value, so the applier rebuilds a carrier from the field
// bag rather than stamping a node. `headline` / `blurb` come from
// `pageSectionProperties` and survive as refs, so those stamp in place. One
// table, three of the mechanism's resolution paths.
export const eventSchema = {
	type: 'Event',
	properties: {
		headline: 'name',
		blurb: 'description',
		date: 'startDate',
		endDate: 'endDate',
		url: 'url',
	},
	entities: {
		location: { type: 'Place', property: 'location', properties: { location: 'name' } },
	},
} as const;

export const event = createContentModelSchema({
	schema: eventSchema,
	sections: eventSections,
	provides: ['prose'],
	attributes: {
		date: {
			type: String,
			required: false,
			description: 'Start date of the event (e.g. 2025-06-15).',
		},
		endDate: { type: String, required: false, description: 'End date for multi-day events.' },
		location: {
			type: String,
			required: false,
			description: 'Venue or place name where the event is held.',
		},
		url: { type: String, required: false, description: 'Link to the event page or ticket source.' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'header', match: 'heading|paragraph|image', greedy: true },
			{ name: 'body', match: 'list|blockquote|tag', greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		// Unwrap Markdoc's `<p>` around a leading banner image so it sits bare in
		// the header (and so `pageSectionProperties`' top-level `img` lookup finds
		// it).
		const header = new RenderableNodeCursor(
			unwrapParagraphImages(
				Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
			),
		);
		const body = renderNodes(resolved.body, config);

		const sectionProps = pageSectionProperties(header);

		const bodyDiv = body.wrap('div');

		// SPEC-081: emit flat `data-name` header slots — `layout` wraps
		// eyebrow/headline/blurb in the preamble <header>, so each is
		// individually addressable (fixes the buried-preamble bug).
		const resultChildren: any[] = [...header.toArray(), bodyDiv.next()];

		return createComponentRenderable({
			rune: 'event',
			tag: 'article',
			property: 'contentSection',
			properties: fieldMetas(attrs, config, {
				date: '',
				endDate: '',
				location: '',
				url: '',
			}),
			refs: {
				...sectionProps,
				body: bodyDiv,
			},
			children: resultChildren,
		});
	},
});
