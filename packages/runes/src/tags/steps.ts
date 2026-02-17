import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { attribute, group, createComponentRenderable, createSchema } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';
import { SplitablePageSectionModel, name, pageSectionProperties } from './common.js';

class StepsModel extends SplitablePageSectionModel {
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

class StepModel extends SplitablePageSectionModel {
  @attribute({ type: Boolean, required: false })
  split: boolean = false;

  @attribute({ type: Boolean, required: false })
  mirror: boolean = false;

  @group({ section: 0 })
  main: NodeStream;

  @group({ section: 1})
  side: NodeStream;

  transform() {
    const main = this.main.transform();
    const side = this.side.transform();

    const mainContent = main.wrap('div', { 'data-name': 'main' });
    const sideContent = side.wrap('div', { 'data-name': 'showcase' });

    const splitMeta = this.split ? new Tag('meta', { content: 'split' }) : undefined;
    const mirrorMeta = this.mirror ? new Tag('meta', { content: 'mirror' }) : undefined;

    const children = [
      ...(splitMeta ? [splitMeta] : []),
      ...(mirrorMeta ? [mirrorMeta] : []),
      mainContent.next(),
      ...(side.toArray().length > 0 ? [sideContent.next()] : []),
    ];

    return createComponentRenderable(schema.Step, {
      tag: 'li',
      properties: {
        name: name(main),
        split: splitMeta,
        mirror: mirrorMeta,
      },
      children,
    });
  }
}

export const steps = createSchema(StepsModel);

export const step = createSchema(StepModel);
