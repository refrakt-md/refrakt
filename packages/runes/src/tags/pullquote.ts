import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
type Tag = InstanceType<typeof Markdoc.Tag>;
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

		// The quote is an authored blockquote, or the paragraphs. A blockquote is
		// unwrapped: the pull quote is itself the `<blockquote>`, so keeping the
		// authored one inside would nest a quotation in a quotation. Its
		// attributes come with its content, so a composition's slot marker and a
		// schema `property` land on the one element.
		const [blockquote] = children.tag('blockquote').limit(1).toArray() as Tag[];
		const quoteChildren = blockquote ? blockquote.children : children.tag('p').toArray();

		const root = createComponentRenderable({
			rune: 'pull-quote',
			tag: 'blockquote',
			properties: fieldMetas(attrs, config, {
				align: 'center',
				variant: 'default',
			}),
			children: quoteChildren,
		});
		if (blockquote) {
			for (const [name, value] of Object.entries(blockquote.attributes)) {
				if (root.attributes[name] === undefined) root.attributes[name] = value;
			}
		}
		return root;
	},
});
