import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, renderNodes } from '../lib/index.js';
import type { ContentFieldDefinition, ContentModel, ResolvedContent } from '@refrakt-md/types';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { schemaHeaderRoles } from '../lib/header-roles.js';
import {
	attributionItemModel,
	readAttribution,
	renderAttributedQuote,
	splitInsideAttribution,
} from '../lib/attribution.js';
import { buildLayoutMetas, extractMediaImage, splitLayoutAttributes } from './common.js';

const alignType = ['start', 'center', 'end'] as const;
const headerModes = ['auto', 'headline', 'none'] as const;
type HeaderMode = (typeof headerModes)[number];
export const mediaKinds = ['portrait', 'cover', 'thumbnail', 'hero', 'icon'] as const;

export const sectionSections = {
	preamble: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'title',
	blurb: 'description',
	body: 'body',
	media: 'media',
} as const;

function headerFields(mode: HeaderMode): ContentFieldDefinition[] {
	const body: ContentFieldDefinition = { name: 'body', match: 'any', optional: true, greedy: true };
	if (mode === 'none') return [body];
	const members: ContentFieldDefinition[] =
		mode === 'headline'
			? [{ name: 'headline', match: 'heading' }]
			: [
					{ name: 'eyebrow', match: 'paragraph', optional: true },
					{ name: 'headline', match: 'heading' },
					{ name: 'blurb', match: 'paragraph', optional: true },
					{
						name: 'epigraph',
						match: '',
						optional: true,
						group: [
							{ name: 'epigraph-quote', match: 'blockquote' },
							{
								name: 'epigraph-attribution',
								match: 'paragraph',
								itemModel: attributionItemModel,
							},
						],
					},
				];
	return [{ name: 'header', match: '', optional: true, group: members }, body];
}

export function sectionContentModel(attrs: Record<string, any>): ContentModel {
	const fields = headerFields((attrs.header as HeaderMode) || 'auto');
	if (!attrs['media-position']) return { type: 'sequence', fields };
	return {
		type: 'delimited',
		delimiter: 'hr',
		zones: [
			{
				name: 'media',
				type: 'sequence',
				fields: [{ name: 'media', match: 'any', optional: true, greedy: true }],
			},
			{ name: 'content', primary: true, type: 'sequence', fields },
			{
				name: 'footer',
				type: 'sequence',
				fields: [{ name: 'footer', match: 'any', optional: true, greedy: true }],
			},
		],
	};
}

