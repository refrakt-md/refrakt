import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, pageSectionProperties, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';
import { parseDuration, formatDuration } from '../duration.js';

const playlistType = ['album', 'podcast', 'audiobook', 'series', 'mix'] as const;
const contentType = ['auto', 'lyrics', 'chapters'] as const;

export const playlist = createContentModelSchema({
	attributes: {
		type: { type: String, required: false, matches: playlistType.slice(), description: 'Collection format: album, podcast, audiobook, series, or mix.' },
		artist: { type: String, required: false, description: 'Default artist applied to tracks that omit their own.' },
		player: { type: Boolean, required: false, description: 'Enable/disable an embedded audio player for the playlist.' },
		content: { type: String, required: false, matches: contentType.slice(), description: 'How nested lists are interpreted: auto-detect, lyrics, or chapters.' },
		id: { type: String, required: false, description: 'Unique identifier used to link an audio rune to this playlist.' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'title', match: 'heading', optional: false,
				template: '# Playlist Name', description: 'Playlist title' },
			{ name: 'cover', match: 'image', optional: true,
				template: '![Cover art](/images/cover.jpg)', description: 'Cover artwork' },
			{ name: 'description', match: 'paragraph', optional: true,
				template: 'A description of this playlist.', description: 'Playlist description' },
			{
				name: 'tracks',
				match: 'list',
				optional: false,
				description: 'Track listing',
				template: '- **Track Name** (3:45)\n- **Another Track** (4:20)',
				itemModel: {
					fields: [
						{ name: 'name', match: 'strong', optional: false },
						{ name: 'src', match: 'link', optional: true, extract: 'href' },
						{ name: 'artist', match: 'em', optional: true },
						{ name: 'duration', match: 'text', optional: true,
							pattern: /\((\d+:\d+(?::\d+)?)\)/ },
						{ name: 'date', match: 'text', optional: true,
							pattern: /—\s*(.+)$/ },
						{ name: 'description', match: 'paragraph', optional: true, greedy: true },
						{
							name: 'cuePoints',
							match: 'list',
							optional: true,
							itemModel: {
								fields: [
									{ name: 'time', match: 'text', optional: true,
										pattern: /\(?(\d+:\d+(?::\d+)?)\)?/ },
									{ name: 'label', match: 'strong', optional: true },
									{ name: 'text', match: 'text', pattern: 'remainder', optional: false },
									{ name: 'description', match: 'paragraph', optional: true, greedy: true },
								],
							},
						},
					],
				},
			},
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const playlistTypeValue = (attrs.type as string) ?? 'album';
		const artistValue = (attrs.artist as string) ?? '';
		const hasPlayer = (attrs.player as boolean) ?? false;
		const contentMode = (attrs.content as string) ?? 'auto';
		const idValue = (attrs.id as string) ?? '';

		// Transform title
		const titleNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.title), config) as RenderableTreeNode[],
		);

		// Transform cover image
		const coverNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.cover), {
				...config,
				nodes: {
					...config.nodes,
					paragraph: {
						render: 'p' as const,
						transform(node: Node, cfg: any) {
							const img = Array.from(node.walk()).find((n: Node) => n.type === 'image');
							if (img) return Markdoc.transform(img, cfg);
							return new Tag('p', {}, node.transformChildren(cfg) as any);
						},
					},
				},
			}) as RenderableTreeNode[],
		);

		// Transform description
		const descNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.description), config) as RenderableTreeNode[],
		);

		// Build track items from itemModel extracted data
		const tracksData = (resolved.tracksData as Record<string, unknown>[] | undefined) ?? [];

		const trackChildren = tracksData.map((track, index) => {
			const name = (track.name as string) ?? '';
			const src = (track.src as string) ?? '';
			const artist = (track.artist as string) ?? artistValue;
			const duration = (track.duration as string) ?? '';
			const date = (track.date as string)?.trim() ?? '';
			const cuePoints = (track.cuePoints as Record<string, unknown>[] | undefined) ?? [];

			const trackNameTag = new Tag('span', { 'data-name': 'track-name', property: 'name' }, [name]);
			const trackChildren: any[] = [trackNameTag];

			if (artist) {
				trackChildren.push(new Tag('span', { 'data-name': 'track-artist', property: 'byArtist' }, [artist]));
			}
			if (duration) {
				trackChildren.push(new Tag('span', { 'data-name': 'track-duration' }, [duration]));
				const durationSeconds = parseDuration(duration);
				trackChildren.push(new Tag('meta', { property: 'duration', content: `PT${durationSeconds}S` }));
			}
			if (date) {
				trackChildren.push(new Tag('span', { 'data-name': 'track-meta', property: 'datePublished' }, [date]));
			}

			// Build cue point elements
			if (cuePoints.length > 0) {
				const cueListTag = buildCuePoints(cuePoints, contentMode);
				if (cueListTag) trackChildren.push(cueListTag);
			}

			const trackAttrs: Record<string, any> = { 'data-rune': 'track', typeof: 'MusicRecording' };
			if (src) trackAttrs['data-src'] = src;

			return new Tag('li', trackAttrs, trackChildren);
		});

		const tracksOl = new Tag('ol', { 'data-name': 'tracks' }, trackChildren);

		// Build header
		const headerChildren: any[] = [];
		if (titleNodes.count() > 0) {
			const headingCursor = titleNodes.headings().limit(1);
			if (headingCursor.count() > 0) {
				const titleTag = headingCursor.next();
				titleTag.attributes['data-name'] = 'title';
				headerChildren.push(titleTag);
			}
		}
		if (coverNodes.count() > 0) {
			headerChildren.push(...coverNodes.toArray());
		}
		if (descNodes.count() > 0) {
			headerChildren.push(...descNodes.toArray());
		}

		const header = headerChildren.length > 0
			? new Tag('div', { 'data-name': 'header' }, headerChildren)
			: null;

		// Build player element (when player attribute is set)
		let playerEl: any = null;
		if (hasPlayer) {
			const playerData = tracksData.map(track => {
				const item: Record<string, any> = {
					name: (track.name as string) ?? '',
				};
				if (track.src) item.src = track.src;
				if (track.artist || artistValue) item.artist = (track.artist as string) ?? artistValue;
				if (track.duration) {
					item.duration = parseDuration((track.duration as string) ?? '');
				}
				return item;
			});

			playerEl = new Tag('div', { 'data-name': 'player' }, [
				new Tag('rf-audio', { waveform: 'false' }, [
					new Tag('script', { type: 'application/json' }, [JSON.stringify(playerData)]),
				]),
			]);
		}

		// Meta tags for identity transform modifiers
		const typeMeta = new Tag('meta', { content: playlistTypeValue });
		const hasPlayerMeta = hasPlayer ? new Tag('meta', { content: 'true' }) : null;
		const artistMeta = artistValue ? new Tag('meta', { content: artistValue }) : null;

		const children: any[] = [typeMeta];
		if (hasPlayerMeta) children.push(hasPlayerMeta);
		if (artistMeta) children.push(artistMeta);
		if (idValue) children.push(new Tag('meta', { 'data-field': 'id', content: idValue }));
		if (header) children.push(header);
		if (playerEl) children.push(playerEl);
		children.push(tracksOl);

		// Transform any remaining body content
		if (resolved.body) {
			const bodyNodes = new RenderableNodeCursor(
				Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
			);
			if (bodyNodes.count() > 0) {
				children.push(...bodyNodes.toArray());
			}
		}

		const sectionProps = pageSectionProperties(titleNodes);
		const trackItems = new RenderableNodeCursor(trackChildren);

		// Extract cover image for schema
		const coverImgCursor = coverNodes.count() > 0 ? coverNodes.tag('img').limit(1) : null;
		const coverSchemaTag = coverImgCursor && coverImgCursor.count() > 0 ? coverImgCursor.next() : undefined;

		return createComponentRenderable(schema.Playlist, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				type: typeMeta,
				...(artistMeta ? { artist: artistMeta } : {}),
				track: trackItems,
			},
			refs: {
				...sectionProps,
			},
			schema: {
				name: sectionProps.headline,
				...(coverSchemaTag ? { image: coverSchemaTag } : {}),
				...(artistMeta ? { byArtist: artistMeta } : {}),
				track: trackItems,
			},
			children,
		});
	},
});

