import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNodes } from '@markdoc/markdoc';
import { attribute, createSchema, Model } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

/** @deprecated Use SplitLayoutModel instead */
export class SplitablePageSectionModel extends Model {
  @attribute({ type: Boolean, required: false })
  split: boolean = false;

  @attribute({ type: Boolean, required: false })
  mirror: boolean = false;
}

/** Base model for section runes with split layout support */
export class SplitLayoutModel extends Model {
  @attribute({ type: String, required: false, matches: ['stacked', 'split', 'split-reverse'], description: 'Display mode: stacked vertically, or split side-by-side' })
  layout: 'stacked' | 'split' | 'split-reverse' = 'stacked';

  @attribute({ type: String, required: false, description: 'Column width ratio in split layout (e.g. "2 1")' })
  ratio: string = '1 1';

  @attribute({ type: String, required: false, matches: ['top', 'center', 'bottom'], description: 'Vertical alignment of columns in split layout' })
  valign: 'top' | 'center' | 'bottom' = 'top';

  @attribute({ type: String, required: false, matches: ['none', 'tight', 'default', 'loose'], description: 'Space between columns in split layout' })
  gap: string = 'default';

  @attribute({ type: String, required: false, matches: ['sm', 'md', 'lg', 'never'], description: 'Breakpoint at which split layout collapses to stacked' })
  collapse: string | undefined = undefined;
}

class LinkItemModel extends Model {
  transform(): RenderableTreeNodes {
    const output = this.transformChildren({
      text: node => new Markdoc.Tag('span', {}, [node.attributes.content])
    });

    return new Markdoc.Tag('li', {}, output.toArray());
  }
}

export const linkItem = createSchema(LinkItemModel);

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
