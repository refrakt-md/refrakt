import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
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
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
		knownSections: {
			'Steps to Reproduce': {
				alias: ['Reproduction', 'Steps', 'Repro'],
			},
			'Expected': {
				alias: ['Expected Behaviour'],
			},
			'Actual': {
				alias: ['Actual Behaviour'],
			},
			'Environment': {
				alias: ['Env'],
			},
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
		const sourceMeta = new Tag('meta', { content: attrs.source ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });
		const fileVars = config.variables?.file as { created?: string; modified?: string } | undefined;
		const createdMeta = new Tag('meta', { content: attrs.created || fileVars?.created || '' });
		const modifiedMeta = new Tag('meta', { content: attrs.modified || fileVars?.modified || '' });

		const title = titleNodes.wrap('header');

		const sections = resolved.sections as any[];
		const contentChildren = buildSections(sections, config);
		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable({ rune: 'bug',
			tag: 'article',
			properties: {
				id: idMeta,
				status: statusMeta,
				severity: severityMeta,
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
			children: [idMeta, statusMeta, severityMeta, assigneeMeta, milestoneMeta, sourceMeta, tagsMeta, createdMeta, modifiedMeta, title.next(), bodyDiv],
		});
	},
});
