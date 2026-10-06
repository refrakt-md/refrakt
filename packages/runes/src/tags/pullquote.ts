import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
	fieldMetas,
} from '../lib/index.js';

const alignValues = ['left', 'center', 'right'] as const;
const variantValues = ['default', 'accent', 'editorial'] as const;

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const pullQuoteSections = { body: 'body' } as const;

export const pullquote = createContentModelSchema({
	sections: pullQuoteSections,
	provides: ['prose'],
	attributes: {
		align: {
			type: String,
			required: false,
			matches: alignValues.slice(),
			description: 'Text alignment of the quote',
		},
		variant: {
			type: String,
			required: false,
			matches: variantValues.slice(),
			description: 'Visual style of the quote block',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const children = renderNodes(resolved.body, config);

		// Extract blockquote or use all children as the quote text
		const blockquote = children.tag('blockquote');
		const quoteChildren =
			blockquote.count() > 0 ? blockquote.limit(1).toArray() : children.tag('p').toArray();

		return createComponentRenderable({
			rune: 'pull-quote',
			tag: 'blockquote',
			properties: fieldMetas(attrs, config, {
				align: 'center',
				variant: 'default',
			}),
			children: quoteChildren,
		});
	},
});
