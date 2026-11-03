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
} from '../lib/attribution.js';
import { buildLayoutMetas, extractMediaImage, splitLayoutAttributes } from './common.js';

const alignType = ['start', 'center', 'end'] as const;
const headerModes = ['auto', 'headline', 'none'] as const;
type HeaderMode = (typeof headerModes)[number];
export const mediaKinds = ['portrait', 'cover', 'thumbnail', 'hero', 'icon'] as const;

/**
 * A generic page section: the shared section header (eyebrow → headline →
 * blurb) followed by an arbitrary body. Unlike `feature`/`reveal`/`tabs`, the
 * body is content-agnostic — anything (a `bento`, a grid of cards, prose) — so a
 * preamble-less grid primitive can be introduced with a title and intro.
 */
// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
// `body` is the region after the header (SPEC-160 D1, WORK-651). It went
// undeclared, so `reading` and `dropcap` did nothing on a section, silently.
// `media` is the split's media zone (SPEC-160 D2, WORK-652), present only when
// `media-position` is given.
export const sectionSections = {
	preamble: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'title',
	blurb: 'description',
	body: 'body',
	media: 'media',
} as const;

/**
 * `section`'s content model, declared (SPEC-186 D5): the header grammar is a
 * group, so the transform, the composition audit and the editor read one
 * declaration rather than a hand-written reader.
 *
 * - **The header (ADR-046).** An eyebrow and a blurb exist only relative to a
 *   headline: the group matches a paragraph, a heading and a paragraph, the
 *   heading required, or takes nothing, and a paragraph with no heading after
 *   it is body. After the blurb, an attributed blockquote is the epigraph
 *   (SPEC-185 D5). `header="headline"` reads only a leading heading;
 *   `header="none"` reads no header at all.
 * - **The zones (SPEC-160 D2).** Opt-in: with no `media-position` every child
 *   is the body zone, so a `---` stays body content. With it, the children
 *   split on `---` into media, body (the zone a single group lands in) and
 *   footer, and the header is read from the body zone.
 */
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
					// SPEC-185 D5 — an epigraph: a quote and its attribution, optional
					// together and required within, so a quote without one stays body
					// and a lone attribution stays the blurb it already was.
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
		// SPEC-160 D7 — whether a media guest bleeds past its zone. A config
		// field on the native runes; an attribute here, since compositions placing
		// the same `section` need different fits.
		'guest-fit': {
			type: String,
			required: false,
			matches: ['clip', 'bleed'],
			description:
				'How the media zone holds its guest: clip (default) crops it to the zone, bleed lets it spill past',
		},
		// SPEC-089 cover knobs, as on `card`: `media-position="cover"` overlays the
		// content on the media well.
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
		// SPEC-186 D5 — the header is read from the declared model. With a split,
		// the header and body are the content zone's.
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
		// SPEC-185 D5 — the epigraph, a `<figure data-quote="epigraph">`.
		const epigraphQuote = main['epigraph-quote'] as Node | undefined;
		const epigraphSource = readAttribution(main['epigraph-attribution'] as Node | undefined);
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

		// No split: exactly the section it always was.
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

		// The split (SPEC-160 D2): media beside or above a `content` column that
		// holds the header, the body and the footer, keyed by the shared split
		// layout and cover dimension rather than by rune name.
		const { metas } = buildLayoutMetas(attrs);
		const meta = (name: string) =>
			attrs[name] ? new Tag('meta', { content: attrs[name] as string }) : undefined;

		// An empty leading zone means no media: the element is omitted, so a
		// template can emit the delimiter unconditionally (SPEC-145 D17).
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

// ADR-046 decision 3 — the roles a composition placing `section` is audited
// against, read through the same declared model the transform resolves.
schemaHeaderRoles.set(section, {
	roles: ['eyebrow', 'headline', 'blurb', 'epigraph-quote', 'epigraph-attribution'],
	model: sectionContentModel,
});
