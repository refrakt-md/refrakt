import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, pageSectionProperties, RenderableNodeCursor, SplitLayoutModel, buildLayoutMetas, extractMediaImage } from '@refrakt-md/runes';
import { schema } from '../types.js';
import { parseDuration, formatDuration } from '../duration.js';

const playlistType = ['album', 'podcast', 'audiobook', 'series', 'mix'] as const;
const contentType = ['auto', 'lyrics', 'chapters'] as const;

export const playlist = createContentModelSchema({
	base: SplitLayoutModel,
	attributes: {
		type: { type: String, required: false, matches: playlistType.slice(), description: 'Collection format: album, podcast, audiobook, series, or mix.' },
		artist: { type: String, required: false, description: 'Default artist applied to tracks that omit their own.' },
		player: { type: Boolean, required: false, description: 'Enable/disable an embedded audio player for the playlist.' },
		content: { type: String, required: false, matches: contentType.slice(), description: 'How nested lists are interpreted: auto-detect, lyrics, or chapters.' },
		id: { type: String, required: false, description: 'Unique identifier used to link an audio rune to this playlist.' },
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		zones: [
			{
				name: 'content',
				type: 'sequence',
				fields: [
					{ name: 'headline', match: 'heading', optional: false,
						template: '# Playlist Name', description: 'Playlist title' },
					{ name: 'blurb', match: 'paragraph', optional: true,
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
			{
				name: 'media',
				type: 'sequence',
				fields: [
					{ name: 'media', match: 'any', optional: true, greedy: true },
				],
			},
		],
	},
	transform(resolved, attrs, config) {
		const contentZone = (resolved.content ?? {}) as ResolvedContent;
		const mediaZone = (resolved.media ?? {}) as ResolvedContent;

		const playlistTypeValue = (attrs.type as string) ?? 'album';
		const artistValue = (attrs.artist as string) ?? '';
		const hasPlayer = (attrs.player as boolean) ?? false;
		const contentMode = (attrs.content as string) ?? 'auto';
		const idValue = (attrs.id as string) ?? '';

		// Collect header AST nodes (title, description) and transform together
		const headerAstNodes = [
			contentZone.headline,
			contentZone.blurb,
		].filter(Boolean) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		// Transform media zone
		const mediaAstNodes = (
			Array.isArray(mediaZone.media) ? mediaZone.media : []
		) as Node[];
		const side = new RenderableNodeCursor(
			Markdoc.transform(mediaAstNodes, config) as RenderableTreeNode[],
		);

		// Build track items from itemModel extracted data
		const tracksData = (contentZone.tracksData as Record<string, unknown>[] | undefined) ?? [];

		const trackChildren = tracksData.map((track, index) => {
			const name = (track.name as string) ?? '';
			const src = (track.src as string) ?? '';
			const artist = (track.artist as string) ?? artistValue;
			const duration = (track.duration as string) ?? '';
			const date = (track.date as string)?.trim() ?? '';
			const cuePoints = (track.cuePoints as Record<string, unknown>[] | undefined) ?? [];

			const trackNameTag = new Tag('span', { 'data-name': 'track-name', property: 'name' }, [name]);
			const trackChildrenArr: any[] = [trackNameTag];

			if (artist) {
				trackChildrenArr.push(new Tag('span', { 'data-name': 'track-artist', property: 'byArtist' }, [artist]));
			}
			if (duration) {
				trackChildrenArr.push(new Tag('span', { 'data-name': 'track-duration' }, [duration]));
				const durationSeconds = parseDuration(duration);
				trackChildrenArr.push(new Tag('meta', { property: 'duration', content: `PT${durationSeconds}S` }));
			}
			if (date) {
				trackChildrenArr.push(new Tag('span', { 'data-name': 'track-meta', property: 'datePublished' }, [date]));
			}

			// Build cue point elements
			if (cuePoints.length > 0) {
				const cueListTag = buildCuePoints(cuePoints, contentMode);
				if (cueListTag) trackChildrenArr.push(cueListTag);
			}

			const trackAttrs: Record<string, any> = { typeof: 'MusicRecording' };
			if (src) trackAttrs['data-src'] = src;

			return new Tag('li', trackAttrs, trackChildrenArr);
		});

		const tracksOl = new Tag('ol', { 'data-name': 'tracks' }, trackChildren);

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

		// Layout meta tags
		const { metas: layoutMetas, children: layoutChildren } = buildLayoutMetas(attrs);
		const { layout: layoutMeta, ratio: ratioMeta, valign: valignMeta, gap: gapMeta, collapse: collapseMeta } = layoutMetas;

		// Meta tags for identity transform modifiers
		const typeMeta = new Tag('meta', { content: playlistTypeValue });
		const hasPlayerMeta = hasPlayer ? new Tag('meta', { content: 'true' }) : null;
		const artistMeta = artistValue ? new Tag('meta', { content: artistValue }) : null;
		const idMeta = idValue ? new Tag('meta', { content: idValue }) : null;

		// Structural wrapping — standard 3-section pattern (like recipe)
		const sectionProps = pageSectionProperties(header);

		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const bodyChildren: any[] = [];
		if (playerEl) bodyChildren.push(playerEl);
		bodyChildren.push(tracksOl);

		// Transform any remaining body content
		if (contentZone.body) {
			const bodyNodes = new RenderableNodeCursor(
				Markdoc.transform(asNodes(contentZone.body), config) as RenderableTreeNode[],
			);
			if (bodyNodes.count() > 0) {
				bodyChildren.push(...bodyNodes.toArray());
			}
		}

		const mainContent = new RenderableNodeCursor([
			...headerContent,
			...bodyChildren,
		]).wrap('div');

		// Unwrap paragraph-wrapped images in the media zone
		const mediaImgTag = extractMediaImage(side);
		const mediaCursor = mediaImgTag
			? new RenderableNodeCursor([mediaImgTag])
			: side;
		const mediaDiv = mediaCursor.wrap('div');
		const hasMedia = mediaCursor.toArray().length > 0;

		// Use the unwrapped image for SEO structured data
		const seoImage = mediaImgTag;

		const children: any[] = [
			typeMeta,
			...layoutChildren,
		];
		if (hasPlayerMeta) children.push(hasPlayerMeta);
		if (artistMeta) children.push(artistMeta);
		if (idMeta) children.push(idMeta);

		// Media before content so cover image appears at the top in stacked layout
		if (hasMedia) children.push(mediaDiv.next());
		children.push(mainContent.next());

		const trackItems = new RenderableNodeCursor(trackChildren);

		return createComponentRenderable(schema.Playlist, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				type: typeMeta,
				layout: layoutMeta,
				ratio: ratioMeta,
				valign: valignMeta,
				gap: gapMeta,
				collapse: collapseMeta,
				...(artistMeta ? { artist: artistMeta } : {}),
				...(idMeta ? { id: idMeta } : {}),
				track: trackItems,
			},
			refs: {
				...sectionProps,
				content: mainContent,
				media: mediaDiv,
			},
			schema: {
				name: sectionProps.headline,
				...(seoImage ? { image: seoImage } : {}),
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
