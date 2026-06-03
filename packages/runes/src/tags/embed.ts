import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
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
		const aspect = attrs.aspect ?? '16:9';
		const iframeTitle = (attrs.title as string) || 'Embedded content';

		// SPEC-081: build the structure here (it is deterministic from authored
		// data — provider/embed-url are derived above), not in a postTransform.
		const [w, h] = aspect.split(':').map(Number);
		const paddingPercent = h && w ? (h / w) * 100 : 56.25;

		// SEO carriers (schema channel — render inline as RDFa, empties dropped).
		const urlMeta = new Tag('meta', { content: url });
		const titleMeta = new Tag('meta', { content: attrs.title ?? '' });
		const embedUrlMeta = new Tag('meta', { content: detected.embedUrl });

		// `provider` rides the bag only (→ `data-provider` via the modifier);
		// no field-meta is emitted.
		const providerMeta = new Tag('meta', { content: detected.provider });

		const fallback = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.fallback), config) as RenderableTreeNode[],
		).wrap('div');
		const fallbackDiv = fallback.tag('div');

		const children: any[] = [urlMeta, titleMeta, embedUrlMeta];
		let wrapperDiv: InstanceType<typeof Tag> | undefined;
		if (detected.embedUrl) {
			const iframe = new Tag('iframe', {
				src: detected.embedUrl,
				title: iframeTitle,
				frameborder: '0',
				allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
				allowfullscreen: '',
				loading: 'lazy',
			}, []);
			wrapperDiv = new Tag('div', { style: `padding-bottom: ${paddingPercent}%` }, [iframe]);
			children.push(wrapperDiv);
		}
		children.push(fallback.next());

		return createComponentRenderable({ rune: 'embed', schemaOrgType: 'VideoObject',
			tag: 'figure',
			properties: {
				provider: providerMeta,
			},
			refs: {
				...(wrapperDiv ? { wrapper: wrapperDiv } : {}),
				fallback: fallbackDiv,
			},
			schema: {
				name: titleMeta,
				contentUrl: urlMeta,
				embedUrl: embedUrlMeta,
			},
			children,
		});
	},
});
