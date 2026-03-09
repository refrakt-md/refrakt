import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { attribute, group, createComponentRenderable, createContentModelSchema, createSchema, NodeStream, headingsToList, SplitLayoutModel, nameHelper as name, pageSectionProperties, asNodes } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

class StepModel extends SplitLayoutModel {
  @group({ section: 0 })
  main: NodeStream;

  @group({ section: 1})
  side: NodeStream;

  transform() {
    const main = this.main.transform();
    const side = this.side.transform();

    const mainContent = main.wrap('div', { 'data-name': 'content' });
    const sideContent = side.wrap('div', { 'data-name': 'media' });

    const layoutMeta = new Tag('meta', { content: this.layout });
    const ratioMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.ratio }) : undefined;
    const valignMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.valign }) : undefined;
    const gapMeta = this.gap !== 'default' ? new Tag('meta', { content: this.gap }) : undefined;
    const collapseMeta = this.collapse ? new Tag('meta', { content: this.collapse }) : undefined;

    const children = [
      layoutMeta,
      ...(ratioMeta ? [ratioMeta] : []),
      ...(valignMeta ? [valignMeta] : []),
      ...(gapMeta ? [gapMeta] : []),
      ...(collapseMeta ? [collapseMeta] : []),
      mainContent.next(),
      ...(side.toArray().length > 0 ? [sideContent.next()] : []),
    ];

    return createComponentRenderable(schema.Step, {
      tag: 'li',
      properties: {
        name: name(main),
        layout: layoutMeta,
        ratio: ratioMeta,
        valign: valignMeta,
        gap: gapMeta,
        collapse: collapseMeta,
      },
      children,
    });
  }
}

export const step = createSchema(StepModel, {
  split: {
    newName: 'layout',
    transform: (val, attrs) => val ? (attrs.mirror ? 'split-reverse' : 'split') : undefined,
  },
  mirror: { newName: '_consumed' },
});

export const steps = createContentModelSchema({
  attributes: {
    headingLevel: { type: Number, required: false },
  },
  contentModel: (attrs) => ({
    type: 'custom' as const,
    processChildren: (nodes) => headingsToList({ level: attrs.headingLevel })(nodes as Node[]),
    description: 'Converts headings to a list structure, where each heading becomes a step with optional split layout.',
  }),
  transform(resolved, attrs, config) {
    const children = new RenderableNodeCursor(
      Markdoc.transform(asNodes(resolved.children), {
        ...config,
        nodes: {
          ...config.nodes,
          list: { render: 'ol' },
          item: {
            transform(node: Node, cfg: any) {
              return Markdoc.transform(
                new Ast.Node('tag', { split: node.attributes.split }, node.children, 'step'), cfg
              );
            },
          },
        },
      }) as RenderableTreeNode[],
    );

    return createComponentRenderable(schema.Steps, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        ...pageSectionProperties(children),
        step: children.flatten().tag('li').typeof('Step')
      },
      children: children.toArray(),
    });
  },
});
