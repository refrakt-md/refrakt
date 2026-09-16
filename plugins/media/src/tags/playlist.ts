import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	asNodes,
	pageSectionProperties,
	RenderableNodeCursor,
	SplitLayoutModel,
	buildLayoutMetas,
	extractMediaImage,
} from '@refrakt-md/runes';
import { parseDuration, formatDuration } from '../duration.js';
import { TYPE_IMPLICIT } from './track.js';

const playlistType = ['album', 'podcast', 'audiobook', 'series', 'mix'] as const;

/**
 * The track kind a playlist gives a nested `{% track %}` that states none
 * (WORK-572). The parent retypes its children; a child never declares its
 * context (SPEC-130 D9), and Markdoc's bottom-up transform order means a child
 * could not see its parent even if it wanted to.
 */
const CHILD_KIND: Record<string, string> = {
	album: 'song',
	mix: 'song',
	podcast: 'episode',
	audiobook: 'chapter',
	series: 'episode',
};

const contentType = ['auto', 'lyrics', 'chapters'] as const;

/**
 * SPEC-130 / WORK-569 — the driving case, and the other half of BUG-013.
 *
 * `playlist` declared five kinds and published `MusicPlaylist` with
 * `MusicRecording` items for every one of them, so `{% playlist type="podcast" %}`
 * announced a podcast as a music playlist whose episodes were music recordings.
 * The rune already knew what its content was and emitted the wrong schema anyway.
 *
 * | `type`      | was                     | is                             |
 * |-------------|-------------------------|--------------------------------|
 * | `album`     | `MusicPlaylist`/`track` | `MusicAlbum`/`track`           |
 * | `mix`       | `MusicPlaylist`/`track` | unchanged                      |
 * | `podcast`   | `MusicPlaylist`/`track` | `PodcastSeries`/`hasPart`      |
 * | `audiobook` | `MusicPlaylist`/`track` | `Audiobook`/`hasPart`          |
 * | `series`    | `MusicPlaylist`/`track` | `CreativeWorkSeries`/`hasPart` |
 *
 * **A child row is a type and a property map, not a type alone.** Retyping the
 * item and leaving its stamps would put `byArtist` on a `PodcastEpisode`, which
 * does not have that property — worse than the `MusicRecording` it replaced,
 * which was at least coherently wrong. So the parent's map is the whole truth
 * for a child it retypes, and the applier clears what it does not name.
 *
 * `Chapter` for an `Audiobook` and `CreativeWork` for a `CreativeWorkSeries` are
 * the rows worth a second opinion. Nothing validates them (D5) — read them in
 * `refrakt inspect playlist --type=all` and disagree there.
 */
const MUSIC_ITEM = {
	'track-name': 'name',
	'track-artist': 'byArtist',
	duration: 'duration',
	'track-meta': 'datePublished',
	url: 'url',
	position: 'position',
} as const;

