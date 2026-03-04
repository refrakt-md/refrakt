import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNodes } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { attribute, createComponentRenderable, createSchema, Model } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

export class SplitablePageSectionModel extends Model {
  @attribute({ type: Boolean, required: false })
  split: boolean = false;

  @attribute({ type: Boolean, required: false })
  mirror: boolean = false;
}

class LinkItemModel extends Model {
  transform(): RenderableTreeNodes {
    const output = this.transformChildren({
      text: node => new Markdoc.Tag('span', {}, [node.attributes.content])
    });

    return createComponentRenderable(schema.LinkItem, {
      tag: 'li',
      properties: {
        name: output.flatten().tag('span'),
        url: output.tag('a'),
      },
      children: output.toArray(),
    })
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
