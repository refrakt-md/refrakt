import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { buildSections } from '../util.js';

const statusValues = ['proposed', 'accepted', 'superseded', 'deprecated'] as const;

export const decision = createContentModelSchema({
	attributes: {
		id: { type: String, required: true, description: 'Identifier (e.g., "ADR-007").' },
		status: { type: String, required: false, matches: statusValues.slice(), description: 'Decision status: proposed, accepted, superseded, or deprecated.' },
		date: { type: String, required: false, description: 'Date decided (ISO 8601).' },
		supersedes: { type: String, required: false, description: 'ID of the decision this replaces.' },
		source: { type: String, required: false, description: 'Comma-separated IDs of specs or other entities this decision informs.' },
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
			'Context': {
				alias: ['Background'],
			},
			'Options Considered': {
				alias: ['Options', 'Alternatives'],
			},
			'Decision': {},
			'Rationale': {
				alias: ['Reasoning'],
			},
			'Consequences': {
				alias: ['Impact', 'Trade-offs'],
			},
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
		const sourceMeta = new Tag('meta', { content: attrs.source ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });
		const fileVars = config.variables?.file as { created?: string; modified?: string } | undefined;
		const createdMeta = new Tag('meta', { content: attrs.created || fileVars?.created || '' });
		const modifiedMeta = new Tag('meta', { content: attrs.modified || fileVars?.modified || '' });

		const title = titleNodes.wrap('header');

		const sections = resolved.sections as any[];
		const contentChildren = buildSections(sections, config);
		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable({ rune: 'decision',
			tag: 'article',
			properties: {
				id: idMeta,
				status: statusMeta,
				date: dateMeta,
				supersedes: supersedesMeta,
				source: sourceMeta,
				tags: tagsMeta,
				created: createdMeta,
				modified: modifiedMeta,
			},
			refs: {
				title: title.tag('header'),
				body: bodyDiv,
			},
			children: [idMeta, statusMeta, dateMeta, supersedesMeta, sourceMeta, tagsMeta, createdMeta, modifiedMeta, title.next(), bodyDiv],
		});
	},
});
