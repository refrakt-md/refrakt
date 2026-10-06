import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	renderNodes,
	SCHEMA_TYPE_EXPLICIT,
	textContent,
} from '@refrakt-md/runes';
import { parseDuration, formatDuration } from '../duration.js';

const trackType = ['song', 'episode', 'chapter', 'talk', 'video'] as const;

/**
 * Marks a track whose `type` the author **did** state (WORK-572 / WORK-569).
 *
 * WORK-572 introduced this the other way round, as "the author stated nothing",
 * because `playlist` was the only reader and adoption was the special case.
 * WORK-569 moved it into the applier and inverted it: D9's default is that a
 * parent retypes its children, so what needs marking is the exception — a type
 * the author wrote, which no parent may overrule.
 *
 * Re-exported under the old name because `playlist` also reads it to decide
 * whether to adopt the *rendered* kind, which is not a schema concern.
 */
export const TYPE_IMPLICIT = SCHEMA_TYPE_EXPLICIT;

/**
 * SPEC-130 / WORK-569 — `track` keys off the enum its author already set.
 *
 * The rune declared five kinds and emitted `MusicRecording` for all of them, so
 * `{% track type="episode" %}` published a podcast episode as a music
 * recording. Half of BUG-013; `playlist` is the other half, and the two tables
 * are independent — neither rune declares anything about the other (D9).
 *
 * **`byArtist` is on the music row only.** It belongs to `MusicRecording`; a
 * `PodcastEpisode`, `Chapter`, `CreativeWork` or `VideoObject` does not have it,
 * and carrying it across would be worse than the type it replaced, which was at
 * least coherently wrong. Mapping the artist to `author` on those rows is
 * arguable and deliberately not done here: `author` expects a Person or
 * Organization and the value is a bare string, so it is a new claim rather than
 * a relocation. Nothing checks either judgement (D5) — read the row in
 * `refrakt inspect` and disagree there.
 *
 * `talk` is the row with no obvious type. `CreativeWork` is the honest answer:
 * schema.org has no talk, and `PresentationDigitalDocument` describes the slides
 * rather than the talk.
 */
const trackCommon = {
	name: 'name',
	duration: 'duration',
	url: 'url',
	position: 'position',
	datePublished: 'datePublished',
} as const;

export const trackSchema = {
	by: 'type',
	rows: {
		song: { type: 'MusicRecording', properties: { ...trackCommon, artist: 'byArtist' } },
		episode: { type: 'PodcastEpisode', properties: trackCommon },
		chapter: { type: 'Chapter', properties: trackCommon },
		talk: { type: 'CreativeWork', properties: trackCommon },
		video: { type: 'VideoObject', properties: trackCommon },
	},
	// A standalone track with no stated kind is a song, matching the `'song'`
	// fallback the transform has always used. Nested, the marker above lets its
	// playlist replace this.
	fallback: { type: 'MusicRecording', properties: { ...trackCommon, artist: 'byArtist' } },
};

export const track = createContentModelSchema({
	schema: trackSchema,
	attributes: {
		src: {
			type: String,
			required: false,
			description: 'URL of the audio or video file for this track.',
		},
		artist: {
			type: String,
			required: false,
			description: 'Performer or creator name for this track.',
		},
		duration: {
			type: String,
			required: false,
			description: 'Track length in m:ss, h:mm:ss, or ISO 8601 duration format.',
		},
		number: {
			type: Number,
			required: false,
			description: 'Position number of the track in its parent listing.',
		},
		date: {
			type: String,
			required: false,
			description: 'Publication or release date for the track.',
		},
		url: {
			type: String,
			required: false,
			description: 'External link to the track on a streaming platform or website.',
		},
		type: {
			type: String,
			required: false,
			matches: trackType.slice(),
			description: 'Media category: song, episode, chapter, talk, or video.',
		},
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'title', match: 'heading|paragraph', optional: true },
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const src = (attrs.src as string) ?? '';
		const artist = (attrs.artist as string) ?? '';
		const duration = (attrs.duration as string) ?? '';
		const number = attrs.number as number | undefined;
		const date = (attrs.date as string) ?? '';
		const url = (attrs.url as string) ?? '';
		// WORK-572 — an absent `type` and an explicit `type="song"` must stay
		// distinguishable. Coalescing here made them identical by transform time,
		// so "no explicit type → inherit the playlist's" could never fire. The
		// `'song'` default is now the *standalone* fallback only; a nested track
		// with no explicit type is retyped by its parent (SPEC-130 D9 — the parent
		// retypes its children; a child never declares its context).
		const explicitType = attrs.type as string | undefined;
		const typeValue = explicitType ?? 'song';

		// Transform title
		const titleNodes = renderNodes(resolved.title, config);

		// Extract track name from title heading or paragraph
		let nameText = '';
		const headingCursor = titleNodes.headings().limit(1);
		if (headingCursor.count() > 0) {
			nameText = textContent(headingCursor.next());
		} else {
			const pCursor = titleNodes.tag('p').limit(1);
			if (pCursor.count() > 0) nameText = textContent(pCursor.next());
		}

		// Transform body content (may contain chapters/lyrics as lists)
		const bodyNodes = renderNodes(resolved.body, config);

		// Build track element
		const nameTag = new Tag('span', { 'data-name': 'track-name' }, [nameText]);
		const children: any[] = [nameTag];

		// Meta tags for identity transform
		const typeMeta = new Tag('meta', { content: typeValue });

		if (artist) {
			children.push(new Tag('span', { 'data-name': 'track-artist' }, [artist]));
		}
		if (duration) {
			const formatted = duration.startsWith('PT')
				? formatDuration(parseDuration(duration))
				: duration;
			children.push(new Tag('span', { 'data-name': 'track-duration' }, [formatted]));
		}
		if (date) {
			children.push(new Tag('span', { 'data-name': 'track-meta' }, [date]));
		}

		// Add body content
		if (bodyNodes.count() > 0) {
			children.push(bodyNodes.wrap('div', { 'data-name': 'track-description' }).next());
		}

		const rootAttrs: Record<string, any> = {};
		if (src) rootAttrs['data-src'] = src;

		const durationMeta = duration
			? new Tag('meta', {
					content: duration.startsWith('PT') ? duration : `PT${parseDuration(duration)}S`,
				})
			: undefined;
		const artistMeta = artist ? new Tag('meta', { content: artist }) : undefined;
		const urlMeta = url ? new Tag('meta', { content: url }) : undefined;
		const numberMeta =
			number !== undefined ? new Tag('meta', { content: String(number) }) : undefined;
		const dateMeta = date ? new Tag('meta', { content: date }) : undefined;

		const renderable = createComponentRenderable({
			rune: 'track',
			tag: 'li',
			properties: {
				name: nameTag,
				artist: artistMeta,
				duration: durationMeta,
				url: urlMeta,
				position: numberMeta,
				datePublished: dateMeta,
				type: typeMeta,
			},
			children,
		});

		// `rootAttrs` was assembled and then never applied, so `src` was dropped on
		// a standalone track — the audio file the author pointed at reached nothing.
		Object.assign((renderable as any).attributes, rootAttrs);
		if (explicitType !== undefined) (renderable as any)[TYPE_IMPLICIT] = true;
		return renderable;
	},
});
