import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '../lib/index.js';

export const annotateNote = createContentModelSchema({
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const body = renderNodes(resolved.body, config).wrap('div');

		return createComponentRenderable({
			rune: 'annotate-note',
			tag: 'aside',
			properties: {},
			refs: {
				body: body.tag('div'),
			},
			children: [body.next()],
		});
	},
});

const variantType = ['margin', 'tooltip', 'inline'] as const;

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const annotateSections = { body: 'body' } as const;

export const annotate = createContentModelSchema({
	sections: annotateSections,
	provides: ['prose'],
	attributes: {
		variant: {
			type: String,
			required: false,
			matches: variantType.slice(),
			description: 'Annotation display style: margin, tooltip, or inline',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const children = renderNodes(resolved.body, config);
		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'margin' });

		const notes = children.tag('aside').typeof('AnnotateNote');
		const body = children.wrap('div');

		return createComponentRenderable({
			rune: 'annotate',
			tag: 'div',
			properties: {
				note: notes,
				variant: variantMeta,
			},
			refs: { body: body.tag('div') },
			children: [body.next()],
		});
	},
});
