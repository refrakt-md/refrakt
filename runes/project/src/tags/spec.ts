import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

const statusValues = ['draft', 'review', 'accepted', 'superseded', 'deprecated'] as const;

export const spec = createContentModelSchema({
	attributes: {
		id: { type: String, required: true, description: 'Unique identifier (e.g., "SPEC-008").' },
		status: { type: String, required: false, matches: statusValues.slice(), description: 'Current status: draft, review, accepted, superseded, or deprecated.' },
		version: { type: String, required: false, description: 'Spec version (e.g., "1.0", "1.2").' },
		supersedes: { type: String, required: false, description: 'ID of the spec this replaces.' },
		tags: { type: String, required: false, description: 'Comma-separated labels.' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'title', match: 'heading', optional: false },
			{ name: 'summary', match: 'blockquote', optional: true },
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const titleNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.title), config) as RenderableTreeNode[],
		);
		const summaryNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.summary), config) as RenderableTreeNode[],
		);
		const bodyNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const idMeta = new Tag('meta', { content: attrs.id ?? '' });
		const statusMeta = new Tag('meta', { content: attrs.status ?? 'draft' });
		const versionMeta = new Tag('meta', { content: attrs.version ?? '' });
		const supersedesMeta = new Tag('meta', { content: attrs.supersedes ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });

		const title = titleNodes.wrap('header');
		const contentChildren: any[] = [];
		if (summaryNodes.count() > 0) {
			contentChildren.push(summaryNodes.next());
		}
		if (bodyNodes.count() > 0) {
			contentChildren.push(...bodyNodes.toArray());
		}
		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable(schema.Spec, {
			tag: 'article',
			properties: {
				id: idMeta,
				status: statusMeta,
				version: versionMeta,
				supersedes: supersedesMeta,
				tags: tagsMeta,
			},
			refs: {
				title: title.tag('header'),
				body: bodyDiv,
			},
			children: [idMeta, statusMeta, versionMeta, supersedesMeta, tagsMeta, title.next(), bodyDiv],
		});
	},
});
