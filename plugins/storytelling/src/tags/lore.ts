import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '@refrakt-md/runes';
import { taxonomyAttributes } from './common.js';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const loreSections = { title: 'title', body: 'body' } as const;

// SPEC-130 / WORK-568 — Group B.
export const loreSchema = {
	type: 'Article',
	properties: { title: 'headline', category: 'articleSection' },
} as const;

export const lore = createContentModelSchema({
	schema: loreSchema,
	sections: loreSections,
	provides: ['prose'],
	base: taxonomyAttributes,
	attributes: {
		title: { type: String, required: true, description: 'Heading displayed for this lore entry.' },
		category: {
			type: String,
			required: false,
			description: 'Grouping label used to organize lore entries (e.g. history, magic, culture).',
		},
		spoiler: {
			type: Boolean,
			required: false,
			description: 'Enable/disable spoiler protection that hides content until revealed.',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const titleTag = new Tag('span', {}, [attrs.title ?? '']);
		const categoryMeta = new Tag('meta', { content: attrs.category ?? '' });
		const spoilerMeta = new Tag('meta', { content: String(attrs.spoiler ?? false) });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });
		const body = renderNodes(resolved.body, config).wrap('div');

		return createComponentRenderable({
			rune: 'lore',
			tag: 'article',
			property: 'contentSection',
			properties: {
				category: categoryMeta,
				spoiler: spoilerMeta,
				tags: tagsMeta,
			},
			refs: {
				title: titleTag,
				body: body.tag('div'),
			},
			children: [titleTag, body.next()],
		});
	},
});
