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

		const children: RenderableTreeNode[] = [...layoutChildren];

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

		// Content zone (body + optional footer) — one grid child so the split
		// layout puts media | content; footer sits at the bottom of content.
		const bodyInner: RenderableTreeNode[] = [];
		let eyebrowTag: InstanceType<typeof Tag> | undefined;
		if (eyebrowNode) {
			const eyebrowCursor = new RenderableNodeCursor(
				Markdoc.transform([eyebrowNode], config) as RenderableTreeNode[],
			);
			const first = eyebrowCursor.toArray()[0];
			if (Markdoc.Tag.isTag(first)) {
				eyebrowTag = first;
				bodyInner.push(eyebrowTag);
			}
		}
		const bodyCursor = new RenderableNodeCursor(
			Markdoc.transform(mainBodyNodes, config) as RenderableTreeNode[],
		);
		const bodyRendered = bodyCursor.toArray() as RenderableTreeNode[];
		// The body's leading heading is the card title — give it a hook so it can
		// sit tight under an eyebrow instead of carrying default prose top margin.
		let titleTag: InstanceType<typeof Tag> | undefined;
		const firstBody = bodyRendered[0];
		if (Markdoc.Tag.isTag(firstBody) && /^h[1-6]$/.test(firstBody.name)) {
			titleTag = firstBody;
		}
		bodyInner.push(...bodyRendered);
		const bodyDiv = new Tag('div', { 'data-name': 'body' }, bodyInner);
		const contentChildren: RenderableTreeNode[] = [bodyDiv];
		let footerTag: InstanceType<typeof Tag> | undefined;
		if (footerNodes.length > 0) {
			const footerCursor = new RenderableNodeCursor(
				Markdoc.transform(footerNodes, config) as RenderableTreeNode[],
			);
			footerTag = new Tag('footer', { 'data-name': 'footer' }, footerCursor.toArray() as RenderableTreeNode[]);
			contentChildren.push(footerTag);
		}
		const contentDiv = new Tag('div', { 'data-name': 'content' }, contentChildren);
		children.push(contentDiv);

		// Whole-card link as a stretched overlay (keeps nested links valid).
		let linkTag: InstanceType<typeof Tag> | undefined;
		const href = String(attrs.href ?? '');
		if (href) {
			linkTag = new Tag('a', { 'data-name': 'link', href, 'aria-hidden': 'true', tabindex: '-1' }, []);
			children.push(linkTag);
		}

		const refs: Record<string, InstanceType<typeof Tag>> = { content: contentDiv, body: bodyDiv };
		if (titleTag) refs.title = titleTag;
		if (eyebrowTag) refs.eyebrow = eyebrowTag;
		if (footerTag) refs.footer = footerTag;
		if (linkTag) refs.link = linkTag;

		return createComponentRenderable({
			rune: 'card',
			tag: 'div',
			properties: { 'media-position': layoutMetas.mediaPosition },
			refs,
			children,
		});
	},
});
