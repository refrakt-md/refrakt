import type { Node } from '@markdoc/markdoc';
import {
	buildActions,
	createContentModelSchema,
	createComponentRenderable,
	renderNodes,
	pageSectionProperties,
} from '@refrakt-md/runes';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const ctaSections = {
	preamble: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'title',
	blurb: 'description',
} as const;

export const cta = createContentModelSchema({
	sections: ctaSections,
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
			{ name: 'actions', match: 'list|fence', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const header = renderNodes(resolved.header, config);

		// SPEC-160 D6 — the actions region is the `actions` rune, nested. It
		// keeps `data-name="actions"`, so `rf-cta__actions` survives beside
		// `rf-actions`, and names its own items `action` and `command`.
		const actionNodes = (
			Array.isArray(resolved.actions)
				? resolved.actions
				: resolved.actions
					? [resolved.actions]
					: []
		) as Node[];
		const actions = buildActions(actionNodes, config);

		return createComponentRenderable({
			rune: 'call-to-action',
			tag: 'section',
			class: attrs.class,
			properties: {},
			refs: {
				...pageSectionProperties(header),
				actions,
				body: header.wrap('div'),
			},
			children: [header.wrap('header').next(), actions],
		});
	},
});
