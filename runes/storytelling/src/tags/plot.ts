import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

// Map marker characters to status strings
const MARKER_TO_STATUS: Record<string, string> = {
	'x': 'complete',
	'>': 'active',
	' ': 'planned',
	'-': 'abandoned',
};

class BeatModel extends Model {
	@attribute({ type: String, required: true })
	label: string = '';

	@attribute({ type: String, required: false })
	status: string = 'planned';

	@attribute({ type: String, required: false })
	description: string = '';

	@attribute({ type: String, required: false })
	id: string = '';

	@attribute({ type: String, required: false })
	track: string = '';

	@attribute({ type: String, required: false })
	follows: string = '';

	transform(): RenderableTreeNodes {
		const labelTag = new Tag('span', {}, [this.label]);
		// Map raw marker char to status string if needed
		const resolvedStatus = MARKER_TO_STATUS[this.status] ?? this.status;
		const statusMeta = new Tag('meta', { content: resolvedStatus });
		const idMeta = new Tag('meta', { content: this.id });
		const trackMeta = new Tag('meta', { content: this.track });
		const followsMeta = new Tag('meta', { content: this.follows });

		// Build body from description attribute + any block-level children
		const childContent = this.transformChildren();
		const descText = this.description.replace(/^[\s—–-]+/, '').trim();
		const bodyChildren: any[] = [];
		if (descText) {
			bodyChildren.push(new Tag('p', {}, [descText]));
		}
		if (childContent.count() > 0) {
			bodyChildren.push(...childContent.toArray());
		}
		const body = new RenderableNodeCursor(bodyChildren).wrap('div');

		return createComponentRenderable(schema.Beat, {
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
	}
}

const plotType = ['arc', 'quest', 'subplot', 'campaign', 'episode', 'act', 'chapter'] as const;
const structureType = ['linear', 'parallel', 'branching', 'web'] as const;

export const beat = createSchema(BeatModel);

export const plot = createContentModelSchema({
	attributes: {
		title: { type: String, required: true, description: 'Heading displayed for this plot line.' },
		type: { type: String, required: false, matches: plotType.slice(), description: 'Narrative scope: arc, quest, subplot, campaign, episode, act, or chapter.' },
		structure: { type: String, required: false, matches: structureType.slice(), description: 'How beats connect: linear (sequential), parallel, branching, or web.' },
		tags: { type: String, required: false, description: 'Comma-separated keywords for filtering and cross-referencing.' },
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

		return createComponentRenderable(schema.Plot, {
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
