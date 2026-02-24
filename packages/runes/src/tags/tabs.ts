import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, id, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

class TabModel extends Model {
  @attribute({ type: String, required: true })
  name: string;

  @attribute({ type: String, required: false })
  image: string;

  transform(): RenderableTreeNodes {
    let tab = new RenderableNodeCursor<RenderableTreeNode>([]);

    if (this.image) {
      tab = tab.concat(Markdoc.transform(new Ast.Node('image', { src: this.image }), this.config));
    }

    tab = tab.concat(new Tag('span', {}, [this.name]));

    const panel = this.transformChildren();

    const name = tab.tag('span');
    const image = tab.tag('svg');

    return [
      createComponentRenderable(schema.Tab, {
        tag: 'li',
        properties: { name, image },
        children: tab.toArray(),
      }),
      createComponentRenderable(schema.TabPanel, {
        tag: 'li',
        properties: {},
        children: panel.toArray(),
      })
    ];
  }
}

export const tab = createSchema(TabModel);

class TabsModel extends Model {
  @id({ generate: true })
  id: string;

  @attribute({ type: Number, required: false })
  headingLevel: number | undefined = undefined;

  @group({ include: ['heading', 'paragraph'] })
  header: NodeStream;

  @group({ include: ['tag'] })
  tabgroup: NodeStream;

  convertHeadings(nodes: Node[]) {
    const level = this.headingLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
    if (!level) return nodes;
    const converted = headingsToList({ level })(nodes);
    const n = converted.length - 1;
    const tags = converted[n].children.map(item => {
      const heading = item.children[0];
      const image = Array.from(heading.walk()).find(n => n.type === 'image');
      const name = Array.from(heading.walk()).filter(n => n.type === 'text').map(t => t.attributes.content);
      return new Ast.Node('tag', {
        name,
        image: image ? image.attributes.src : undefined,
      }, item.children.slice(1), 'tab');
    });

    converted.splice(n, 1, ...tags);

    return converted;
  }

  processChildren(nodes: Node[]) {
    return super.processChildren(this.convertHeadings(nodes));
  }

  transform(): RenderableTreeNodes {
    const header = this.header.transform();
    const tabStream = this.tabgroup.transform();

    const tabs = tabStream.tag('li').typeof('Tab');
    const panels = tabStream.tag('li').typeof('TabPanel')

    const tabList = tabs.wrap('ul');
    const panelList = panels.wrap('ul');

    const children = header.count() > 0
      ? [header.wrap('header').next(), tabList.next(), panelList.next()]
      : [tabList.next(), panelList.next()];

    return createComponentRenderable(schema.TabGroup, {
      tag: 'section',
      id: this.id,
      class: this.node.transformAttributes(this.config).class,
      property: 'contentSection',
      properties: {
        ...pageSectionProperties(header),
        tab: tabs,
        panel: panels,
      },
      refs: { tabs: tabList, panels: panelList },
      children,
    });
  }
}

export const tabs = createSchema(TabsModel);
