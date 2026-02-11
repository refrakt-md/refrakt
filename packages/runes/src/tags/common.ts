import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { SpaceSeparatedNumberList } from '../attributes.js';
import { attribute, createComponentRenderable, createSchema, Model } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

export class SplitablePageSectionModel extends Model {
  @attribute({ type: SpaceSeparatedNumberList, required: false })
  split: number[] = [];

  @attribute({ type: Boolean, required: false })
  mirror: boolean = false;
}

class LinkItemModel extends Model {
  transform(): RenderableTreeNodes {
    const output = this.transformChildren({
      text: node => new Tag('span', {}, [node.attributes.content])
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
  const headings = cursor.headings();

  return {
    eyebrow: headings.count() > 1 ? headings.next() : undefined,
    headline: headings.next(),
    image: cursor.tag('img').limit(1),
    blurb: cursor.tag('p').limit(1),
  }
}
