import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
	fieldMetas,
} from '../lib/index.js';

const variantType = ['sidenote', 'footnote', 'tooltip'] as const;

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const sidenoteSections = { body: 'body' } as const;

export const sidenote = createContentModelSchema({
	sections: sidenoteSections,
	provides: ['prose'],
	attributes: {
		variant: {
			type: String,
			required: false,
			matches: variantType.slice(),
			description: 'Display style: sidenote, footnote, or tooltip',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const body = renderNodes(resolved.body, config);
		const bodyDiv = body.wrap('div');

		return createComponentRenderable({
			rune: 'sidenote',
			tag: 'aside',
			properties: fieldMetas(attrs, config, {
				variant: 'sidenote',
			}),
			refs: {
				body: bodyDiv,
			},
			children: [bodyDiv.next()],
		});
	},
});
