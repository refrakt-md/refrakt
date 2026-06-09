import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { SplitLayoutModel, buildLayoutMetas, splitMediaBodyFooter, extractMediaImage } from './common.js';

/**
 * `card` (SPEC-070) — a generic, self-contained content card.
 *
 * The body is divided by `---` (hr) into up to three zones:
 *
 *   [media] --- body [--- footer]
 *
 * - **media** (optional leading zone): any content — an image, a `{% codegroup %}`,
 *   a `{% sandbox %}`, etc. Reuses the shared split layout (`SplitLayoutModel`):
 *   side-by-side with the body on wide screens, a full-bleed header on mobile
 *   (`data-media-position="top"`).
 * - **body**: the main content.
 * - **footer** (optional trailing zone): a muted meta row (date · tags · …).
 *
 * Zone roles are positional by count: 1 → body; 2 → media + body; 3 → media +
 * body + footer. A leading empty zone (`--- body --- footer`) means "no media".
 *
 * `href` makes the whole card a link (a stretched link overlay, so real links
 * inside body/footer stay clickable). The card carries no `$item`/registry
 * knowledge — it's plain and composable, standalone or fed by a collection
 * body template.
 */
export const card = createContentModelSchema({
	base: SplitLayoutModel,
	attributes: {
		href: { type: String, required: false, default: '', description: 'Optional link target; makes the whole card clickable.' },
		// SPEC-089 — cover mode (`media-position="cover"`, from splitLayoutAttributes)
		// overlays content on a media well. `content-place` anchors the overlaid box
		// ("block inline", e.g. "end start", or "auto" to adapt on orientation);
		// `height` / `aspect` give a cover/bg-only card its intrinsic shape.
		'content-place': { type: String, required: false, description: 'Cover overlay anchor: "<block> <inline>" (e.g. "end start") or "auto"' },
		height: { type: String, required: false, matches: ['sm', 'md', 'lg', 'xl'], description: 'Intrinsic card height (named scale) for cover / bg-only cards' },
		aspect: { type: String, required: false, description: 'Intrinsic card aspect ratio (e.g. "16/9", "3/4") for cover / bg-only cards' },
	},
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
	},
	transform(resolved, attrs, config) {
		// Split the body on `---` into media / body / footer zones. The shared
		// helper enforces the canonical media-first body shape (1 group = body,
		// 2 = media + body, 3+ = media + body + footer).
		const { media: mediaNodes, body: bodyNodes, footer: footerNodes } = splitMediaBodyFooter(asNodes(resolved.body));

		const { metas: layoutMetas, children: layoutChildren } = buildLayoutMetas(attrs);

		// SPEC-089 cover knobs — emit as meta tags only when set; the engine reads
		// them as fields (content-place → overlay anchor vars; height/aspect →
		// intrinsic shape). They live in the children tree so the field channel
		// finds them, and are marked via `properties` below.
		const contentPlace = attrs['content-place'] as string | undefined;
		const height = attrs.height as string | undefined;
		const aspect = attrs.aspect as string | undefined;
		const contentPlaceMeta = contentPlace ? new Tag('meta', { content: contentPlace }) : undefined;
		const heightMeta = height ? new Tag('meta', { content: height }) : undefined;
		const aspectMeta = aspect ? new Tag('meta', { content: aspect }) : undefined;

		const children: RenderableTreeNode[] = [...layoutChildren];
		if (contentPlaceMeta) children.push(contentPlaceMeta);
		if (heightMeta) children.push(heightMeta);
		if (aspectMeta) children.push(aspectMeta);

		// Media zone — unwrap a bare image; otherwise render arbitrary content.
		if (mediaNodes.length > 0) {
			const mediaCursor = new RenderableNodeCursor(
				Markdoc.transform(mediaNodes, config) as RenderableTreeNode[],
			);
			const img = extractMediaImage(mediaCursor);
			const inner = img ? [img] : mediaCursor.toArray();
			children.push(new Tag('div', { 'data-section': 'media', 'data-name': 'media' }, inner as RenderableTreeNode[]));
		}

		// Eyebrow: a leading paragraph immediately followed by a heading becomes a
		// kicker (the page-section / recipe pattern). The rest stays freeform body.
		let eyebrowNode: Node | undefined;
		let mainBodyNodes = bodyNodes;
		if (
			bodyNodes.length >= 2 &&
			bodyNodes[0].type === 'paragraph' &&
			bodyNodes[1].type === 'heading'
		) {
			eyebrowNode = bodyNodes[0];
			mainBodyNodes = bodyNodes.slice(1);
		}

		// SPEC-081/091 flat-slot model: the transform emits flat `data-name` slots
		// (media · eyebrow · body · footer · link); the engine's `layout` config
		// groups eyebrow/body/footer into the `content` wrapper and places it
		// beside media. This is what lets cover ({% ref "SPEC-089" /%}) be a
		// `media-position` variant on card.
		let eyebrowTag: InstanceType<typeof Tag> | undefined;
		if (eyebrowNode) {
			const eyebrowCursor = new RenderableNodeCursor(
				Markdoc.transform([eyebrowNode], config) as RenderableTreeNode[],
			);
			const first = eyebrowCursor.toArray()[0];
			if (Markdoc.Tag.isTag(first)) {
				eyebrowTag = first;
			}
		}
		const bodyCursor = new RenderableNodeCursor(
			Markdoc.transform(mainBodyNodes, config) as RenderableTreeNode[],
		);
		const bodyRendered = bodyCursor.toArray() as RenderableTreeNode[];
		// The body's leading heading is the card title — give it a hook so it can
		// sit tight under an eyebrow (or a leading `bar` strip) instead of carrying
		// default prose top margin. Find the first heading rather than only
		// position 0, so a composed header (e.g. a `{% bar %}` before the title)
		// doesn't leave the title with a prose-sized gap.
		const titleTag = bodyRendered.find(
			(n): n is InstanceType<typeof Tag> => Markdoc.Tag.isTag(n) && /^h[1-6]$/.test(n.name),
		);
		const bodyDiv = new Tag('div', { 'data-name': 'body' }, bodyRendered);

		let footerTag: InstanceType<typeof Tag> | undefined;
		if (footerNodes.length > 0) {
			const footerCursor = new RenderableNodeCursor(
				Markdoc.transform(footerNodes, config) as RenderableTreeNode[],
			);
			footerTag = new Tag('footer', { 'data-name': 'footer' }, footerCursor.toArray() as RenderableTreeNode[]);
		}

		// Flat slots, in order. The engine's layout assembly wraps
		// eyebrow/body/footer into `content`.
		if (eyebrowTag) children.push(eyebrowTag);
		children.push(bodyDiv);
		if (footerTag) children.push(footerTag);

		// Whole-card link as a stretched overlay (keeps nested links valid).
		// Unlisted in `layout`, so it stays a direct child of the card root.
		let linkTag: InstanceType<typeof Tag> | undefined;
		const href = String(attrs.href ?? '');
		if (href) {
			linkTag = new Tag('a', { 'data-name': 'link', href, 'aria-hidden': 'true', tabindex: '-1' }, []);
			children.push(linkTag);
		}

		const refs: Record<string, InstanceType<typeof Tag>> = { body: bodyDiv };
		if (titleTag) refs.title = titleTag;
		if (eyebrowTag) refs.eyebrow = eyebrowTag;
		if (footerTag) refs.footer = footerTag;
		if (linkTag) refs.link = linkTag;

		return createComponentRenderable({
			rune: 'card',
			tag: 'div',
			properties: {
				'media-position': layoutMetas.mediaPosition,
				'content-place': contentPlaceMeta,
				height: heightMeta,
				aspect: aspectMeta,
			},
			refs,
			children,
		});
	},
});
