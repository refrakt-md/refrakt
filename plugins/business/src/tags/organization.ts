import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor, pageSectionProperties, unwrapParagraphImages } from '@refrakt-md/runes';

const orgType = ['Organization', 'LocalBusiness', 'Corporation', 'EducationalOrganization', 'GovernmentOrganization', 'NonProfit'] as const;

export const organization = createContentModelSchema({
	attributes: {
		type: { type: String, required: false, matches: orgType.slice(), description: 'Schema.org organization category used for structured data.' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'header', match: 'heading|paragraph|image', greedy: true },
			{ name: 'body', match: 'list|blockquote|tag', greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		// Unwrap Markdoc's `<p>` around a leading logo image so it sits bare in the
		// header (and so `pageSectionProperties`' top-level `img` lookup finds it).
		const header = new RenderableNodeCursor(
			unwrapParagraphImages(Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[]),
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);
		const typeMeta = new Tag('meta', { content: attrs.type ?? 'Organization' });
		const sectionProps = pageSectionProperties(header);

		const bodyDiv = body.wrap('div');

		return createComponentRenderable({ rune: 'organization', schemaOrgType: 'Organization',
			tag: 'article',
			property: 'contentSection',
			typeof: attrs.type || undefined,
			properties: {
				type: typeMeta,
			},
			refs: {
				...sectionProps,
				body: bodyDiv,
			},
			schema: {
				name: sectionProps.headline,
				description: sectionProps.blurb,
			},
			children: [
				typeMeta,
				header.wrap('header').next(),
				bodyDiv.next(),
			],
		});
	},
});
