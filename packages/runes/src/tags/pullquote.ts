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
import { OWNER_ATTR, SLOT_ATTR } from '../lib/schema-table.js';
import {
	attributionFrom,
	attributionItemModel,
	insideAttributionItemModel,
	renderAttribution,
	splitInsideAttribution,
} from '../lib/attribution.js';

const alignValues = ['left', 'center', 'right'] as const;
const variantValues = ['default', 'accent', 'editorial'] as const;

export const pullQuoteSections = { quote: 'body' } as const;

const pullQuoteModel: ContentModel = {
	when: [
		{
			condition: { hasChild: 'blockquote' },
			model: {
				type: 'sequence',
				fields: [
					{
						name: 'quote',
						match: 'blockquote',
						model: {
							type: 'sequence',
							fields: [
								{ name: 'body', match: 'any', greedy: true, optional: true },
								{
									name: 'attribution',
									match: 'paragraph',
									optional: true,
									position: 'last',
									itemModel: insideAttributionItemModel,
								},
							],
						},
					},
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

function mapVariant(value: unknown, attrs: Record<string, unknown>): string | undefined {
	if (value !== 'accent') return undefined;
	if (attrs.tint === undefined) attrs.tint = 'subtle';
	return 'prominent';
}

export const pullquote = createContentModelSchema({
	sections: pullQuoteSections,
	provides: ['prose', 'featured-quotation'],
	attributes: {
		author: {
			type: String,
			required: false,
			description: 'Who said it: the attribution, when it is not written as a paragraph',
		},
		source: {
			type: String,
			required: false,
			description: 'Where it is from: a role, a work or a date, beside `author`',
		},
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
				'Deprecated: a look name. `accent` maps to `tint` and `prominence="prominent"`; the others to nothing',
		} as any,
	},
	deprecations: {
		variant: { newName: 'prominence', transform: mapVariant },
	},
	contentModel: pullQuoteModel,
	transform(resolved, attrs, config) {
		const inside = splitInsideAttribution(resolved.quote as Node | undefined);
		const authored = resolved.quote
			? (renderNodes(inside?.quote ?? (resolved.quote as Node), config).toArray() as Tag[])
			: [];
		const quote = authored.length
			? withoutQuoteRole(authored[0])
			: new Tag('blockquote', {}, renderNodes(resolved.body as Node[], config).toArray());

		const fromAttrs =
			typeof attrs.author === 'string' && attrs.author.trim()
				? { name: attrs.author, source: attrs.source as string | undefined }
				: undefined;
		const after = fromAttrs ? undefined : attributionFrom(resolved.attributionData);
		const attribution = renderAttribution(fromAttrs ?? after ?? inside?.attribution ?? {});
		if (attribution && after) {
			const marks = (resolved.attribution as Node | undefined)?.attributes ?? {};
			for (const name of [OWNER_ATTR, SLOT_ATTR]) {
				if (marks[name] !== undefined) attribution.attributes[name] = marks[name];
			}
		}
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