// Everything but the artist: `byArtist` is a `MusicRecording` property, and a
// series carries its publisher rather than each item doing so.
const SPOKEN_ITEM = {
	'track-name': 'name',
	duration: 'duration',
	'track-meta': 'datePublished',
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
	// No `byArtist` here either, for the same reason it is absent from the item.
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
	// The attribute defaults to `album` in the transform, so the absent case is
	// an album — and `MusicAlbum`, a subtype of `MusicPlaylist`, has been
	// available and unused the whole time.
	fallback: musicRow('MusicAlbum'),
};

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
// SPEC-125 Phase 1 — the `body` slot is the prose an author writes *after* the
// track list (`layout.content` places `tracks` and `body` separately), so it is
// both structurally the body and genuinely prose-bearing. The track list stays
// unroled: it is structured content the rune reinterprets, and mapping it to
// `body` would invent a `datatable`-shaped overload where none exists.
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
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		// Media-first body shape: `media --- content`. `content` is the primary
		// zone so a playlist without an `---` cover lands its whole body in content.
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
						// WORK-572 — `tag:track` alongside `list` so the composition the
						// docs promise works. Greedy because the two forms may alternate,
						// and greedy collection is *consecutive*: prose between two tracks
						// ends the run and pushes the rest to `body`. Documented on the
						// rune page rather than left for an author to discover.
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

		// Collect header AST nodes (title, description) and transform together
		const headerAstNodes = [contentZone.headline, contentZone.blurb].filter(Boolean) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		// Transform media zone
		const mediaAstNodes = (Array.isArray(mediaZone.media) ? mediaZone.media : []) as Node[];
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

			// WORK-569 — no `property=` here any more: `playlistSchema`'s child row
			// stamps both populations, so the list form and a nested `{% track %}`
			// take the same mapping instead of one being declared and one written
			// out by hand.
			const trackNameTag = new Tag('span', { 'data-name': 'track-name' }, [name]);
			const trackChildrenArr: any[] = [trackNameTag];

			if (artist) {
				trackChildrenArr.push(new Tag('span', { 'data-name': 'track-artist' }, [artist]));
			}
			if (duration) {
				trackChildrenArr.push(new Tag('span', { 'data-name': 'track-duration' }, [duration]));
				const durationSeconds = parseDuration(duration);
				// Named `duration`, matching what `{% track %}` calls its ISO carrier,
				// so one source reaches both forms. `track-duration` beside it is the
				// *rendered* value ("3:45") and stays unmapped — publishing that as a
				// schema.org duration is what naming them apart prevents.
				trackChildrenArr.push(
					new Tag('meta', { 'data-name': 'duration', content: `PT${durationSeconds}S` }),
				);
			}
			if (date) {
				trackChildrenArr.push(new Tag('span', { 'data-name': 'track-meta' }, [date]));
			}

			// Build cue point elements
			if (cuePoints.length > 0) {
				const cueListTag = buildCuePoints(cuePoints, contentMode);
				if (cueListTag) trackChildrenArr.push(cueListTag);
			}

			// No `typeof` either — the child row types these. A list item states no
			// kind of its own, so the parent is the only authority on what it is.
			const trackAttrs: Record<string, any> = {};
			if (src) trackAttrs['data-src'] = src;

			return new Tag('li', trackAttrs, trackChildrenArr);
		});

		// WORK-572 / BUG-016 — merge nested `{% track %}` children with the list
		// items, in document order.
		//
		// `resolved.tracks` holds the matched nodes in source order; `tracksData`
		// is the flat itemModel extraction across every list among them. Walking
		// the nodes and consuming `tracksData` by list length is what keeps the two
		// forms interleaved correctly, rather than appending one block after the
		// other.
		//
		// Before this, a `{% track %}` inside a `{% playlist %}` fell through to the
		// greedy `body` field: it rendered as an `<li>` outside any list and floated
		// up as a detached top-level entity, while the docs recommended the
		// composition.
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
				orderedTracks.push(adoptNestedTrack(li as any, childKind, artistValue));
			}
		}
		// Any list items a node walk missed (defensive: a shape the resolver
		// collected but this loop did not recognise) still belong in the listing.
		if (listCursor < trackChildren.length) orderedTracks.push(...trackChildren.slice(listCursor));

		const tracksOl = new Tag('ol', { 'data-name': 'tracks' }, orderedTracks);

		// Build player element (when player attribute is set)
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

		// Layout meta tags
		const { metas: layoutMetas, children: layoutChildren } = buildLayoutMetas(attrs);
		const {
			mediaPosition: mediaPositionMeta,
			mediaRatio: mediaRatioMeta,
			valign: valignMeta,
			collapse: collapseMeta,
		} = layoutMetas;

		// Meta tags for identity transform modifiers
		const typeMeta = new Tag('meta', { content: playlistTypeValue });
		const hasPlayerMeta = hasPlayer ? new Tag('meta', { content: 'true' }) : null;
		const artistMeta = artistValue ? new Tag('meta', { content: artistValue }) : null;
		const idMeta = idValue ? new Tag('meta', { content: idValue }) : null;

		// SPEC-081: emit flat `data-name` slots — the `layout` config builds the
		// content column (eyebrow block + preamble header + player + tracks +
		// body) and the split sees only media + content.
		const sectionProps = pageSectionProperties(header);

		// Transform any remaining body content, wrapped in a body slot.
		let bodyDiv: RenderableNodeCursor<Markdoc.Tag> | undefined;
		if (contentZone.body) {
			const bodyNodes = new RenderableNodeCursor(
				Markdoc.transform(asNodes(contentZone.body), config) as RenderableTreeNode[],
			);
			if (bodyNodes.count() > 0) {
				bodyDiv = bodyNodes.wrap('div') as RenderableNodeCursor<Markdoc.Tag>;
			}
		}

		// Unwrap paragraph-wrapped images in the media zone
		const mediaImgTag = extractMediaImage(side);
		const mediaCursor = mediaImgTag ? new RenderableNodeCursor([mediaImgTag]) : side;
		const mediaDiv = mediaCursor.wrap('div');
		const hasMedia = mediaCursor.toArray().length > 0;

		// Use the unwrapped image for SEO structured data
		const seoImage = mediaImgTag;

		const children: any[] = [typeMeta, ...layoutChildren];
		if (hasPlayerMeta) children.push(hasPlayerMeta);
		if (artistMeta) children.push(artistMeta);
		if (idMeta) children.push(idMeta);

		// Media before content so cover image appears at the top in stacked layout
		if (hasMedia) children.push(mediaDiv.next());
		children.push(...header.toArray());
		if (playerEl) children.push(playerEl);
		children.push(tracksOl);
		if (bodyDiv) children.push(bodyDiv.next());

		// WORK-572 — the merged, ordered set, not just the list items: this is the
		// cursor `schema: { track }` stamps `property="track"` onto, and an unstamped
		// child floats up as a detached top-level entity (BUG-016 symptom 2).
		const trackItems = new RenderableNodeCursor(orderedTracks);

		return createComponentRenderable({
			rune: 'playlist',
			tag: 'section',
			property: 'contentSection',
			properties: {
				type: typeMeta,
				'media-position': mediaPositionMeta,
				'media-ratio': mediaRatioMeta,
				valign: valignMeta,
				collapse: collapseMeta,
				...(artistMeta ? { artist: artistMeta } : {}),
				...(idMeta ? { id: idMeta } : {}),
				track: trackItems,
			},
			refs: {
				...sectionProps,
				...(bodyDiv ? { body: bodyDiv } : {}),
				media: mediaDiv,
				// WORK-561 — see the note on `recipe`: `image` is taken by
				// `sectionProps`, so the media slot's image is `mediaImage`.
				...(seoImage ? { mediaImage: seoImage } : {}),
			},
			children,
		});
	},
});

