import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { slugify, buildSections } from '../util.js';

const statusValues = ['draft', 'ready', 'in-progress', 'review', 'done', 'blocked', 'pending'] as const;
const priorityValues = ['critical', 'high', 'medium', 'low'] as const;
const complexityValues = ['trivial', 'simple', 'moderate', 'complex', 'unknown'] as const;

export const work = createContentModelSchema({
	attributes: {
		id: { type: String, required: true, description: 'Unique identifier (e.g., "RF-142").' },
		status: { type: String, required: false, matches: statusValues.slice(), description: 'Current status: draft, ready, in-progress, review, done, or blocked.' },
		priority: { type: String, required: false, matches: priorityValues.slice(), description: 'Priority level: critical, high, medium, or low.' },
		complexity: { type: String, required: false, matches: complexityValues.slice(), description: 'Complexity signal: trivial, simple, moderate, complex, or unknown.' },
		assignee: { type: String, required: false, description: 'Person or agent working on this.' },
		milestone: { type: String, required: false, description: 'Milestone this belongs to.' },
		source: { type: String, required: false, description: 'Comma-separated IDs of specs or decisions this item implements.' },
		tags: { type: String, required: false, description: 'Comma-separated labels.' },
		created: { type: String, required: false, description: 'Creation date (ISO 8601). Defaults to file creation date from git.' },
		modified: { type: String, required: false, description: 'Last modified date (ISO 8601). Defaults to file modification date from git.' },
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading:2',
		fields: [
			{ name: 'title', match: 'heading', optional: false },
			{ name: 'description', match: 'paragraph', optional: true, greedy: true },
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
		knownSections: {
			'Acceptance Criteria': {
				alias: ['Criteria', 'AC', 'Done When'],
			},
			'Dependencies': {
				alias: ['Deps', 'Depends On', 'Blocked By', 'Requires'],
			},
			'Approach': {
				alias: ['Technical Notes', 'Implementation Notes', 'How'],
			},
			'References': {
				alias: ['Refs', 'Related', 'Context'],
			},
			'Edge Cases': {
				alias: ['Exceptions', 'Corner Cases'],
			},
			'Verification': {
				alias: ['Test Cases', 'Tests'],
			},
		},
	}),
	transform(resolved, attrs, config) {
		const titleNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.title), config) as RenderableTreeNode[],
		);
		const descNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.description), config) as RenderableTreeNode[],
		);

		const idMeta = new Tag('meta', { content: attrs.id ?? '' });
		const statusMeta = new Tag('meta', { content: attrs.status ?? 'draft' });
		const priorityMeta = new Tag('meta', { content: attrs.priority ?? 'medium' });
		const complexityMeta = new Tag('meta', { content: attrs.complexity ?? 'unknown' });
		const assigneeMeta = new Tag('meta', { content: attrs.assignee ?? '' });
		const milestoneMeta = new Tag('meta', { content: attrs.milestone ?? '' });
		const sourceMeta = new Tag('meta', { content: attrs.source ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });
		const fileVars = config.variables?.file as { created?: string; modified?: string } | undefined;
		const createdMeta = new Tag('meta', { content: attrs.created || fileVars?.created || '' });
		const modifiedMeta = new Tag('meta', { content: attrs.modified || fileVars?.modified || '' });

		const title = titleNodes.wrap('header');

		const contentChildren: any[] = [];
		if (descNodes.count() > 0) {
			contentChildren.push(descNodes.wrap('div').next());
		}

		const sections = resolved.sections as any[];
		contentChildren.push(...buildSections(sections, config));

		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable({ rune: 'work',
			tag: 'article',
			properties: {
				id: idMeta,
				status: statusMeta,
				priority: priorityMeta,
				complexity: complexityMeta,
				assignee: assigneeMeta,
				milestone: milestoneMeta,
				source: sourceMeta,
				tags: tagsMeta,
				created: createdMeta,
				modified: modifiedMeta,
			},
			refs: {
				title: title.tag('header'),
				body: bodyDiv,
			},
			children: [idMeta, statusMeta, priorityMeta, complexityMeta, assigneeMeta, milestoneMeta, sourceMeta, tagsMeta, createdMeta, modifiedMeta, title.next(), bodyDiv],
		});
	},
});
