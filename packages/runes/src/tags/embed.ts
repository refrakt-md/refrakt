import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

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

class EmbedModel extends Model {
	@attribute({ type: String, required: true })
	url: string;

	@attribute({ type: String, required: false })
	type: string = '';

	@attribute({ type: String, required: false, matches: aspectType.slice() })
	aspect: typeof aspectType[number] = '16:9';

	@attribute({ type: String, required: false })
	title: string = '';

	transform(): RenderableTreeNodes {
		const detected = detectProvider(this.url);
		const resolvedType = this.type || detected.type;

		const urlMeta = new Tag('meta', { content: this.url });
		const typeMeta = new Tag('meta', { content: resolvedType });
		const aspectMeta = new Tag('meta', { content: this.aspect });
		const titleMeta = new Tag('meta', { content: this.title });
		const embedUrlMeta = new Tag('meta', { content: detected.embedUrl });
		const providerMeta = new Tag('meta', { content: detected.provider });

		const fallback = this.transformChildren().wrap('div');

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
			children: [urlMeta, typeMeta, aspectMeta, titleMeta, embedUrlMeta, providerMeta, fallback.next()],
		});
	}
}

export const embed = createSchema(EmbedModel);
