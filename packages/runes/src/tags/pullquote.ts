import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
const { Tag } = Markdoc;
type Tag = InstanceType<typeof Markdoc.Tag>;
import type { ContentModel } from '@refrakt-md/types';
import {
	createContentModelSchema,
	createComponentRenderable,
	renderNodes,
	fieldMetas,
} from '../lib/index.js';
import { QUOTE_ATTR, withoutQuoteRole } from '../nodes.js';
import { attributionItemModel, renderAttribution } from '../lib/attribution.js';

const alignValues = ['left', 'center', 'right'] as const;
const variantValues = ['default', 'accent', 'editorial'] as const;

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028). The quote is the body the reading register
// lands on.
export const pullQuoteSections = { quote: 'body' } as const;

/**
 * The quote is an authored `>`, read with the paragraph after it as its
 * attribution: one unit, so an attribution is never read without a quote
 * (SPEC-185 D6). Without a blockquote, the paragraphs are the quote as written.
 */
const pullQuoteModel: ContentModel = {
	when: [
		{
			condition: { hasChild: 'blockquote' },
			model: {
				type: 'sequence',
				fields: [
					{ name: 'quote', match: 'blockquote' },
					{
						name: 'attribution',
						match: 'paragraph',
						optional: true,
						itemModel: attributionItemModel,
					},
				],
			},
		},
	],
	default: {
		type: 'sequence',
		fields: [{ name: 'body', match: 'any', greedy: true, optional: true }],
	},
};

/**
 * SPEC-185 D2 — `variant` named a look. `accent`'s tinted background is the
 * universal `tint` and its extra size is `prominence="prominent"`; `default`
 * and `editorial` map to nothing (an editorial theme looks editorial already).
 */
function mapVariant(value: unknown, attrs: Record<string, unknown>): string | undefined {
	if (value !== 'accent') return undefined;
	if (attrs.tint === undefined) attrs.tint = 'subtle';
	return 'prominent';
}

export const pullquote = createContentModelSchema({
	sections: pullQuoteSections,
	provides: ['prose', 'featured-quotation'],
	attributes: {
		align: {
			type: String,
			required: false,
			matches: alignValues.slice(),
			description: 'Placement of the quote in the text: centred, or floated left or right',
		},
		excerpt: {
			type: Boolean,
			required: false,
			description:
				'The words already appear in the text: a pull quote, hidden from assistive technology so a screen reader does not read them twice',
		},
		variant: {
			type: String,
			required: false,
			matches: variantValues.slice(),
			deprecated: true,
			description:
				'Deprecated (SPEC-185 D2): a look name. `accent` maps to `tint` and `prominence="prominent"`; the others to nothing',
		} as any,
	},
	deprecations: {
		variant: { newName: 'prominence', transform: mapVariant },
	},
	contentModel: pullQuoteModel,
	transform(resolved, attrs, config) {
		// The authored blockquote is the quote, never nested in a second one
		// (SPEC-185 D4). It keeps its own attributes (a composition's slot
		// marker, a schema `property`), but not the quotation role: the quote
		// is the featured quotation's, which the outermost element names.
		const authored = resolved.quote
			? (renderNodes(resolved.quote as Node, config).toArray() as Tag[])
			: [];
		const quote = authored.length
			? withoutQuoteRole(authored[0])
			: new Tag('blockquote', {}, renderNodes(resolved.body as Node[], config).toArray());

		const attribution = renderAttribution(
			(resolved.attributionData as Record<string, unknown> | undefined) ?? {},
		);
		const excerpt = attrs.excerpt === true;
		const figureChildren = attribution ? [quote, attribution] : [quote];
		const refs: Record<string, Tag> = { quote };
		if (attribution) refs.attribution = attribution;

		const properties = fieldMetas(attrs, config, { align: 'center' });
		if (!excerpt) {
			const root = createComponentRenderable({
				rune: 'pull-quote',
				tag: 'figure',
				properties,
				refs,
				children: figureChildren,
			});
			root.attributes[QUOTE_ATTR] = 'featured';
			return root;
		}

		// D4 — an excerpt repeats words already in the text, so it is hidden
		// from assistive technology; it holds the same figure.
		const figure = new Tag('figure', {}, figureChildren);
		const root = createComponentRenderable({
			rune: 'pull-quote',
			tag: 'aside',
			properties,
			refs: { ...refs, figure },
			children: [figure],
		});
		root.attributes[QUOTE_ATTR] = 'excerpt';
		root.attributes['aria-hidden'] = 'true';
		return root;
	},
});
