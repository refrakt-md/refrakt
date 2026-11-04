import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	renderNodes,
	pageSectionProperties,
	RenderableNodeCursor,
	SplitLayoutModel,
	buildLayoutMetas,
	extractMediaImage,
} from '@refrakt-md/runes';
import { parseDuration, formatDuration } from '../duration.js';
import { TYPE_IMPLICIT } from './track.js';

const playlistType = ['album', 'podcast', 'audiobook', 'series', 'mix'] as const;

const CHILD_KIND: Record<string, string> = {
	album: 'song',
	mix: 'song',
	podcast: 'episode',
	audiobook: 'chapter',
	series: 'episode',
};

const contentType = ['auto', 'lyrics', 'chapters'] as const;

const MUSIC_ITEM = {
	'track-name': 'name',
	artist: 'byArtist',
	duration: 'duration',
	date: 'datePublished',
	url: 'url',
	position: 'position',
} as const;

const SPOKEN_ITEM = {
	'track-name': 'name',
	duration: 'duration',
	date: 'datePublished',
	url: 'url',
	position: 'position',
} as const;

const musicRow = (type: string) => ({
	type,
	properties: { headline: 'name', mediaImage: 'image', artist: 'byArtist' },
	lists: ['track'],
	children: { track: { type: 'MusicRecording', property: 'track', properties: MUSIC_ITEM } },
});

const spokenRow = (type: string, itemType: string) => ({
	type,
	properties: { headline: 'name', mediaImage: 'image' },
	lists: ['hasPart'],
	children: { track: { type: itemType, property: 'hasPart', properties: SPOKEN_ITEM } },
});

export const playlistSchema = {
	by: 'type',
	rows: {
		album: musicRow('MusicAlbum'),
		mix: musicRow('MusicPlaylist'),
		podcast: spokenRow('PodcastSeries', 'PodcastEpisode'),
		audiobook: spokenRow('Audiobook', 'Chapter'),
		series: spokenRow('CreativeWorkSeries', 'CreativeWork'),
	},
	fallback: musicRow('MusicAlbum'),
};

export const playlistSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
	media: 'media',
	body: 'body',
} as const;
export const playlistMediaSlots = { media: 'cover' } as const;

