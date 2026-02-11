import { Ast, Node, RenderableTreeNodes, Tag } from '@markdoc/markdoc';
import { createComponentRenderable, createSchema, group, Model } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { gridLayout } from '../layouts/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

class FooterModel extends Model {
  @group({ section: 0, include: ['tag'] })
  topics: NodeStream;

  @group({ section: 0, include: ['paragraph'] })
  copyright: NodeStream;

  processChildren(nodes: Node[]) {
    const n = headingsToList({ level: 2, include: ['list'] })(nodes);

    const topicsIndex = n.findIndex(c => c.type === 'list');

    if (topicsIndex >= 0) {
      const topics = n[topicsIndex].children.map(item => new Ast.Node('tag', {}, item.children, 'topic'));
      return super.processChildren([...n.slice(0, topicsIndex), ...topics, ...n.slice(topicsIndex + 1)]);
    }
    return super.processChildren(n);
  }

  transform(): RenderableTreeNodes {
    const topics = this.topics.transform();
    const copyright = this.copyright.transform();

    const children = copyright.toArray();

    if (topics.count() > 0) {
      const grid = gridLayout({
        columns: topics.count(),
        items: topics.toArray().map(topic => {
          return { colspan: 1, children: new RenderableNodeCursor([topic]) };
        })
      })
      children.unshift(new Tag('nav', {}, [grid]));
    }

    return createComponentRenderable(schema.Footer, {
      tag: 'footer',
      property: 'footer',
      properties: {
        topic: topics.tag('div'),
        copyright: copyright.tag('p'),
      },
      children,
    })
  }
}

export const footer = createSchema(FooterModel);
