import { Ast, Node } from '@markdoc/markdoc';
import { RenderableTreeNodes } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { group, Model } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';
import { linkItem } from '../tags/common.js';
import { headingsToList } from '../util.js';

class TopicModel extends Model {
  transform(): RenderableTreeNodes {
    const children = this.transformChildren({
      item: linkItem,
    });

    return createComponentRenderable(schema.Topic, {
      tag: 'div',
      properties: {
        name: children.tags('h2', 'h3', 'h4', 'h5', 'h6').limit(1),
        item: children.flatten().tag('li'),
      },
      children: children.toArray(),
    });
  }
}

export const topic = createSchema(TopicModel);

class TableOfContentsModel extends Model {
  @group({ section: 0, include: ['heading'] })
  header: NodeStream;

  @group({ section: 0, include: ['tag'] })
  topics: NodeStream;

  processChildren(nodes: Node[]) {
    const n = headingsToList({ level: 2 })(nodes);

    const topicsIndex = n.findIndex(c => c.type === 'list');
    const topics = n[topicsIndex].children.map(item => new Ast.Node('tag', {}, item.children, 'topic'));

    return super.processChildren([...n.slice(0, topicsIndex), ...topics]);
  }

  transform(): RenderableTreeNodes {
    const header = this.header.transform();
    const topics = this.topics.transform();

    return createComponentRenderable(schema.TableOfContents, {
      tag: 'nav',
      property: 'summary',
      properties: {
        headline: header.tag('h1'),
        topic: topics.tag('div'),
      },
      children: [...header.toArray(), ...topics.toArray()],
    })
  }
}

export const summary = createSchema(TableOfContentsModel);
