import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { createComponentRenderable, createContentModelSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

export const tab = createContentModelSchema({
  attributes: {
    name: { type: String, required: true },
    image: { type: String, required: false },
  },
  contentModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
  transform(resolved, attrs, config) {
    let tabCursor = new RenderableNodeCursor<RenderableTreeNode>([]);

    if (attrs.image) {
      tabCursor = tabCursor.concat(Markdoc.transform(new Ast.Node('image', { src: attrs.image }), config));
    }

    tabCursor = tabCursor.concat(new Tag('span', {}, [attrs.name ?? '']));

    const panel = new RenderableNodeCursor(
      Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
    );

    const name = tabCursor.tag('span');
    const image = tabCursor.tag('svg');

    return [
      createComponentRenderable(schema.Tab, {
        tag: 'button',
        properties: { image },
        refs: { name },
        children: tabCursor.toArray(),
      }),
      createComponentRenderable(schema.TabPanel, {
        tag: 'div',
        properties: {},
        children: panel.toArray(),
      })
    ];
  },
});

function convertHeadings(nodes: Node[]): Node[] {
  const converted = headingsToList()(nodes);
  const n = converted.length - 1;
  if (!converted[n] || converted[n].type !== 'list') return nodes;
  const tags = converted[n].children.map((item: Node) => {
    const heading = item.children[0];
    const image = Array.from(heading.walk()).find((n: Node) => n.type === 'image');
    const name = Array.from(heading.walk()).filter((n: Node) => n.type === 'text').map((t: Node) => t.attributes.content);
    return new Ast.Node('tag', {
      name,
      image: image ? image.attributes.src : undefined,
    }, item.children.slice(1), 'tab');
  });

  converted.splice(n, 1, ...tags);
  return converted;
}

export const tabs = createContentModelSchema({
  attributes: {},
  contentModel: () => ({
    type: 'custom' as const,
    processChildren: (nodes) => convertHeadings(nodes as Node[]),
    description: 'Converts headings at the specified level to tab tags, extracting tab name and optional image from heading content.',
  }),
  transform(resolved, attrs, config) {
    const allChildren = asNodes(resolved.children);

    // Separate header content (headings/paragraphs before tabs) from tab tag nodes
    const headerAst: Node[] = [];
    const tabAst: Node[] = [];
    for (const child of allChildren) {
      if (child.type === 'tag' && (child as any).tag === 'tab') {
        tabAst.push(child);
      } else if (child.type === 'heading' || child.type === 'paragraph') {
        headerAst.push(child);
      }
    }

    const headerNodes = new RenderableNodeCursor(
      Markdoc.transform(headerAst, config) as RenderableTreeNode[],
    );
    const tabStream = new RenderableNodeCursor(
      Markdoc.transform(tabAst, config) as RenderableTreeNode[],
    );

    const tabItems = tabStream.tag('button').typeof('Tab');
    const panels = tabStream.tag('div').typeof('TabPanel');

    const tabList = tabItems.wrap('div', { role: 'tablist' });
    const panelList = panels.wrap('div');

    const children = headerNodes.count() > 0
      ? [headerNodes.wrap('header').next(), tabList.next(), panelList.next()]
      : [tabList.next(), panelList.next()];

    return createComponentRenderable(schema.TabGroup, {
      tag: 'section',
      class: attrs.class,
      property: 'contentSection',
      properties: {},
      refs: { ...pageSectionProperties(headerNodes), tabs: tabList, panels: panelList },
      children,
    });
  },
});