/**
 * Build cue point list (chapters or lyrics) from extracted itemModel data.
 */
function buildCuePoints(
	cuePoints: Record<string, unknown>[],
	contentMode: string,
): any {
	if (cuePoints.length === 0) return null;

	// Detect content type: lyrics have timestamp at start with short text
	const isLyrics = contentMode === 'lyrics' || (
		contentMode === 'auto' && cuePoints.every(cp =>
			cp.time && typeof cp.text === 'string' && (cp.text as string).length < 100
		)
	);

	if (isLyrics) {
		const lyricItems = cuePoints.map(cp => {
			const attrs: Record<string, any> = {};
			if (cp.time) attrs['data-time'] = String(parseDuration(cp.time as string));
			return new Tag('li', attrs, [
				new Tag('p', { 'data-name': 'lyric' }, [cp.text as string ?? '']),
			]);
		});
		return new Tag('ol', { 'data-name': 'lyrics' }, lyricItems);
	}

	// Chapters
	const chapterItems = cuePoints.map(cp => {
		const attrs: Record<string, any> = {};
		if (cp.time) attrs['data-time'] = String(parseDuration(cp.time as string));

		const chapterChildren: any[] = [];
		const label = (cp.label as string) || (cp.text as string) || '';
		if (label) {
			chapterChildren.push(new Tag('span', { 'data-name': 'chapter-name' }, [label]));
		}
		if (cp.time) {
			chapterChildren.push(new Tag('span', { 'data-name': 'chapter-time' }, [cp.time as string]));
		}

		return new Tag('li', attrs, chapterChildren);
	});

	return new Tag('ol', { 'data-name': 'chapters' }, chapterItems);
}
