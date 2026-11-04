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

const orgType = [
	'Organization',
	'LocalBusiness',
	'Corporation',
	'EducationalOrganization',
	'GovernmentOrganization',
	'NGO',
] as const;

const orgProperties = { headline: 'name', blurb: 'description' } as const;

export const organizationSchema = {
	by: 'type',
	rows: Object.fromEntries(
		orgType.map((type) => [type, { type, properties: orgProperties }]),
	) as Record<(typeof orgType)[number], { type: string; properties: typeof orgProperties }>,
	fallback: { type: 'Organization', properties: orgProperties },
};

export const organizationSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
	body: 'body',
} as const;

export const organization = createContentModelSchema({
	schema: organizationSchema,
	sections: organizationSections,
	provides: ['prose'],
	attributes: {
		type: {
			type: String,
			required: false,
			matches: orgType.slice(),
			description: 'Schema.org organization category used for structured data.',
		},
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'header', match: 'heading|paragraph|image', greedy: true },
			{ name: 'body', match: 'list|blockquote|tag', greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const header = new RenderableNodeCursor(
			unwrapParagraphImages(
				Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
			),
		);
		const body = renderNodes(resolved.body, config);
		const sectionProps = pageSectionProperties(header);

		const bodyDiv = body.wrap('div');

		return createComponentRenderable({
			rune: 'organization',
			tag: 'article',
			properties: fieldMetas(attrs, config, {
				type: 'Organization',
			}),
			refs: {
				...sectionProps,
				body: bodyDiv,
			},
			children: [header.wrap('header').next(), bodyDiv.next()],
		});
	},
});
