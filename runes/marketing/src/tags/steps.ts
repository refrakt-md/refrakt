import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { attribute, group, createComponentRenderable, createSchema, NodeStream, headingsToList, SplitLayoutModel, nameHelper as name, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

class StepsModel extends SplitLayoutModel {
  @attribute({ type: Number, required: false })
  headingLevel: number | undefined = undefined;

  processChildren(nodes: Node[]) {
    return super.processChildren(headingsToList({ level: this.headingLevel })(nodes));
  }

  transform() {
    const children = this.transformChildren({
      list: 'ol',
      item: (node, config) => {
        return Markdoc.transform(
          new Ast.Node('tag', { split: node.attributes.split }, node.children, 'step'), config
        );
      }
    });

    return createComponentRenderable(schema.Steps, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        ...pageSectionProperties(children),
        step: children.flatten().tag('li').typeof('Step')
      },
      children: children.toArray(),
    });
  }
}

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
    const alignMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.align }) : undefined;
    const gapMeta = this.gap !== 'default' ? new Tag('meta', { content: this.gap }) : undefined;
    const collapseMeta = this.collapse ? new Tag('meta', { content: this.collapse }) : undefined;

    const children = [
      layoutMeta,
      ...(ratioMeta ? [ratioMeta] : []),
      ...(alignMeta ? [alignMeta] : []),
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
        align: alignMeta,
        gap: gapMeta,
        collapse: collapseMeta,
      },
      children,
    });
  }
}

export const steps = createSchema(StepsModel);

export const step = createSchema(StepModel, {
  split: {
    newName: 'layout',
    transform: (val, attrs) => val ? (attrs.mirror ? 'split-reverse' : 'split') : undefined,
  },
  mirror: { newName: '_consumed' },
});
