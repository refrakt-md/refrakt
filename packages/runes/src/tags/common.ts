import Markdoc from '@markdoc/markdoc';
import type { Tag, Node, RenderableTreeNode, SchemaAttribute } from '@markdoc/markdoc';
import { createContentModelSchema } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

/** @deprecated Split layout attributes are now provided by splitLayoutAttributes */
export const SplitablePageSectionModel = undefined;

/** Split layout attribute definitions for runes with split/stacked layouts. */
export const splitLayoutAttributes: Record<string, SchemaAttribute> = {
  layout: { type: String, required: false, matches: ['stacked', 'split', 'split-reverse'], description: 'Display mode: stacked vertically, or split side-by-side' },
  ratio: { type: String, required: false, description: 'Column width ratio in split layout (e.g. "2 1")' },
  valign: { type: String, required: false, matches: ['top', 'center', 'bottom'], description: 'Vertical alignment of columns in split layout' },
  gap: { type: String, required: false, matches: ['none', 'tight', 'default', 'loose'], description: 'Space between columns in split layout' },
  collapse: { type: String, required: false, matches: ['sm', 'md', 'lg', 'never'], description: 'Breakpoint at which split layout collapses to stacked' },
};

/**
 * @deprecated Use `splitLayoutAttributes` instead.
 * Kept as a re-export for backwards compatibility with `base: SplitLayoutModel`.
 */
export const SplitLayoutModel = splitLayoutAttributes;

export const linkItem = createContentModelSchema({
  contentModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
  transform(resolved, attrs, config) {
    const bodyNodes = resolved.body
      ? (Array.isArray(resolved.body) ? resolved.body : [resolved.body]) as Node[]
      : [];

    // Transform children with text → span override
    const output = new RenderableNodeCursor(
      Markdoc.transform(bodyNodes, {
        ...config,
        nodes: {
          ...config.nodes,
          text: {
            transform(node: Node) {
              return new Markdoc.Tag('span', {}, [node.attributes.content]);
            },
          },
        },
      }) as RenderableTreeNode[],
    );

    return new Markdoc.Tag('li', {}, output.toArray());
  },
});

export function name(cursor: RenderableNodeCursor) {
  return cursor.tags('h1', 'h2', 'h3', 'h4', 'h5', 'h6').limit(1)
}

export function description(cursor: RenderableNodeCursor) {
  return cursor.tag('p').limit(1);
}

export interface LayoutMetas {
  layout: Tag;
  ratio: Tag | undefined;
  valign: Tag | undefined;
  gap: Tag | undefined;
  collapse: Tag | undefined;
}

/**
 * Build the five layout meta tags shared by all split-layout runes.
 * Accepts the attrs object from a `SplitLayoutModel`-based schema and returns
 * the meta Tag instances plus a convenience array of the non-undefined tags
 * suitable for spreading into a children array.
 */
export function buildLayoutMetas(attrs: Record<string, any>): {
  metas: LayoutMetas;
  children: Tag[];
} {
  const layout = (attrs.layout as string) || 'stacked';
  const ratio = (attrs.ratio as string) || '1 1';
  const valign = (attrs.valign as string) || 'top';
  const gap = (attrs.gap as string) || 'default';
  const collapse = attrs.collapse as string | undefined;

  const layoutMeta = new Markdoc.Tag('meta', { content: layout });
  const ratioMeta = layout !== 'stacked' ? new Markdoc.Tag('meta', { content: ratio }) : undefined;
  const valignMeta = layout !== 'stacked' ? new Markdoc.Tag('meta', { content: valign }) : undefined;
  const gapMeta = gap !== 'default' ? new Markdoc.Tag('meta', { content: gap }) : undefined;
  const collapseMeta = collapse ? new Markdoc.Tag('meta', { content: collapse }) : undefined;

  const children: Tag[] = [layoutMeta];
  if (ratioMeta) children.push(ratioMeta);
  if (valignMeta) children.push(valignMeta);
  if (gapMeta) children.push(gapMeta);
  if (collapseMeta) children.push(collapseMeta);

  return {
    metas: { layout: layoutMeta, ratio: ratioMeta, valign: valignMeta, gap: gapMeta, collapse: collapseMeta },
    children,
  };
}

/**
 * Extract a bare `<img>` tag from rendered media nodes.
 *
 * Markdoc wraps inline images in `<p><img .../></p>`. This utility walks
 * the top-level nodes looking for either a bare `<img>` or an `<img>` nested
 * inside a `<p>`, and returns the unwrapped tag.
 *
 * @returns The first `<img>` Tag found, or `undefined` if none exists.
 */
export function extractMediaImage(cursor: RenderableNodeCursor): Tag | undefined {
  for (const node of cursor.toArray()) {
    if (Markdoc.Tag.isTag(node) && node.name === 'img') {
      return node;
    }
    if (Markdoc.Tag.isTag(node) && node.name === 'p') {
      const img = node.children.find(
        (c: any) => Markdoc.Tag.isTag(c) && c.name === 'img',
      ) as Tag | undefined;
      if (img) return img;
    }
  }
  return undefined;
}

/**
 * Unwrap paragraph-wrapped images in-place.
 *
 * Walks the node list and replaces any `<p>` containing only an `<img>`
 * with the bare `<img>`. All other nodes pass through unchanged.
 * Unlike `extractMediaImage()` which extracts a single image,
 * this preserves the full node list for mixed-content zones.
 */
export function unwrapParagraphImages(nodes: RenderableTreeNode[]): RenderableTreeNode[] {
  return nodes.map((node) => {
    if (
      Markdoc.Tag.isTag(node) &&
      node.name === 'p' &&
      node.children.length === 1 &&
      Markdoc.Tag.isTag(node.children[0]) &&
      (node.children[0].name === 'img' || node.children[0].attributes?.['data-rune'])
    ) {
      return node.children[0];
    }
    return node;
  });
}

export function pageSectionProperties(cursor: RenderableNodeCursor) {
  const nodes = cursor.nodes;
  const isH = (n: any) => Markdoc.Tag.isTag(n) && /^h[1-6]$/.test(n.name);
  const isP = (n: any) => Markdoc.Tag.isTag(n) && n.name === 'p';

  const firstH = nodes.findIndex(isH);

  // No headline — first paragraph is blurb
  if (firstH === -1) {
    return {
      eyebrow: undefined as Tag | undefined,
      headline: undefined as Tag | undefined,
      image: cursor.tag('img').limit(1),
      blurb: nodes.find(isP) as Tag | undefined,
    };
  }

  // Paragraph before first heading → paragraph eyebrow
  const paraBeforeH = nodes.slice(0, firstH).findIndex(isP);

  let eyebrow: Tag | undefined;
  let headlineIdx: number;

  if (paraBeforeH !== -1) {
    eyebrow = nodes[paraBeforeH] as Tag;
    headlineIdx = firstH;
  } else {
    // Two headings → first heading eyebrow (original behaviour)
    const secondH = nodes.findIndex((n, i) => i > firstH && isH(n));
    if (secondH !== -1) {
      eyebrow = nodes[firstH] as Tag;
      headlineIdx = secondH;
    } else {
      eyebrow = undefined;
      headlineIdx = firstH;
    }
  }

  // First paragraph after headline → blurb
  const blurbIdx = nodes.findIndex((n, i) => i > headlineIdx && isP(n));

  return {
    eyebrow,
    headline: nodes[headlineIdx] as Tag,
    image: cursor.tag('img').limit(1),
    blurb: blurbIdx !== -1 ? nodes[blurbIdx] as Tag : undefined,
  };
}