export const playlist = createContentModelSchema({
	schema: playlistSchema,
	sections: playlistSections,
	provides: ['prose'],
	mediaSlots: playlistMediaSlots,
	base: SplitLayoutModel,
	attributes: {
		type: {
			type: String,
			required: false,
			matches: playlistType.slice(),
			description: 'Collection format: album, podcast, audiobook, series, or mix.',
		},
		artist: {
			type: String,
			required: false,
			description: 'Default artist applied to tracks that omit their own.',
		},
		player: {
			type: Boolean,
			required: false,
			description: 'Enable/disable an embedded audio player for the playlist.',
		},
		content: {
			type: String,
			required: false,
			matches: contentType.slice(),
			description: 'How nested lists are interpreted: auto-detect, lyrics, or chapters.',
		},
		id: {
			type: String,
			required: false,
			description: 'Unique identifier used to link an audio rune to this playlist.',
		},
		meta: {
			type: String,
			required: false,
			matches: ['row', 'byline'],
			description:
				"Where each track's artist, date and running time sit: in its row (`row`) or beneath its name (`byline`). A track's own `meta` wins.",
		},
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		zones: [
			{
				name: 'media',
				type: 'sequence',
				fields: [{ name: 'media', match: 'any', optional: true, greedy: true }],
			},
			{
				name: 'content',
				primary: true,
				type: 'sequence',
				fields: [
					{
						name: 'headline',
						match: 'heading',
						optional: false,
						template: '# Playlist Name',
						description: 'Playlist title',
					},
					{
						name: 'blurb',
						match: 'paragraph',
						optional: true,
						template: 'A description of this playlist.',
						description: 'Playlist description',
					},
					{
						name: 'tracks',
						match: 'list|tag:track',
						greedy: true,
						optional: false,
						description: 'Track listing',
						template: '- **Track Name** (3:45)\n- **Another Track** (4:20)',
						itemModel: {
							fields: [
								{ name: 'name', match: 'strong', optional: false },
								{ name: 'src', match: 'link', optional: true, extract: 'href' },
								{ name: 'artist', match: 'em', optional: true },
								{
									name: 'duration',
									match: 'text',
									optional: true,
									pattern: /\((\d+:\d+(?::\d+)?)\)/,
								},
								{ name: 'date', match: 'text', optional: true, pattern: /—\s*(.+)$/ },
								{ name: 'description', match: 'paragraph', optional: true, greedy: true },
								{
									name: 'cuePoints',
									match: 'list',
									optional: true,
									itemModel: {
										fields: [
											{
												name: 'time',
												match: 'text',
												optional: true,
												pattern: /\(?(\d+:\d+(?::\d+)?)\)?/,
											},
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
		const metaValue = attrs.meta as string | undefined;

		const headerAstNodes = [contentZone.headline, contentZone.blurb].filter(Boolean) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		const mediaAstNodes = (Array.isArray(mediaZone.media) ? mediaZone.media : []) as Node[];
		const side = new RenderableNodeCursor(
			Markdoc.transform(mediaAstNodes, config) as RenderableTreeNode[],
		);

		const tracksData = (contentZone.tracksData as Record<string, unknown>[] | undefined) ?? [];

		const trackChildren = tracksData.map((track, index) => {
			const name = (track.name as string) ?? '';
			const src = (track.src as string) ?? '';
			const artist = (track.artist as string) ?? artistValue;
			const duration = (track.duration as string) ?? '';
			const date = (track.date as string)?.trim() ?? '';
			const cuePoints = (track.cuePoints as Record<string, unknown>[] | undefined) ?? [];

			const trackNameTag = new Tag('span', { 'data-name': 'track-name' }, [name]);
			const trackChildrenArr: any[] = [trackNameTag];

			const bag: Record<string, string> = {};
			if (artist) {
				bag.artist = artist;
				trackChildrenArr.push(new Tag('meta', { 'data-name': 'artist', content: artist }));
			}
			if (duration) {
				const iso = `PT${parseDuration(duration)}S`;
				bag.duration = iso;
				trackChildrenArr.push(new Tag('meta', { 'data-name': 'duration', content: iso }));
			}
			if (date) {
				bag.date = date;
				trackChildrenArr.push(new Tag('meta', { 'data-name': 'date', content: date }));
			}
			if (metaValue) bag.meta = metaValue;

			if (cuePoints.length > 0) {
				const cueListTag = buildCuePoints(cuePoints, contentMode);
				if (cueListTag) trackChildrenArr.push(cueListTag);
			}

			const trackAttrs: Record<string, any> = {
				'data-rune': 'track',
				'data-rune-fields': JSON.stringify(bag),
				elevation: 'flush',
			};
			if (src) trackAttrs['data-src'] = src;

			return new Tag('li', trackAttrs, trackChildrenArr);
		});

		const trackNodes = (contentZone.tracks ?? []) as Node[];
		const childKind = CHILD_KIND[playlistTypeValue] ?? 'song';
		const orderedTracks: any[] = [];
		let listCursor = 0;
		for (const node of Array.isArray(trackNodes) ? trackNodes : [trackNodes]) {
			if (!node || typeof node !== 'object') continue;
			if ((node as Node).type === 'list') {
				const count = ((node as Node).children ?? []).length;
				orderedTracks.push(...trackChildren.slice(listCursor, listCursor + count));
				listCursor += count;
				continue;
			}
			const transformed = new RenderableNodeCursor(
				Markdoc.transform([node], config) as RenderableTreeNode[],
			)
				.tag('li')
				.toArray();
			for (const li of transformed) {
				orderedTracks.push(adoptNestedTrack(li as any, childKind, artistValue, metaValue));
			}
		}
		if (listCursor < trackChildren.length) orderedTracks.push(...trackChildren.slice(listCursor));

		const tracksOl = new Tag('ol', {}, orderedTracks);

		let playerEl: any = null;
		if (hasPlayer) {
			const playerData = tracksData.map((track) => {
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

		const { metas: layoutMetas } = buildLayoutMetas(attrs);
		const {
			mediaPosition: mediaPositionMeta,
			mediaRatio: mediaRatioMeta,
			valign: valignMeta,
			collapse: collapseMeta,
		} = layoutMetas;

		const typeMeta = new Tag('meta', { content: playlistTypeValue });
		const hasPlayerMeta = hasPlayer ? new Tag('meta', { content: 'true' }) : null;
		const artistMeta = artistValue ? new Tag('meta', { content: artistValue }) : null;
		const idMeta = idValue ? new Tag('meta', { content: idValue }) : null;

		const sectionProps = pageSectionProperties(header);

		let bodyDiv: RenderableNodeCursor<Markdoc.Tag> | undefined;
		if (contentZone.body) {
			const bodyNodes = renderNodes(contentZone.body, config);
			if (bodyNodes.count() > 0) {
				bodyDiv = bodyNodes.wrap('div') as RenderableNodeCursor<Markdoc.Tag>;
			}
		}

		const mediaImgTag = extractMediaImage(side);
		const mediaCursor = mediaImgTag ? new RenderableNodeCursor([mediaImgTag]) : side;
		const mediaDiv = mediaCursor.wrap('div');
		const hasMedia = mediaCursor.toArray().length > 0;

		const seoImage = mediaImgTag;

		const children: any[] = [];
		if (hasPlayerMeta) children.push(hasPlayerMeta);

		if (hasMedia) children.push(mediaDiv.next());
		children.push(...header.toArray());
		if (playerEl) children.push(playerEl);
		children.push(tracksOl);
		if (bodyDiv) children.push(bodyDiv.next());

		const trackItems = new RenderableNodeCursor(orderedTracks);

		return createComponentRenderable({
			rune: 'playlist',
			tag: 'section',
			properties: {
				type: typeMeta,
				'media-position': mediaPositionMeta,
				'media-ratio': mediaRatioMeta,
				valign: valignMeta,
				collapse: collapseMeta,
				artist: artistMeta,
				id: idMeta,
				track: trackItems,
			},
			refs: {
				...sectionProps,
				body: bodyDiv,
				tracks: tracksOl,
				media: mediaDiv,
				mediaImage: seoImage,
			},
			children,
		});
	},
});

function adoptNestedTrack(
	li: any,
	childKind: string,
	playlistArtist: string,
	playlistMeta?: string,
): any {
	if (!li || typeof li !== 'object') return li;

	if (!li[TYPE_IMPLICIT]) {
		const raw = li.attributes['data-rune-fields'];
		if (typeof raw === 'string') {
			try {
				const bag = JSON.parse(raw);
				bag.type = childKind;
				li.attributes['data-rune-fields'] = JSON.stringify(bag);
			} catch {
				// A malformed bag is not this function's to repair.
			}
		}
		for (const child of li.children ?? []) {
			if (child?.name === 'meta' && child.attributes?.['data-field'] === 'type') {
				child.attributes.content = childKind;
			}
		}
	}

	if (playlistArtist && !hasArtist(li)) {
		const artistMeta = new Markdoc.Tag('meta', {
			content: playlistArtist,
			'data-name': 'artist',
		});
		li.children = [...(li.children ?? []), artistMeta];
	}

	if (li.attributes.elevation === undefined) li.attributes.elevation = 'flush';

	const inherited: Record<string, string> = {};
	if (playlistMeta) inherited.meta = playlistMeta;
	if (playlistArtist) inherited.artist = playlistArtist;
	if (Object.keys(inherited).length > 0) {
		const raw = li.attributes['data-rune-fields'];
		try {
			const bag = typeof raw === 'string' ? JSON.parse(raw) : {};
			for (const [k, v] of Object.entries(inherited)) if (!bag[k]) bag[k] = v;
			li.attributes['data-rune-fields'] = JSON.stringify(bag);
		} catch {
			// A malformed bag is not this function's to repair.
		}
	}

	return li;
}

function hasArtist(li: any): boolean {
	const raw = li.attributes?.['data-rune-fields'];
	if (typeof raw === 'string') {
		try {
			if (JSON.parse(raw).artist) return true;
		} catch {
			// fall through to the node scan
		}
	}
	return (li.children ?? []).some(
		(c: any) => c?.attributes?.property === 'byArtist' || c?.attributes?.['data-name'] === 'artist',
	);
}

function buildCuePoints(cuePoints: Record<string, unknown>[], contentMode: string): any {
	if (cuePoints.length === 0) return null;

	const isLyrics =
		contentMode === 'lyrics' ||
		(contentMode === 'auto' &&
			cuePoints.every(
				(cp) => cp.time && typeof cp.text === 'string' && (cp.text as string).length < 100,
			));

	if (isLyrics) {
		const lyricItems = cuePoints.map((cp) => {
			const attrs: Record<string, any> = {};
			if (cp.time) attrs['data-time'] = String(parseDuration(cp.time as string));
			return new Tag('li', attrs, [
				new Tag('p', { 'data-name': 'lyric' }, [(cp.text as string) ?? '']),
			]);
		});
		return new Tag('ol', { 'data-name': 'lyrics' }, lyricItems);
	}

	const chapterItems = cuePoints.map((cp) => {
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
