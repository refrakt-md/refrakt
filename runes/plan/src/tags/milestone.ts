import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

const statusValues = ['planning', 'active', 'complete'] as const;

export const milestone = createContentModelSchema({
	attributes: {
		name: { type: String, required: true, description: 'Milestone name (e.g., "v0.5.0").' },
		target: { type: String, required: false, description: 'Target date (aspirational, not a commitment).' },
		status: { type: String, required: false, matches: statusValues.slice(), description: 'Current status: planning, active, or complete.' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'title', match: 'heading', optional: true },
			{ name: 'goals', match: 'list', optional: true },
			{ name: 'notes', match: 'paragraph', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const titleNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.title), config) as RenderableTreeNode[],
		);
		const goalsNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.goals), config) as RenderableTreeNode[],
		);
		const notesNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.notes), config) as RenderableTreeNode[],
		);

		const nameMeta = new Tag('meta', { content: attrs.name ?? '' });
		const targetMeta = new Tag('meta', { content: attrs.target ?? '' });
		const statusMeta = new Tag('meta', { content: attrs.status ?? 'planning' });

		const contentChildren: any[] = [];
		if (titleNodes.count() > 0) {
			contentChildren.push(titleNodes.wrap('header').next());
		}
		if (goalsNodes.count() > 0) {
			contentChildren.push(goalsNodes.next());
		}
		if (notesNodes.count() > 0) {
			contentChildren.push(...notesNodes.toArray());
		}
		const bodyDiv = new Tag('div', {}, contentChildren);

		return createComponentRenderable(schema.Milestone, {
			tag: 'section',
			properties: {
				name: nameMeta,
				target: targetMeta,
				status: statusMeta,
			},
			refs: {
				body: bodyDiv,
			},
			children: [nameMeta, targetMeta, statusMeta, bodyDiv],
		});
	},
});
