import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';
import { buildSections } from '../util.js';

const statusValues = ['reported', 'confirmed', 'in-progress', 'fixed', 'wontfix', 'duplicate'] as const;
const severityValues = ['critical', 'major', 'minor', 'cosmetic'] as const;

export const bug = createContentModelSchema({
	attributes: {
		id: { type: String, required: true, description: 'Unique identifier.' },
		status: { type: String, required: false, matches: statusValues.slice(), description: 'Current status: reported, confirmed, in-progress, fixed, wontfix, or duplicate.' },
		severity: { type: String, required: false, matches: severityValues.slice(), description: 'Impact level: critical, major, minor, or cosmetic.' },
		assignee: { type: String, required: false, description: 'Person or agent working on this.' },
		milestone: { type: String, required: false, description: 'Milestone for the fix.' },
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
		const statusMeta = new Tag('meta', { content: attrs.status ?? 'reported' });
		const severityMeta = new Tag('meta', { content: attrs.severity ?? 'major' });
		const assigneeMeta = new Tag('meta', { content: attrs.assignee ?? '' });
		const milestoneMeta = new Tag('meta', { content: attrs.milestone ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });

		const title = titleNodes.wrap('header');

		const sections = resolved.sections as any[];
		const contentChildren = buildSections(sections, config);
		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable(schema.Bug, {
			tag: 'article',
			properties: {
				id: idMeta,
				status: statusMeta,
				severity: severityMeta,
				assignee: assigneeMeta,
				milestone: milestoneMeta,
				tags: tagsMeta,
			},
			refs: {
				title: title.tag('header'),
				body: bodyDiv,
			},
			children: [idMeta, statusMeta, severityMeta, assigneeMeta, milestoneMeta, tagsMeta, title.next(), bodyDiv],
		});
	},
});
