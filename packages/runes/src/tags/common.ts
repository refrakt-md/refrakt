import Markdoc from '@markdoc/markdoc';
import type { Tag, Node, RenderableTreeNode, SchemaAttribute } from '@markdoc/markdoc';
import { createContentModelSchema } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { registerAttributePreset } from '../attribute-presets.js';

/** @deprecated Split layout attributes are now provided by splitLayoutAttributes */
export const SplitablePageSectionModel = undefined;

/** Shared layout attributes for media+content runes — same vocabulary as
 * `bento-cell`, so every media-bearing surface (card, recipe, hero, feature,
 * step, realm, faction, playlist) speaks one language. `media-position` covers
 * all four placements (the old `layout`'s `stacked`/`split`/`split-reverse` are
 * the `top`/`start`/`end` subset, with `bottom` as a new mode). `media-ratio`
 * uses the same preset percentages as `bento-cell` instead of the open-ended
 * `ratio="2 1"` string. `valign` is the orientation-agnostic cross-axis dial
 * (kept as a rare escape hatch for runes where content can be much shorter than
 * media). The old `gap` attribute was dropped — each rune curates its own
 * inter-zone spacing via theme tokens. */
export const splitLayoutAttributes: Record<string, SchemaAttribute> = {
  'media-position': { type: String, required: false, matches: ['top', 'bottom', 'start', 'end', 'cover'], description: 'Where the media zone sits relative to the content: above (top), below (bottom), or beside (start/end)' },
  'media-ratio': { type: String, required: false, matches: ['1/3', '2/5', '1/2', '3/5', '2/3'], description: 'Media zone’s share of the row width when media is beside content (start/end)' },
  valign: { type: String, required: false, matches: ['top', 'center', 'bottom', 'stretch'], description: 'Cross-axis alignment when media is beside content (start/end); applies to the shorter zone' },
  collapse: { type: String, required: false, matches: ['sm', 'md', 'lg', 'never'], description: 'Breakpoint at which side-by-side layouts collapse to a single stacked column' },
};

registerAttributePreset(splitLayoutAttributes, {
  name: 'split layout',
  description: 'Layout controls shared by media+content runes — `media-position`, `media-ratio`, `valign`, `collapse`.',
});

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
  mediaPosition: Tag;
  mediaRatio: Tag | undefined;
  valign: Tag | undefined;
  collapse: Tag | undefined;
}

/**
 * Build the layout meta tags shared by all media+content runes. Accepts the
 * attrs object from a `splitLayoutAttributes`-based schema and returns the
 * meta Tag instances plus a convenience array of the non-undefined tags
 * suitable for spreading into a children array.
 *
 * `media-position` is always emitted (default: `top`) — the rune always has a
 * placement, even if the author didn't pick one. `media-ratio` and `valign` are
 * only emitted when the layout is side-by-side (`start` / `end`) — they have no
 * effect on stacked layouts. `collapse` is only emitted when the author sets it.
 */
export function buildLayoutMetas(attrs: Record<string, any>): {
  metas: LayoutMetas;
  children: Tag[];
} {
  const mediaPosition = (attrs['media-position'] as string) || 'top';
  const mediaRatio = attrs['media-ratio'] as string | undefined;
  const valign = attrs.valign as string | undefined;
  const collapse = attrs.collapse as string | undefined;

  const beside = mediaPosition === 'start' || mediaPosition === 'end';

  const mediaPositionMeta = new Markdoc.Tag('meta', { content: mediaPosition });
  const mediaRatioMeta = beside && mediaRatio ? new Markdoc.Tag('meta', { content: mediaRatio }) : undefined;
  const valignMeta = beside && valign ? new Markdoc.Tag('meta', { content: valign }) : undefined;
  const collapseMeta = collapse ? new Markdoc.Tag('meta', { content: collapse }) : undefined;

  const children: Tag[] = [mediaPositionMeta];
  if (mediaRatioMeta) children.push(mediaRatioMeta);
  if (valignMeta) children.push(valignMeta);
  if (collapseMeta) children.push(collapseMeta);

  return {
    metas: { mediaPosition: mediaPositionMeta, mediaRatio: mediaRatioMeta, valign: valignMeta, collapse: collapseMeta },
    children,
  };
}

/**
 * Split a node list on top-level `hr` (`---`) into media / body / footer zones,
 * by group count (matching the card / bento-cell pattern):
 *
 *   1 group  → body only
 *   2 groups → media + body
 *   3+ groups → media + body... + footer  (middle groups merged into body)
 *
 * This is the canonical "media-first body shape" for media+content runes.
 * Authoring is consistent across every rune that uses it.
 */
export function splitMediaBodyFooter(nodes: Node[]): { media: Node[]; body: Node[]; footer: Node[] } {
  const zones: Node[][] = [[]];
  for (const n of nodes) {
    if (n.type === 'hr') zones.push([]);
    else zones[zones.length - 1].push(n);
  }
  if (zones.length === 1) return { media: [], body: zones[0], footer: [] };
  if (zones.length === 2) return { media: zones[0], body: zones[1], footer: [] };
  return { media: zones[0], body: zones.slice(1, -1).flat(), footer: zones[zones.length - 1] };
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
/**
 * A scheme-resolved media node — the inline `<svg>` produced by the
 * `placeholder:` / `icon:` image-src schemes (SPEC-106), identified by its
 * `rf-placeholder` / `rf-icon` class. These replace the `<img>` element, so
 * media-consuming runes must recognise them alongside real images.
 */
export function isSchemeMediaNode(node: RenderableTreeNode): boolean {
  return (
    Markdoc.Tag.isTag(node) &&
    node.name === 'svg' &&
    /\b(rf-placeholder|rf-icon)\b/.test(String(node.attributes?.class ?? ''))
  );
}

/** Any media leaf a rune treats as its image slot: `<img>`, `<video>`, or a
 *  scheme-resolved media `<svg>`. */
export function isMediaNode(node: RenderableTreeNode): boolean {
  return (
    Markdoc.Tag.isTag(node) &&
    (node.name === 'img' || node.name === 'video' || isSchemeMediaNode(node))
  );
}

export function extractMediaImage(cursor: RenderableNodeCursor): Tag | undefined {
  for (const node of cursor.toArray()) {
    if (isMediaNode(node)) {
      return node as Tag;
    }
    if (Markdoc.Tag.isTag(node) && node.name === 'p') {
      const media = node.children.find(
        (c: any) => isMediaNode(c),
      ) as Tag | undefined;
      if (media) return media;
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
      (node.children[0].name === 'img' || node.children[0].attributes?.['data-rune'] || isSchemeMediaNode(node.children[0]))
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