export const section = createContentModelSchema({
	sections: sectionSections,
	provides: ['prose'],
	base: splitLayoutAttributes,
	attributes: {
		align: {
			type: String,
			required: false,
			matches: alignType.slice(),
			description: 'Header alignment: start (default), center, or end',
		},
		header: {
			type: String,
			required: false,
			matches: headerModes.slice(),
			description:
				'Which header roles to read: auto (eyebrow, headline and blurb around a leading heading; the default), headline (only the heading), or none (all content is body)',
		},
		media: {
			type: String,
			required: false,
			matches: mediaKinds.slice(),
			description:
				'What the media zone holds, stamped as `data-media` so the media dimension styles it (portrait is cropped round)',
		},
		'guest-fit': {
			type: String,
			required: false,
			matches: ['clip', 'bleed'],
			description:
				'How the media zone holds its guest: clip (default) crops it to the zone, bleed lets it spill past',
		},
		'content-place': {
			type: String,
			required: false,
			description: 'Cover overlay anchor: "<block> <inline>" (e.g. "end start") or "auto"',
		},
		height: {
			type: String,
			required: false,
			matches: ['sm', 'md', 'lg', 'xl'],
			description: 'Intrinsic section height (named scale) for cover sections',
		},
		aspect: {
			type: String,
			required: false,
			description: 'Intrinsic section aspect ratio (e.g. "16/9") for cover sections',
		},
	},
	contentModel: sectionContentModel,
	transform(resolved, attrs, config) {
		const split = !!attrs['media-position'];
		const main = (split ? (resolved.content ?? {}) : resolved) as ResolvedContent;
		const asList = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []) as Node[];
		const parts = {
			eyebrow: main.eyebrow as Node | undefined,
			headline: main.headline as Node | undefined,
			blurb: main.blurb as Node | undefined,
			body: asList(main.body),
		};
		const zones = {
			media: split ? asList((resolved.media as ResolvedContent | undefined)?.media) : [],
			footer: split ? asList((resolved.footer as ResolvedContent | undefined)?.footer) : [],
		};

		const render = (node: Node | undefined) =>
			node
				? (new RenderableNodeCursor(
						Markdoc.transform([node], config) as RenderableTreeNode[],
					).toArray()[0] as InstanceType<typeof Tag> | undefined)
				: undefined;
		const eyebrow = render(parts.eyebrow);
		const headline = render(parts.headline);
		const blurb = render(parts.blurb);
		let epigraphQuote = main['epigraph-quote'] as Node | undefined;
		let epigraphSource = readAttribution(main['epigraph-attribution'] as Node | undefined);
		const mode = (attrs.header as HeaderMode) || 'auto';
		if (!epigraphQuote && mode === 'auto' && parts.headline) {
			const inside = splitInsideAttribution(parts.body[0]);
			if (inside) {
				epigraphQuote = inside.quote;
				epigraphSource = inside.attribution;
				parts.body = parts.body.slice(1);
			}
		}
		const epigraph =
			epigraphQuote && epigraphSource
				? renderAttributedQuote('epigraph', epigraphQuote, epigraphSource, config)
				: undefined;
		const headerNodes = [eyebrow, headline, blurb, epigraph].filter(
			Boolean,
		) as RenderableTreeNode[];
		const header = new RenderableNodeCursor(headerNodes);
		const body = renderNodes(parts.body, config).wrap('div');

		const align = (attrs.align as string) || 'start';
		const alignMeta = new Tag('meta', { content: align });

		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];

		if (!attrs['media-position']) {
			return createComponentRenderable({
				rune: 'section',
				tag: 'section',
				properties: {
					align: alignMeta,
				},
				refs: {
					eyebrow,
					headline,
					blurb,
					epigraph,
					body,
				},
				children: [...headerContent, body.next()],
			});
		}

		const { metas } = buildLayoutMetas(attrs);
		const meta = (name: string) =>
			attrs[name] ? new Tag('meta', { content: attrs[name] as string }) : undefined;

		let media: InstanceType<typeof Tag> | undefined;
		if (zones.media.length > 0) {
			const cursor = new RenderableNodeCursor(
				Markdoc.transform(zones.media, config) as RenderableTreeNode[],
			);
			const img = extractMediaImage(cursor);
			media = new Tag(
				'div',
				{ ...(attrs.media ? { 'data-media': attrs.media as string } : {}) },
				(img ? [img] : cursor.toArray()) as RenderableTreeNode[],
			);
		}
		const footer =
			zones.footer.length > 0
				? new Tag('footer', {}, Markdoc.transform(zones.footer, config) as RenderableTreeNode[])
				: undefined;
		const content = new Tag('div', {}, [
			...headerContent,
			body.next(),
			...(footer ? [footer] : []),
		] as RenderableTreeNode[]);

		return createComponentRenderable({
			rune: 'section',
			tag: 'section',
			properties: {
				align: alignMeta,
				'media-position': metas.mediaPosition,
				'media-ratio': metas.mediaRatio,
				valign: metas.valign,
				collapse: metas.collapse,
				'content-place': meta('content-place'),
				height: meta('height'),
				aspect: meta('aspect'),
				'guest-fit': meta('guest-fit'),
			},
			refs: {
				eyebrow,
				headline,
				blurb,
				epigraph,
				body,
				media,
				content,
				footer,
			},
			children: [...(media ? [media] : []), content],
		});
	},
});

schemaHeaderRoles.set(section, {
	roles: ['eyebrow', 'headline', 'blurb', 'epigraph-quote', 'epigraph-attribution'],
	model: sectionContentModel,
});
