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
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.Beat, {
			tag: 'li',
			properties: {
				label: labelTag,
				status: statusMeta,
				id: idMeta,
				track: trackMeta,
				follows: followsMeta,
			},
			refs: { body: body.tag('div') },
			children: [labelTag, statusMeta, idMeta, trackMeta, followsMeta, body.next()],
		});
	}
}

const plotType = ['arc', 'quest', 'subplot', 'campaign', 'episode', 'act', 'chapter'] as const;
const structureType = ['linear', 'parallel', 'branching', 'web'] as const;

export const beat = createSchema(BeatModel);

export const plot = createContentModelSchema({
	attributes: {
		title: { type: String, required: true },
		type: { type: String, required: false, matches: plotType.slice() },
		structure: { type: String, required: false, matches: structureType.slice() },
		tags: { type: String, required: false },
	},
	contentModel: {
		type: 'sequence' as const,
		fields: [
			{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
			{
				name: 'beats', match: 'list', optional: true, greedy: true,
				itemModel: {
					fields: [
						{ name: 'marker', match: 'text' as const, pattern: /^\[(x|>|\s|-)\]\s*/, optional: true },
						{ name: 'label', match: 'strong' as const, optional: true },
						{ name: 'labelText', match: 'text' as const, pattern: 'remainder' as const, optional: true },
					],
				},
				emitTag: 'beat',
				emitAttributes: { label: '$label|$labelText', status: '$marker' },
			} as any,
		],
	},
	transform(resolved, attrs, config) {
		const header = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
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
		if (header.count() > 0) {
			children.push(header.wrap('header').next());
		}
		children.push(beatsList);

		return createComponentRenderable(schema.Plot, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				title: titleTag,
				plotType: plotTypeMeta,
				structure: structureMeta,
				tags: tagsMeta,
				beat: beats,
			},
			refs: { beats: beatsList },
			schema: {
				name: titleTag,
				genre: plotTypeMeta,
			},
			children,
		});
	},
});
