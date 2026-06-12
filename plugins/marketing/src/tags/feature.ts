import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag, Ast } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor, SplitLayoutModel, buildLayoutMetas, pageSectionProperties } from '@refrakt-md/runes';

/** Check if a paragraph node contains an image, icon tag, or strong element. */
function isTermParagraph(node: Node): boolean {
  for (const child of node.walk()) {
    if (child.type === 'image') return true;
    if (child.type === 'tag' && child.tag === 'icon') return true;
    if (child.type === 'strong') return true;
  }
  return false;
}

/**
 * Split definition children into term (headings + paragraphs with image/icon/strong)
 * and description (remaining paragraphs), matching the original @group behavior.
 */
function splitDefinitionChildren(nodes: unknown[]): unknown[] {
  // We don't actually rewrite nodes here — just pass them through.
  // The term/description split happens in transform based on node type analysis.
  return nodes as Node[];
}

export const definition = createContentModelSchema({
  contentModel: {
    type: 'custom',
    processChildren: splitDefinitionChildren,
    description: 'Splits children into term (headings + paragraphs with image/icon/strong) and description (remaining paragraphs).',
  },
  transform(resolved, attrs, config) {
    const labelIcon = (node: any) => { if (Tag.isTag(node)) node.attributes['data-name'] = 'icon'; return node; };

    // Split children into term and description groups (replicating @group behavior)
    const allChildren = asNodes(resolved.children);
    const termNodes: Node[] = [];
    const descNodes: Node[] = [];
    let inDescription = false;

    for (const node of allChildren) {
      if (!inDescription && (node.type === 'heading' || (node.type === 'paragraph' && isTermParagraph(node)))) {
        termNodes.push(node);
      } else if (node.type === 'paragraph') {
        inDescription = true;
        descNodes.push(node);
      } else if (!inDescription) {
        // Non-matching node before description starts — skip (matches @group behavior)
        inDescription = true;
      }
    }

    const dtChildren: any[] = [];
    for (const node of termNodes) {
      if (node.type === 'paragraph') {
        const img = Array.from(node.walk()).find(n => n.type === 'image');
        if (img) { dtChildren.push(labelIcon(Markdoc.transform(img, config))); continue; }
        const iconTag = Array.from(node.walk()).find(n => n.type === 'tag' && n.tag === 'icon');
        if (iconTag) {
          const strong = Array.from(node.walk()).find(n => n.type === 'strong');
          const iconResult = labelIcon(Markdoc.transform(iconTag, config));
          if (strong) { dtChildren.push(iconResult, new Tag('span', { 'data-name': 'title' }, strong.transformChildren(config))); continue; }
          dtChildren.push(iconResult); continue;
        }
        const strong = Array.from(node.walk()).find(n => n.type === 'strong');
        if (strong) { dtChildren.push(new Tag('span', { 'data-name': 'title' }, strong.transformChildren(config))); continue; }
        dtChildren.push(Markdoc.transform(node, config)); continue;
      }
      if (node.type === 'heading') {
        const img = Array.from(node.walk()).find(n => n.type === 'image');
        const text = Array.from(node.walk()).filter(n => n.type === 'text');
        const span = new Tag('span', { 'data-name': 'title' }, Markdoc.transform(text, config));
        if (img) { dtChildren.push(labelIcon(Markdoc.transform(img, config)), span); continue; }
        dtChildren.push(span); continue;
      }
    }
    const dt = new RenderableNodeCursor(dtChildren).wrap('dt');

    const ddChildren: any[] = [];
    for (const node of descNodes) {
      ddChildren.push(new Tag('dd', { 'data-name': 'description' }, node.transformChildren(config)));
    }
    const dd = new RenderableNodeCursor(ddChildren);

    return new Tag('div', {}, dt.concat(dd).toArray());
  },
});

const alignType = ['left', 'center', 'right'] as const;

export const feature = createContentModelSchema({
	base: SplitLayoutModel,
	attributes: {
		align: { type: String, required: false, matches: alignType.slice(), description: 'Horizontal alignment of headline and body text' },
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		// Media-first body shape: `media --- content`. `content` is the primary
		// zone so a feature without an `---` block lands its whole body in content.
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
					{ name: 'headline', match: 'heading', optional: true },
					{ name: 'blurb', match: 'paragraph', optional: true },
					{ name: 'definitions', match: 'list', optional: true, greedy: true, template: '- **Title**\n\n  Description' },
				],
			},
		],
	},
	transform(resolved, attrs, config) {
		const contentZone = (resolved.content ?? {}) as ResolvedContent;
		const mediaZone = (resolved.media ?? {}) as ResolvedContent;

		const headerAstNodes = [
			contentZone.eyebrow,
			contentZone.headline,
			contentZone.blurb,
		].filter(Boolean) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		// Transform definitions with custom node overrides. The output is flat:
		// always a `<dl>` carrying the item count. Whether the definitions tile as
		// a grid (media stacked) or stack in a column (media beside) is no longer
		// branched here — it's a `media-position` engine variant (SPEC-091) that
		// toggles the `--definitions-grid` modifier class, styled by CSS.
		const defConfig = {
			...config,
			nodes: {
				...config.nodes,
				item: {
					transform(node: Node, innerConfig: Record<string, any>) {
						return Markdoc.transform(new Ast.Node('tag', {}, node.children, 'definition'), innerConfig);
					},
				},
				list: {
					transform(node: Node, innerConfig: Record<string, any>) {
						return new Tag('dl', { 'data-columns': node.children.length }, node.transformChildren(innerConfig));
					},
				},
			},
		};
		const definitions = new RenderableNodeCursor(
			Markdoc.transform(asNodes(contentZone.definitions), defConfig) as RenderableTreeNode[],
		);

		const side = new RenderableNodeCursor(
			Markdoc.transform(asNodes(mediaZone.media), config) as RenderableTreeNode[],
		);

		const align = (attrs.align as string) || 'center';
		const alignMeta = new Tag('meta', { content: align });
		// Content-first DOM (header/definitions before media) → the truthful
		// default placement is `bottom`, mirroring hero (BUG-001).
		const { metas: layoutMetas, children: layoutChildren } = buildLayoutMetas({ ...attrs, 'media-position': attrs['media-position'] ?? 'bottom' });
		const { mediaPosition: mediaPositionMeta, mediaRatio: mediaRatioMeta, valign: valignMeta, collapse: collapseMeta } = layoutMetas;

		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const mainContent = new RenderableNodeCursor([...headerContent, ...definitions.toArray()]).wrap('div');
		const mediaContent = side.wrap('div');

		const children = [
			alignMeta,
			...layoutChildren,
			mainContent.next(),
			...(side.toArray().length > 0 ? [mediaContent.next()] : []),
		];

		return createComponentRenderable({ rune: 'feature',
			tag: 'section',
			property: 'contentSection',
			properties: {
				'media-position': mediaPositionMeta,
				align: alignMeta,
				'media-ratio': mediaRatioMeta,
				valign: valignMeta,
				collapse: collapseMeta,
			},
			refs: {
				...pageSectionProperties(header),
				'feature-item': definitions.flatten().tag('div'),
				content: mainContent,
				media: mediaContent,
			},
			children,
		});
	},
	deprecations: {
		justify: { newName: 'align' },
	},
});
