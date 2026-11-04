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
import { parseDuration } from '../duration.js';

const trackType = ['song', 'episode', 'chapter', 'talk', 'video'] as const;

export const TYPE_IMPLICIT = SCHEMA_TYPE_EXPLICIT;

const trackCommon = {
	name: 'name',
	duration: 'duration',
	url: 'url',
	position: 'position',
	date: 'datePublished',
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
		meta: {
			type: String,
			required: false,
			matches: ['row', 'byline'],
			description:
				'Where the artist, date and running time sit: in the row beside the name (`row`), or beneath it (`byline`). A playlist passes its own to its tracks.',
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
		// An absent `type` stays absent, so a nested track can take its playlist's.
		const explicitType = attrs.type as string | undefined;
		const typeValue = explicitType ?? 'song';

		const titleNodes = renderNodes(resolved.title, config);

		let nameText = '';
		const headingCursor = titleNodes.headings().limit(1);
		if (headingCursor.count() > 0) {
			nameText = textContent(headingCursor.next());
		} else {
			const pCursor = titleNodes.tag('p').limit(1);
			if (pCursor.count() > 0) nameText = textContent(pCursor.next());
		}

		const bodyNodes = renderNodes(resolved.body, config);

		const nameTag = new Tag('span', { 'data-name': 'track-name' }, [nameText]);
		const children: any[] = [nameTag];

		const typeMeta = new Tag('meta', { content: typeValue });

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
		const metaMeta = attrs.meta ? new Tag('meta', { content: attrs.meta as string }) : undefined;

		const renderable = createComponentRenderable({
			rune: 'track',
			tag: 'li',
			properties: {
				name: nameTag,
				artist: artistMeta,
				duration: durationMeta,
				url: urlMeta,
				position: numberMeta,
				date: dateMeta,
				type: typeMeta,
				meta: metaMeta,
			},
			children,
		});

		Object.assign((renderable as any).attributes, rootAttrs);
		if (explicitType !== undefined) (renderable as any)[TYPE_IMPLICIT] = true;
		return renderable;
	},
});