/**
 * Adopt a nested `{% track %}` into its playlist (WORK-572).
 *
 * Two channels, and they behave differently (SPEC-130 D9):
 *
 * - **`typeof` — what the child *is* — is the child's when stated, else the
 *   parent's child-row default.** The `TYPE_IMPLICIT` marker is how the parent
 *   tells those apart; without it an absent `type` and an explicit
 *   `type="song"` are the same value by transform time.
 * - **`property` — which collection it joins — is always the parent's**, and it
 *   is stamped by `createComponentRenderable`'s `schema:` map further down, not
 *   here. `collectJsonLd` nests a typed node only when it carries both `typeof`
 *   and `property`, so a child the parent never stamps floats free whatever type
 *   it has.
 *
 * The artist default rides along for the same reason the type does: the list
 * form does `track.artist ?? playlistArtist`, so without it the two forms would
 * disagree on `byArtist` and the equivalence would be false.
 */
function adoptNestedTrack(li: any, childKind: string, playlistArtist: string): any {
	if (!li || typeof li !== 'object') return li;

	if (!li[TYPE_IMPLICIT]) {
		// The marker means "the author stated this type" (WORK-569), so its absence
		// is what licenses adoption. The schema type is the applier's to set from
		// `playlistSchema`'s child row, and the marker stays on the node for it to
		// read; what is left here is the *rendered* modifier, so a podcast's nested
		// track does not present itself as a song.
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
		// Named rather than stamped, so the child row decides whether a playlist's
		// artist reaches the item at all — on a podcast or an audiobook it does
		// not, because the series carries its publisher.
		const artistMeta = new Markdoc.Tag('meta', {
			content: playlistArtist,
			'data-name': 'track-artist',
		});
		li.children = [...(li.children ?? []), artistMeta];
	}

	return li;
}

/** Whether a track already carries its own artist. */
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
		(c: any) =>
			c?.attributes?.property === 'byArtist' || c?.attributes?.['data-name'] === 'track-artist',
	);
}

/**
 * Build cue point list (chapters or lyrics) from extracted itemModel data.
 */
function buildCuePoints(cuePoints: Record<string, unknown>[], contentMode: string): any {
	if (cuePoints.length === 0) return null;

	// Detect content type: lyrics have timestamp at start with short text
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

	// Chapters
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
