import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';
import { buildSections } from '../util.js';

const statusValues = ['proposed', 'accepted', 'superseded', 'deprecated'] as const;

export const decision = createContentModelSchema({
	attributes: {
		id: { type: String, required: true, description: 'Identifier (e.g., "ADR-007").' },
		status: { type: String, required: false, matches: statusValues.slice(), description: 'Decision status: proposed, accepted, superseded, or deprecated.' },
		date: { type: String, required: false, description: 'Date decided (ISO 8601).' },
		supersedes: { type: String, required: false, description: 'ID of the decision this replaces.' },
		tags: { type: String, required: false, description: 'Comma-separated labels.' },
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading:2',
		fields: [
			{ name: 'title', match: 'heading', optional: false },
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
	}),
	transform(resolved, attrs, config) {
		const titleNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.title), config) as RenderableTreeNode[],
		);

		const idMeta = new Tag('meta', { content: attrs.id ?? '' });
		const statusMeta = new Tag('meta', { content: attrs.status ?? 'proposed' });
		const dateMeta = new Tag('meta', { content: attrs.date ?? '' });
		const supersedesMeta = new Tag('meta', { content: attrs.supersedes ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });

		const title = titleNodes.wrap('header');

		const sections = resolved.sections as any[];
		const contentChildren = buildSections(sections, config);
		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable(schema.Decision, {
			tag: 'article',
			properties: {
				id: idMeta,
				status: statusMeta,
				date: dateMeta,
				supersedes: supersedesMeta,
				tags: tagsMeta,
			},
			refs: {
				title: title.tag('header'),
				body: bodyDiv,
			},
			children: [idMeta, statusMeta, dateMeta, supersedesMeta, tagsMeta, title.next(), bodyDiv],
		});
	},
});
