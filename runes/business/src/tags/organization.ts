import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

const orgType = ['Organization', 'LocalBusiness', 'Corporation', 'EducationalOrganization', 'GovernmentOrganization', 'NonProfit'] as const;

export const organization = createContentModelSchema({
	attributes: {
		type: { type: String, required: false, matches: orgType.slice() },
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
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);
		const typeMeta = new Tag('meta', { content: attrs.type ?? 'Organization' });
		const sectionProps = pageSectionProperties(header);

		const bodyDiv = body.wrap('div');

		return createComponentRenderable(schema.Organization, {
			tag: 'article',
			property: 'contentSection',
			typeof: attrs.type || undefined,
			properties: {
				...sectionProps,
				type: typeMeta,
			},
			refs: {
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
