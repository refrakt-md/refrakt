import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const aspectType = ['16:9', '4:3', '1:1', 'auto'] as const;

interface ProviderInfo {
	provider: string;
	embedUrl: string;
	type: string;
}

function detectProvider(url: string): ProviderInfo {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.replace('www.', '');

		// YouTube
		if (host === 'youtube.com' || host === 'youtu.be') {
			let videoId = '';
			if (host === 'youtu.be') {
				videoId = parsed.pathname.slice(1);
			} else {
				videoId = parsed.searchParams.get('v') || '';
			}
			return {
				provider: 'youtube',
				embedUrl: videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : url,
				type: 'video',
			};
		}

		// Vimeo
		if (host === 'vimeo.com') {
			const videoId = parsed.pathname.slice(1);
			return {
				provider: 'vimeo',
				embedUrl: `https://player.vimeo.com/video/${videoId}`,
				type: 'video',
			};
		}

		// Twitter / X
		if (host === 'twitter.com' || host === 'x.com') {
			return {
				provider: 'twitter',
				embedUrl: url,
				type: 'tweet',
			};
		}

		// CodePen
		if (host === 'codepen.io') {
			const embedUrl = url.replace('/pen/', '/embed/');
			return {
				provider: 'codepen',
				embedUrl,
				type: 'codepen',
			};
		}

		// Spotify
		if (host === 'open.spotify.com') {
			const embedUrl = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
			return {
				provider: 'spotify',
				embedUrl,
				type: 'spotify',
			};
		}
	} catch {
		// Invalid URL — fall through to generic
	}

	return {
		provider: 'generic',
		embedUrl: url,
		type: 'generic',
	};
}

export const embed = createContentModelSchema({
	attributes: {
		url: { type: String, required: true, description: 'URL of the content to embed' },
		type: { type: String, required: false, description: 'Override auto-detected embed type' },
		aspect: { type: String, required: false, matches: aspectType.slice(), description: 'Aspect ratio of the embed frame' },
		title: { type: String, required: false, description: 'Accessible title for the embed iframe' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'fallback', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const url = attrs.url ?? '';
		const detected = detectProvider(url);
		const resolvedType = attrs.type || detected.type;

		const urlMeta = new Tag('meta', { content: url });
		const typeMeta = new Tag('meta', { content: resolvedType });
		const aspectMeta = new Tag('meta', { content: attrs.aspect ?? '16:9' });
		const titleMeta = new Tag('meta', { content: attrs.title ?? '' });
		const embedUrlMeta = new Tag('meta', { content: detected.embedUrl });
		const providerMeta = new Tag('meta', { content: detected.provider });

		const fallback = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.fallback), config) as RenderableTreeNode[],
		).wrap('div');

		return createComponentRenderable(schema.Embed, {
			tag: 'figure',
			properties: {
				url: urlMeta,
				type: typeMeta,
				aspect: aspectMeta,
				title: titleMeta,
				embedUrl: embedUrlMeta,
				provider: providerMeta,
			},
			refs: {
				fallback: fallback.tag('div'),
			},
			schema: {
				name: titleMeta,
				contentUrl: urlMeta,
				embedUrl: embedUrlMeta,
			},
			children: [urlMeta, typeMeta, aspectMeta, titleMeta, embedUrlMeta, providerMeta, fallback.next()],
		});
	},
});
