import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { SplitLayoutModel, buildLayoutMetas, extractMediaImage } from './common.js';

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
		// Split the body nodes on `hr` (`---`) into zones.
		const nodes = asNodes(resolved.body);
		const zones: Node[][] = [[]];
		for (const n of nodes) {
			if (n.type === 'hr') zones.push([]);
			else zones[zones.length - 1].push(n);
		}

		let mediaNodes: Node[] = [];
		let bodyNodes: Node[] = [];
		let footerNodes: Node[] = [];
		if (zones.length === 1) {
			bodyNodes = zones[0];
		} else if (zones.length === 2) {
			mediaNodes = zones[0];
			bodyNodes = zones[1];
		} else {
			mediaNodes = zones[0];
			footerNodes = zones[zones.length - 1];
			bodyNodes = zones.slice(1, -1).flat();
		}

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

		// Content zone (body + optional footer) — one grid child so the split
		// layout puts media | content; footer sits at the bottom of content.
		const bodyCursor = new RenderableNodeCursor(
			Markdoc.transform(bodyNodes, config) as RenderableTreeNode[],
		);
		const bodyDiv = new Tag('div', { 'data-name': 'body' }, bodyCursor.toArray() as RenderableTreeNode[]);
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
		if (footerTag) refs.footer = footerTag;
		if (linkTag) refs.link = linkTag;

		return createComponentRenderable({
			rune: 'card',
			tag: 'div',
			properties: { layout: layoutMetas.layout },
			refs,
			children,
		});
	},
});
