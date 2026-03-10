import Markdoc from '@markdoc/markdoc';
import type { Config, MaybePromise, Node, RenderableTreeNodes, Schema, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;

export interface PageOptions {
  unwrap?: string[];
}

export class Page implements Schema {
  constructor(private options: PageOptions = {}) {}

  transform(node: Node, config: Config): MaybePromise<RenderableTreeNodes> {
    const children = node.transformChildren(config);

    function* sections() {
      let section: RenderableTreeNode[] = [];

      for (const c of children) {
        if (c instanceof Tag && c.attributes['data-field'] === 'contentSection') {
          if (section.length > 0) {
            yield new Tag('section', { 'data-field': 'content-section', typeof: 'PageSection' }, section);
            section = [];
          }
          yield c;
        } else {
          section.push(c);
        }
      }
      if (section.length > 0) {
        yield new Tag('section', { 'data-field': 'content-section', typeof: 'PageSection' }, section);
      }
    }
    return new Tag('main', { 'data-name': 'body' }, Array.from(sections()));
  }
}
