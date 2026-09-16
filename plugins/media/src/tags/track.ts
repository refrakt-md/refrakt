import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	asNodes,
	RenderableNodeCursor,
} from '@refrakt-md/runes';
import { parseDuration, formatDuration } from '../duration.js';

const trackType = ['song', 'episode', 'chapter', 'talk', 'video'] as const;

/**
 * Marks a track whose `type` the author did not state (WORK-572).
 *
 * A own-property on the Tag object rather than an attribute, deliberately: it is
 * a transform-time hand-off from `track` to whichever parent adopts it, and
 * `JSON.parse(JSON.stringify(...))` at the serialize boundary drops it, so it
 * can never reach the HTML. `playlist` reads it to decide whether to retype a
 * nested child; a standalone track carries it nowhere.
 *
 * Needed because Markdoc transforms bottom-up — a child cannot see its parent —
 * so the *parent* retypes its children (SPEC-130 D9), and it can only do that if
 * it can tell "no type stated" from an explicit `type="song"`.
 */
export const TYPE_IMPLICIT = '__refraktTrackTypeImplicit';

export const track = createContentModelSchema({
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
		const titleNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.title), config) as RenderableTreeNode[],
		);

		// Extract track name from title heading or paragraph
		let nameText = '';
		const headingCursor = titleNodes.headings().limit(1);
		if (headingCursor.count() > 0) {
			nameText = extractText(headingCursor.next());
		} else {
			const pCursor = titleNodes.tag('p').limit(1);
			if (pCursor.count() > 0) nameText = extractText(pCursor.next());
		}

		// Transform body content (may contain chapters/lyrics as lists)
		const bodyNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		// Build track element
		const nameTag = new Tag('span', { 'data-name': 'track-name' }, [nameText]);
		const children: any[] = [nameTag];

		// Meta tags for identity transform
		const typeMeta = new Tag('meta', { content: typeValue });
		children.push(typeMeta);

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

		// WORK-572 — `artistMeta` and `durationMeta` were declared in `properties`
		// and `schema` but never pushed here, so they were stamped onto nodes that
		// were not in the tree: a standalone `{% track artist="Radiohead"
		// duration="4:01" %}` published its name and nothing else. The visible
		// `track-artist` / `track-duration` spans carry no `property=`, so
		// `collectProperties` never saw a value either.
		if (artistMeta) children.push(artistMeta);
		if (durationMeta) children.push(durationMeta);
		if (urlMeta) children.push(urlMeta);
		if (numberMeta) children.push(numberMeta);
		if (dateMeta) children.push(dateMeta);

		const renderable = createComponentRenderable({
			rune: 'track',
			schemaOrgType: 'MusicRecording',
			tag: 'li',
			properties: {
				name: nameTag,
				...(artistMeta ? { artist: artistMeta } : {}),
				...(durationMeta ? { duration: durationMeta } : {}),
				...(urlMeta ? { url: urlMeta } : {}),
				...(numberMeta ? { position: numberMeta } : {}),
				...(dateMeta ? { datePublished: dateMeta } : {}),
				type: typeMeta,
			},
			schema: {
				name: nameTag,
				...(artistMeta ? { byArtist: artistMeta } : {}),
				...(durationMeta ? { duration: durationMeta } : {}),
				...(urlMeta ? { url: urlMeta } : {}),
				...(numberMeta ? { position: numberMeta } : {}),
				...(dateMeta ? { datePublished: dateMeta } : {}),
			},
			children,
		});

		// `rootAttrs` was assembled and then never applied, so `src` was dropped on
		// a standalone track — the audio file the author pointed at reached nothing.
		Object.assign((renderable as any).attributes, rootAttrs);
		if (explicitType === undefined) (renderable as any)[TYPE_IMPLICIT] = true;
		return renderable;
	},
});

function extractText(tag: any): string {
	if (!tag) return '';
	if (typeof tag === 'string') return tag;
	if (tag.children) {
		return tag.children.map(extractText).join('');
	}
	return '';
}
