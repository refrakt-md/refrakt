import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';
import { parseDuration } from '../duration.js';

export const audio = createContentModelSchema({
	attributes: {
		src: { type: String, required: false },
		playlist: { type: String, required: false },
		title: { type: String, required: false },
		artist: { type: String, required: false },
		waveform: { type: Boolean, required: false },
		chapters: { type: String, required: false },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'description', match: 'paragraph', optional: true, greedy: true },
			{
				name: 'chapterList',
				match: 'list',
				optional: true,
				description: 'Inline chapter markers',
				itemModel: {
					fields: [
						{ name: 'label', match: 'strong', optional: true },
						{ name: 'time', match: 'text', optional: true,
							pattern: /\((\d+:\d+(?::\d+)?)\)/ },
						{ name: 'text', match: 'text', pattern: 'remainder', optional: false },
					],
				},
			},
		],
	},
	transform(resolved, attrs, config) {
		const src = (attrs.src as string) ?? '';
		const playlistId = (attrs.playlist as string) ?? '';
		const title = (attrs.title as string) ?? '';
		const artist = (attrs.artist as string) ?? '';
		const waveform = (attrs.waveform as boolean) ?? false;
		const chaptersUrl = (attrs.chapters as string) ?? '';

		// Build player data
		const playerData: Record<string, any> = {};
		if (src) playerData.src = src;
		if (title) playerData.name = title;
		if (artist) playerData.artist = artist;
		if (playlistId) playerData.playlist = playlistId;

		// Process inline chapters
		const chapterData = (resolved.chapterListData as Record<string, unknown>[] | undefined) ?? [];
		if (chapterData.length > 0) {
			playerData.chapters = chapterData.map(ch => ({
				name: (ch.label as string) || (ch.text as string) || '',
				time: ch.time ? parseDuration(ch.time as string) : 0,
			}));
		}

		// Transform description
		const descNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.description), config) as RenderableTreeNode[],
		);

		// Meta tags for identity transform
		const waveformMeta = waveform ? new Tag('meta', { content: 'true' }) : null;

		const children: any[] = [];
		if (waveformMeta) children.push(waveformMeta);

		// Player element with JSON data
		const audioEl = new Tag('rf-audio', {
			waveform: String(waveform),
			...(playlistId ? { playlist: playlistId } : {}),
			...(chaptersUrl ? { chapters: chaptersUrl } : {}),
		}, [
			new Tag('script', { type: 'application/json' }, [JSON.stringify(
				src ? [playerData] : [],
			)]),
		]);

		children.push(audioEl);

		// Add description
		if (descNodes.count() > 0) {
			children.push(descNodes.wrap('div', { 'data-name': 'description' }).next());
		}

		return createComponentRenderable(schema.Audio, {
			tag: 'div',
			properties: {
				...(waveformMeta ? { waveform: waveformMeta } : {}),
			},
			children,
		});
	},
});
