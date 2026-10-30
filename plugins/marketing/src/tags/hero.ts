import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	RenderableNodeCursor,
	SplitLayoutModel,
	buildActions,
	buildLayoutMetas,
	pageSectionProperties,
	extractMediaImage,
	unwrapParagraphImages,
} from '@refrakt-md/runes';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const heroSections = {
	preamble: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'title',
	blurb: 'description',
	media: 'media',
} as const;
export const heroMediaSlots = { media: 'hero' } as const;

/** SPEC-181 D7 — the composed `hero`'s `align` values, as the plugin renders them. */
const ALIGN_ALIASES: Record<string, string> = { start: 'left', end: 'right' };

export const hero = createContentModelSchema({
	sections: heroSections,
	mediaSlots: heroMediaSlots,
	base: SplitLayoutModel,
	attributes: {
		align: {
			type: String,
			required: false,
			// `start` / `end` are `section`'s vocabulary, which the composed `hero`
			// takes (SPEC-181 D7); `left` / `right` keep working.
			matches: ['start', 'center', 'end', 'left', 'right'],
			description:
				'Horizontal alignment of headline and body text: start, center (default) or end. `left` and `right` still work.',
		},
		// SPEC-101 — cover-mode knobs (`media-position="cover"` overlays the
		// content on a full-bleed media well). Same grammar as `card` (SPEC-089).
		'content-place': {
			type: String,
			required: false,
			description: 'Cover overlay anchor: "<block> <inline>" (e.g. "end start") or "auto"',
		},
		height: {
			type: String,
			required: false,
			matches: ['sm', 'md', 'lg', 'xl'],
			description: 'Intrinsic hero band height (named scale) for cover mode',
		},
		aspect: {
			type: String,
			required: false,
			description: 'Intrinsic hero aspect ratio (e.g. "21/9", "16/9") for cover mode',
		},
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		// Media-first body shape: `media --- content`. `content` is the primary
		// zone so a hero without an `---` image lands its whole body in content.
		zones: [
			{
				name: 'media',
				type: 'sequence',
				fields: [{ name: 'media', match: 'any', optional: true, greedy: true }],
			},
			{
				name: 'content',
				primary: true,
				type: 'sequence',
				fields: [
					{ name: 'eyebrow', match: 'paragraph', optional: true },
					{ name: 'headline', match: 'heading', optional: false },
					{ name: 'blurb', match: 'paragraph', optional: true },
					{ name: 'actions', match: 'list|fence', optional: true, greedy: true },
				],
			},
		],
	},
	transform(resolved, attrs, config) {
		const contentZone = (resolved.content ?? {}) as ResolvedContent;
		const mediaZone = (resolved.media ?? {}) as ResolvedContent;

		// Collect header AST nodes (eyebrow, headline, blurb) and transform
		const headerAstNodes = [contentZone.eyebrow, contentZone.headline, contentZone.blurb].filter(
			Boolean,
		) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		// Collect action AST nodes (list and/or fences) and transform with custom handlers
		const actionAstNodes = (
			Array.isArray(contentZone.actions)
				? contentZone.actions
				: contentZone.actions
					? [contentZone.actions]
					: []
		) as Node[];
		// SPEC-160 D6 — the actions region is the `actions` rune, nested. It
		// keeps `data-name="actions"`, so `rf-hero__actions` survives beside
		// `rf-actions`, and names its own items `action` and `command`.
		const actions = actionAstNodes.length > 0 ? buildActions(actionAstNodes, config) : undefined;

		// Transform media AST nodes. Markdoc wraps inline-level media (a bare image,
		// or a single block rune like `{% sandbox %}`) in a `<p>`; unwrap those so
		// the media zone holds the element directly — matching card / bento, and so
		// the shared media-zone CSS targets the element, not a stray paragraph.
		const mediaAstNodes = (Array.isArray(mediaZone.media) ? mediaZone.media : []) as Node[];
		const side = new RenderableNodeCursor(
			unwrapParagraphImages(Markdoc.transform(mediaAstNodes, config) as RenderableTreeNode[]),
		);

		// Layout meta tags (shared with every media+content rune). Hero deviates
		// from the shared `top` default: its DOM is content-first (headline before
		// media — the right reading order for the classic text-over-media hero),
		// so the truthful default placement is `bottom` (BUG-001). Lumina counters
		// the media-first stacked rules for hero accordingly.
		// `start` / `end` render exactly as `left` / `right`: the value is mapped
		// here, before the modifier reads it, so `data-align` and `hero.css` are
		// unchanged.
		const align = ALIGN_ALIASES[attrs.align as string] ?? ((attrs.align as string) || 'center');
		const alignMeta = new Tag('meta', { content: align });
		const { metas: layoutMetas } = buildLayoutMetas({
			...attrs,
			'media-position': attrs['media-position'] ?? 'bottom',
		});
		const {
			mediaPosition: mediaPositionMeta,
			mediaRatio: mediaRatioMeta,
			valign: valignMeta,
			collapse: collapseMeta,
		} = layoutMetas;

		// SPEC-101 cover knobs — emitted only when set, same as card (SPEC-089).
		const contentPlace = attrs['content-place'] as string | undefined;
		const heightAttr = attrs.height as string | undefined;
		const aspect = attrs.aspect as string | undefined;
		const contentPlaceMeta = contentPlace ? new Tag('meta', { content: contentPlace }) : undefined;
		const heightMeta = heightAttr ? new Tag('meta', { content: heightAttr }) : undefined;
		const aspectMeta = aspect ? new Tag('meta', { content: aspect }) : undefined;

		// Structural wrapping
		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const mainContent = new RenderableNodeCursor([
			...headerContent,
			...(actions ? [actions] : []),
		]).wrap('div');
		// SPEC-101 — in cover mode unwrap a bare `<p><img></p>` to a direct `img`
		// child so the shared cover fill rules (`> img` object-fit) apply. Scoped
		// to cover so non-cover hero markup stays byte-identical.
		const isCover = attrs['media-position'] === 'cover';
		const coverImg = isCover ? extractMediaImage(side) : undefined;
		const mediaDiv = (coverImg ? new RenderableNodeCursor([coverImg]) : side).wrap('div');

		return createComponentRenderable({
			rune: 'hero',
			tag: 'section',
			properties: {
				align: alignMeta,
				'media-position': mediaPositionMeta,
				'media-ratio': mediaRatioMeta,
				valign: valignMeta,
				collapse: collapseMeta,
				'content-place': contentPlaceMeta,
				height: heightMeta,
				aspect: aspectMeta,
			},
			refs: {
				...pageSectionProperties(header),
				actions,
				content: mainContent,
				media: mediaDiv,
			},
			children: [mainContent.next(), ...(side.toArray().length > 0 ? [mediaDiv.next()] : [])],
		});
	},
	deprecations: { justify: { newName: 'align' } },
});
