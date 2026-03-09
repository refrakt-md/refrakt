import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';
import { parseDuration, formatDuration } from '../duration.js';

const trackType = ['song', 'episode', 'chapter', 'talk', 'video'] as const;

export const track = createContentModelSchema({
	attributes: {
		src: { type: String, required: false },
		artist: { type: String, required: false },
		duration: { type: String, required: false },
		number: { type: Number, required: false },
		date: { type: String, required: false },
		url: { type: String, required: false },
		type: { type: String, required: false, matches: trackType.slice() },
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
		const typeValue = (attrs.type as string) ?? 'song';

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
			? new Tag('meta', { content: duration.startsWith('PT') ? duration : `PT${parseDuration(duration)}S` })
			: undefined;
		const artistMeta = artist ? new Tag('meta', { content: artist }) : undefined;

		return createComponentRenderable(schema.Track, {
			tag: 'li',
			properties: {
				name: nameTag,
				...(artistMeta ? { artist: artistMeta } : {}),
				...(durationMeta ? { duration: durationMeta } : {}),
				type: typeMeta,
			},
			schema: {
				name: nameTag,
				...(durationMeta ? { duration: durationMeta } : {}),
			},
			children,
		});
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
