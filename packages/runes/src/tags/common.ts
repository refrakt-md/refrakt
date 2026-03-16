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
  @attribute({ type: String, required: false, matches: ['stacked', 'split', 'split-reverse'] })
  layout: 'stacked' | 'split' | 'split-reverse' = 'stacked';

  @attribute({ type: String, required: false })
  ratio: string = '1 1';

  @attribute({ type: String, required: false, matches: ['top', 'center', 'bottom'] })
  valign: 'top' | 'center' | 'bottom' = 'top';

  @attribute({ type: String, required: false, matches: ['none', 'tight', 'default', 'loose'] })
  gap: string = 'default';

  @attribute({ type: String, required: false, matches: ['sm', 'md', 'lg', 'never'] })
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
