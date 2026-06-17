import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, RenderableNodeCursor, SplitLayoutModel, buildLayoutMetas, linkItem, pageSectionProperties, extractMediaImage, unwrapParagraphImages } from '@refrakt-md/runes';

export const hero = createContentModelSchema({
	base: SplitLayoutModel,
	attributes: {
		align: { type: String, required: false, matches: ['left', 'center', 'right'], description: 'Horizontal alignment of headline and body text' },
		// SPEC-101 — cover-mode knobs (`media-position="cover"` overlays the
		// content on a full-bleed media well). Same grammar as `card` (SPEC-089).
		'content-place': { type: String, required: false, description: 'Cover overlay anchor: "<block> <inline>" (e.g. "end start") or "auto"' },
		height: { type: String, required: false, matches: ['sm', 'md', 'lg', 'xl'], description: 'Intrinsic hero band height (named scale) for cover mode' },
		aspect: { type: String, required: false, description: 'Intrinsic hero aspect ratio (e.g. "21/9", "16/9") for cover mode' },
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
				fields: [
					{ name: 'media', match: 'any', optional: true, greedy: true },
				],
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
		const headerAstNodes = [
			contentZone.eyebrow,
			contentZone.headline,
			contentZone.blurb,
		].filter(Boolean) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		// Collect action AST nodes (list and/or fences) and transform with custom handlers
		const actionAstNodes = (
			Array.isArray(contentZone.actions) ? contentZone.actions : contentZone.actions ? [contentZone.actions] : []
		) as Node[];
		// Use the original config inside the fence handler to avoid recursion
		// (same pattern as NodeStream.useNode — the inner transform uses the
		// base config, not the config with custom overrides)
		const baseConfig = config;
		const actionConfig = {
			...config,
			nodes: {
				...config.nodes,
				item: linkItem,
				fence: {
					transform(node: Node) {
						const output = new RenderableNodeCursor(
							[Markdoc.transform(node, baseConfig)] as RenderableTreeNode[],
						);
						return new Tag('div', {}, [output.next()]);
					},
				},
			},
		};
		const actions = new RenderableNodeCursor(
			Markdoc.transform(actionAstNodes, actionConfig) as RenderableTreeNode[],
		);

		// Transform media AST nodes. Markdoc wraps inline-level media (a bare image,
		// or a single block rune like `{% sandbox %}`) in a `<p>`; unwrap those so
		// the media zone holds the element directly — matching card / bento, and so
		// the shared media-zone CSS targets the element, not a stray paragraph.
		const mediaAstNodes = (
			Array.isArray(mediaZone.media) ? mediaZone.media : []
		) as Node[];
		const side = new RenderableNodeCursor(
			unwrapParagraphImages(Markdoc.transform(mediaAstNodes, config) as RenderableTreeNode[]),
		);

		// Layout meta tags (shared with every media+content rune). Hero deviates
		// from the shared `top` default: its DOM is content-first (headline before
		// media — the right reading order for the classic text-over-media hero),
		// so the truthful default placement is `bottom` (BUG-001). Lumina counters
		// the media-first stacked rules for hero accordingly.
		const align = (attrs.align as string) || 'center';
		const alignMeta = new Tag('meta', { content: align });
		const { metas: layoutMetas, children: layoutChildren } = buildLayoutMetas({ ...attrs, 'media-position': attrs['media-position'] ?? 'bottom' });
		const { mediaPosition: mediaPositionMeta, mediaRatio: mediaRatioMeta, valign: valignMeta, collapse: collapseMeta } = layoutMetas;

		// SPEC-101 cover knobs — emitted only when set, same as card (SPEC-089).
		const contentPlace = attrs['content-place'] as string | undefined;
		const heightAttr = attrs.height as string | undefined;
		const aspect = attrs.aspect as string | undefined;
		const contentPlaceMeta = contentPlace ? new Tag('meta', { content: contentPlace }) : undefined;
		const heightMeta = heightAttr ? new Tag('meta', { content: heightAttr }) : undefined;
		const aspectMeta = aspect ? new Tag('meta', { content: aspect }) : undefined;
		const coverMetas = [contentPlaceMeta, heightMeta, aspectMeta].filter(Boolean) as InstanceType<typeof Tag>[];

		// Structural wrapping
		const actionsDiv = actions.wrap('div');
		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const mainContent = new RenderableNodeCursor([
			...headerContent,
			...(actions.count() > 0 ? [actionsDiv.next()] : []),
		]).wrap('div');
		// SPEC-101 — in cover mode unwrap a bare `<p><img></p>` to a direct `img`
		// child so the shared cover fill rules (`> img` object-fit) apply. Scoped
		// to cover so non-cover hero markup stays byte-identical.
		const isCover = attrs['media-position'] === 'cover';
		const coverImg = isCover ? extractMediaImage(side) : undefined;
		const mediaDiv = (coverImg ? new RenderableNodeCursor([coverImg]) : side).wrap('div');

		return createComponentRenderable({ rune: 'hero',
			tag: 'section',
			property: 'contentSection',
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
				actions: actionsDiv,
				content: mainContent,
				media: mediaDiv,
				action: actions.flatten().tags('li'),
				command: actions.flatten().tags('div'),
			},
			children: [
				alignMeta,
				...layoutChildren,
				...coverMetas,
				mainContent.next(),
				...(side.toArray().length > 0 ? [mediaDiv.next()] : []),
			],
		});
	},
	deprecations: { justify: { newName: 'align' } },
});
