import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes, pageSectionProperties } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';
import { CommaSeparatedList, SpaceSeparatedNumberList } from '../attributes.js';
import { MusicRecordingNode } from './music-recording.js';

// Convert list items into music-recording tags using trackFields
function convertPlaylistChildren(nodes: unknown[], attributes: Record<string, unknown>): unknown[] {
	const trackFields = attributes.trackFields as string[] ?? [];
	const listIndex = (nodes as Node[]).findIndex(n => (n as Node).type === 'list');
	if (listIndex === -1) return nodes;

	const nodeArr = nodes as Node[];
	return [
		...nodeArr.slice(0, listIndex),
		...nodeArr[listIndex].children.map(item => MusicRecordingNode.fromItem(item, trackFields)),
		...nodeArr.slice(listIndex + 1),
	];
}

export const musicPlaylist = createContentModelSchema({
	attributes: {
		trackFields: { type: CommaSeparatedList, required: false },
		audio: { type: String, required: false },
		split: { type: SpaceSeparatedNumberList, required: false },
		mirror: { type: Boolean, required: false },
	},
	contentModel: {
		type: 'custom',
		processChildren: convertPlaylistChildren,
		description: 'Converts list items into music-recording tags using configured trackFields.',
	},
	transform(resolved, attrs, config) {
		const allChildren = asNodes(resolved.children);

		// Separate header (headings, paragraphs) from track tags
		const headerAst: Node[] = [];
		const trackAst: Node[] = [];
		for (const child of allChildren) {
			if (child.type === 'tag') {
				trackAst.push(child);
			} else if (child.type === 'heading' || child.type === 'paragraph') {
				headerAst.push(child);
			}
		}

		// Transform header with custom paragraph handling to extract images
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAst, {
				...config,
				nodes: {
					...config.nodes,
					paragraph: {
						render: 'p' as const,
						transform(node: Node, cfg: any) {
							const img = Array.from(node.walk()).find((n: Node) => n.type === 'image');
							if (img) return Markdoc.transform(img, cfg);
							// No image — render as normal paragraph
							return new Tag('p', {}, node.transformChildren(cfg) as any);
						},
					},
				},
			}) as RenderableTreeNode[],
		);

		const tracks = new RenderableNodeCursor(
			Markdoc.transform(trackAst, config) as RenderableTreeNode[],
		);

		const sectionProps = pageSectionProperties(header);
		const trackItems = tracks.tag('li').typeof('MusicRecording');

		const mainContent = header.wrap('div', { 'data-name': 'main' });
		const sideContent = tracks.wrap('ol').wrap('div', { 'data-name': 'showcase' });

		const split = attrs.split as number[] ?? [];
		const mirror = attrs.mirror as boolean ?? false;

		const splitMeta = split.length > 0
			? new Tag('meta', { 'data-field': 'split', content: split.join(' ') })
			: null;
		const mirrorMeta = mirror
			? new Tag('meta', { 'data-field': 'mirror', content: 'true' })
			: null;

		const children = [
			splitMeta,
			mirrorMeta,
			mainContent.next(),
			sideContent.next(),
		].filter(Boolean);

		return createComponentRenderable(schema.MusicPlaylist, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...sectionProps,
				track: trackItems,
			},
			schema: {
				name: sectionProps.headline,
				track: trackItems,
			},
			children,
		});
	},
});
