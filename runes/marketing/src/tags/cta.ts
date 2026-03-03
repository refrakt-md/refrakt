import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
import { group, Model, createComponentRenderable, createSchema, NodeStream, RenderableNodeCursor, linkItem, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

class CallToActionModel extends Model {
  @group({ include: ['heading', 'paragraph'] })
  header: NodeStream;

  @group({ include: ['list', 'fence'] })
  actions: NodeStream;

  transform(): RenderableTreeNodes {
    const header = this.header.transform();
    const actions = this.actions
      .useNode('item', linkItem)
      .useNode('fence', node => {
        const output = new RenderableNodeCursor([Markdoc.transform(node, this.config)]);

        return createComponentRenderable(schema.Command, {
          tag: 'div',
          properties: {
            code: output.flatten().tag('code'),
          },
          children: output.next(),
        })
      })
      .transform();

    const actionsDiv = actions.wrap('div');

    return createComponentRenderable(schema.CallToAction, {
      tag: 'section',
      property: 'contentSection',
      class: this.node.transformAttributes(this.config).class,
      properties: {
        ...pageSectionProperties(header),
        action: actions.flatten().tags('li', 'div'),
      },
      refs: {
        actions: actionsDiv,
        body: header.wrap('div'),
      },
      children: [
        header.wrap('header').next(),
        actionsDiv.next(),
      ],
    })
  }
}

export const cta = createSchema(CallToActionModel);
