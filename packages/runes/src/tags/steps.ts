import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
const { Ast } = Markdoc;
import { headingsToList } from '../util.js';
import { splitLayout } from '../layouts/index.js';
import { schema } from '../registry.js';
import { SpaceSeparatedNumberList } from '../attributes.js';
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
  @group({ section: 0 })
  main: NodeStream;

  @group({ section: 1})
  side: NodeStream;

  transform() {
    const main = this.main.transform();
    const side = this.side.transform();

    return createComponentRenderable(schema.Step, {
      tag: 'li',
      properties: {
        name: name(main),
      },
      children: splitLayout({ split: this.split, mirror: false, main: main.toArray(), side: side.toArray() }).next()
    });
  }
}

export const steps = createSchema(StepsModel);

export const step = createSchema(StepModel);
