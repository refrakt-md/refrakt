import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { stripHorizontalRules } from '../util.js';

const statusValues = ['draft', 'review', 'accepted', 'superseded', 'deprecated'] as const;

export const spec = createContentModelSchema({
	attributes: {
		id: { type: String, required: true, description: 'Unique identifier (e.g., "SPEC-008").' },
		status: { type: String, required: false, matches: statusValues.slice(), description: 'Current status: draft, review, accepted, superseded, or deprecated.' },
		version: { type: String, required: false, description: 'Spec version (e.g., "1.0", "1.2").' },
		supersedes: { type: String, required: false, description: 'ID of the spec this replaces.' },
		tags: { type: String, required: false, description: 'Comma-separated labels.' },
		created: { type: String, required: false, description: 'Creation date (ISO 8601). Defaults to file creation date from git.' },
		modified: { type: String, required: false, description: 'Last modified date (ISO 8601). Defaults to file modification date from git.' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'title', match: 'heading', optional: false },
			{ name: 'summary', match: 'paragraph', optional: true, greedy: true },
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
		const fileVars = config.variables?.file as { created?: string; modified?: string } | undefined;
		const createdMeta = new Tag('meta', { content: attrs.created || fileVars?.created || '' });
		const modifiedMeta = new Tag('meta', { content: attrs.modified || fileVars?.modified || '' });

		const title = titleNodes.wrap('header');
		const blurb = summaryNodes.count() > 0 ? summaryNodes.wrap('div').next() : undefined;
		const contentChildren: any[] = [];
		if (bodyNodes.count() > 0) {
			contentChildren.push(...stripHorizontalRules(bodyNodes.toArray()));
		}
		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable({ rune: 'spec',
			tag: 'article',
			properties: {
				id: idMeta,
				status: statusMeta,
				version: versionMeta,
				supersedes: supersedesMeta,
				tags: tagsMeta,
				created: createdMeta,
				modified: modifiedMeta,
			},
			refs: {
				title: title.tag('header'),
				blurb,
				body: bodyDiv,
			},
			children: [idMeta, statusMeta, versionMeta, supersedesMeta, tagsMeta, createdMeta, modifiedMeta, title.next(), ...(blurb ? [blurb] : []), bodyDiv],
		});
	},
});
