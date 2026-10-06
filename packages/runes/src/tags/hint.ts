import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '../lib/index.js';

const hintType = ['caution', 'check', 'note', 'warning'] as const;

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const hintSections = { header: 'header' } as const;

export const hint = createContentModelSchema({
	sections: hintSections,
	attributes: {
		type: {
			type: String,
			matches: hintType.slice(),
			errorLevel: 'critical',
			description: 'Visual style: caution, check, note, or warning',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const hintType = new Tag('meta', { content: attrs.type ?? 'note' });
		const body = renderNodes(resolved.body, config);
		const bodyDiv = body.wrap('div');

		return createComponentRenderable({
			rune: 'hint',
			tag: 'section',
			property: 'contentSection',
			properties: {
				hintType,
			},
			refs: {
				body: bodyDiv.tag('div'),
			},
			children: [bodyDiv.next()],
		});
	},
});
