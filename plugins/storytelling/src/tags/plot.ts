import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';
import { taxonomyAttributes } from './common.js';

// Map marker characters to status strings
const MARKER_TO_STATUS: Record<string, string> = {
	'x': 'complete',
	'>': 'active',
	' ': 'planned',
	'-': 'abandoned',
};

export const beat = createContentModelSchema({
	attributes: {
		label: { type: String, required: true },
		status: { type: String, required: false },
		description: { type: String, required: false },
		id: { type: String, required: false },
		track: { type: String, required: false },
		follows: { type: String, required: false },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const labelTag = new Tag('span', {}, [attrs.label ?? '']);
		// Map raw marker char to status string if needed
		const resolvedStatus = MARKER_TO_STATUS[attrs.status] ?? (attrs.status || 'planned');
		const statusMeta = new Tag('meta', { content: resolvedStatus });
		const idMeta = new Tag('meta', { content: attrs.id ?? '' });
		const trackMeta = new Tag('meta', { content: attrs.track ?? '' });
		const followsMeta = new Tag('meta', { content: attrs.follows ?? '' });

		// Build body from description attribute + any block-level children
		const childContent = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);
		const descText = (attrs.description ?? '').replace(/^[\s—–-]+/, '').trim();
		const bodyChildren: any[] = [];
		if (descText) {
			bodyChildren.push(new Tag('p', {}, [descText]));
		}
		if (childContent.count() > 0) {
			bodyChildren.push(...childContent.toArray());
		}
		const body = new RenderableNodeCursor(bodyChildren).wrap('div');

		return createComponentRenderable({ rune: 'beat',
			tag: 'li',
			properties: {
				status: statusMeta,
				id: idMeta,
				track: trackMeta,
				follows: followsMeta,
			},
			refs: { label: labelTag, body: body.tag('div') },
			children: [labelTag, statusMeta, idMeta, trackMeta, followsMeta, body.next()],
		});
	},
});

const plotType = ['arc', 'quest', 'subplot', 'campaign', 'episode', 'act', 'chapter'] as const;
const structureType = ['linear', 'parallel', 'branching', 'web'] as const;

export const plot = createContentModelSchema({
	base: taxonomyAttributes,
	attributes: {
		title: { type: String, required: true, description: 'Heading displayed for this plot line.' },
		type: { type: String, required: false, matches: plotType.slice(), description: 'Narrative scope: arc, quest, subplot, campaign, episode, act, or chapter.' },
		structure: { type: String, required: false, matches: structureType.slice(), description: 'How beats connect: linear (sequential), parallel, branching, or web.' },
	},
	contentModel: {
		type: 'sequence' as const,
		fields: [
			{ name: 'description', match: 'paragraph', optional: true, greedy: true },
			{
				name: 'beats', match: 'list', optional: true, greedy: true,
				itemModel: {
					fields: [
						{ name: 'marker', match: 'text' as const, pattern: /^\[(x|>|\s|-)\]\s*/, optional: true },
						{ name: 'label', match: 'strong' as const, optional: true },
						{ name: 'description', match: 'text' as const, pattern: 'remainder' as const, optional: true },
					],
				},
				emitTag: 'beat',
				emitAttributes: { label: '$label', status: '$marker', description: '$description' },
			} as any,
		],
	},
	transform(resolved, attrs, config) {
		const descRendered = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.description), config) as RenderableTreeNode[],
		);
		const itemStream = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.beats), config) as RenderableTreeNode[],
		);

		const titleTag = new Tag('span', {}, [attrs.title ?? '']);
		const plotTypeMeta = new Tag('meta', { content: attrs.type ?? 'arc' });
		const structureMeta = new Tag('meta', { content: attrs.structure ?? 'linear' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });

		const beats = itemStream.tag('li').typeof('Beat');
		const beatsList = new Tag('ol', {}, beats.toArray());

		const children: any[] = [titleTag, plotTypeMeta, structureMeta, tagsMeta];
		if (descRendered.count() > 0) {
			children.push(...descRendered.toArray());
		}
		children.push(beatsList);

		return createComponentRenderable({ rune: 'plot', schemaOrgType: 'CreativeWork',
			tag: 'section',
			property: 'contentSection',
			properties: {
				plotType: plotTypeMeta,
				structure: structureMeta,
				tags: tagsMeta,
				beat: beats,
			},
			refs: { title: titleTag, beats: beatsList },
			schema: {
				name: titleTag,
				genre: plotTypeMeta,
			},
			children,
		});
	},
});
