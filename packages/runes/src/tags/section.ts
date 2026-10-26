import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, renderNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { schemaHeaderRoles } from '../lib/header-roles.js';
import {
	buildLayoutMetas,
	extractMediaImage,
	splitLayoutAttributes,
	splitMediaBodyFooter,
} from './common.js';

const alignType = ['start', 'center', 'end'] as const;
const headerModes = ['auto', 'headline', 'none'] as const;
type HeaderMode = (typeof headerModes)[number];
const mediaKinds = ['portrait', 'cover', 'thumbnail', 'hero', 'icon'] as const;

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
	headline: 'title',
	blurb: 'description',
	body: 'body',
	media: 'media',
} as const;

export interface SectionHeaderParts {
	eyebrow?: Node;
	headline?: Node;
	blurb?: Node;
	body: Node[];
}

/**
 * The header grammar, anchored to the headline — ADR-046.
 *
 * Eyebrow and blurb exist only relative to a headline: an eyebrow is a
 * paragraph directly before it, a blurb a paragraph directly after it. With no
 * leading heading there is no header, and all content is body.
 *
 * - `auto` reads all three;
 * - `headline` lifts only a leading heading, so the paragraph after it stays body;
 * - `none` reads no header at all.
 *
 * `nodes` are the section's children in source order. It is also the reader
 * compositions audit their slots against, so the check and the rendering
 * cannot disagree.
 */
export function sectionHeaderParts(
	nodes: readonly Node[],
	mode: HeaderMode = 'auto',
): SectionHeaderParts {
	const isH = (n: Node | undefined) => n?.type === 'heading';
	const isP = (n: Node | undefined) => n?.type === 'paragraph';
	const all = [...nodes];
	if (mode === 'none') return { body: all };
	if (mode === 'headline') {
		return isH(all[0]) ? { headline: all[0], body: all.slice(1) } : { body: all };
	}
	let i = 0;
	let eyebrow: Node | undefined;
	if (isP(all[0]) && isH(all[1])) eyebrow = all[i++];
	if (!isH(all[i])) return { body: all };
	const headline = all[i++];
	const blurb = isP(all[i]) ? all[i++] : undefined;
	return { eyebrow, headline, blurb, body: all.slice(i) };
}

/**
 * The zones a section reads — SPEC-160 D2. Zoning is opt-in: with no
 * `media-position` every child is the body zone, so a `---` stays body content
 * and every existing section renders as before. With it, the children split on
 * `---` by `card`'s rule (media / body / footer), and the header grammar reads
 * the body zone.
 */
export function sectionZones(
	nodes: readonly Node[],
	attrs: Record<string, unknown>,
): { media: Node[]; body: Node[]; footer: Node[] } {
	if (!attrs['media-position']) return { media: [], body: [...nodes], footer: [] };
	return splitMediaBodyFooter([...nodes]);
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
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'eyebrow', match: 'paragraph', optional: true },
			{ name: 'headline', match: 'heading', optional: true },
			{ name: 'blurb', match: 'paragraph', optional: true },
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		// The sequence matches in source order, so its fields put back together
		// are the children as written. The grammar is then applied to them, rather
		// than taken from the sequence, which would read a paragraph with no
		// heading after it as an eyebrow (ADR-046).
		const written = [resolved.eyebrow, resolved.headline, resolved.blurb, resolved.body]
			.flat()
			.filter(Boolean) as Node[];
		const zones = sectionZones(written, attrs);
		const parts = sectionHeaderParts(zones.body, (attrs.header as HeaderMode) || 'auto');

		const render = (node: Node | undefined) =>
			node
				? (new RenderableNodeCursor(
						Markdoc.transform([node], config) as RenderableTreeNode[],
					).toArray()[0] as InstanceType<typeof Tag> | undefined)
				: undefined;
		const eyebrow = render(parts.eyebrow);
		const headline = render(parts.headline);
		const blurb = render(parts.blurb);
		const headerNodes = [eyebrow, headline, blurb].filter(Boolean) as RenderableTreeNode[];
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
			},
			refs: {
				eyebrow,
				headline,
				blurb,
				body,
				media,
				content,
				footer,
			},
			children: [...(media ? [media] : []), content],
		});
	},
});

schemaHeaderRoles.set(section, (children, attrs) => {
	const { body } = sectionZones(children, attrs);
	const parts = sectionHeaderParts(body, (attrs.header as HeaderMode) || 'auto');
	return (['eyebrow', 'headline', 'blurb'] as const)
		.filter((role) => parts[role])
		.map((role) => ({ role, node: parts[role] as Node }));
});
