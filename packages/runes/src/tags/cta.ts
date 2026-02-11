import Markdoc, { RenderableTreeNodes } from '@markdoc/markdoc';
import { splitLayout } from '../layouts/index.js';
import { schema } from '../registry.js';
import { attribute, group, Model } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';
import { SpaceSeparatedNumberList } from '../attributes.js';
import { linkItem, pageSectionProperties } from './common.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

class CallToActionModel extends Model {
  @attribute({ type: SpaceSeparatedNumberList, required: false })
  split: number[] = [];

  @attribute({ type: Boolean, required: false })
  mirror: boolean = false;

  @group({ section: 0, include: ['list'] })
  nav: NodeStream;

  @group({ section: 0, include: ['heading', 'paragraph'] })
  header: NodeStream;

  @group({ section: 0, include: ['list', 'fence'] })
  actions: NodeStream;

  @group({ section: 1 })
  showcase: NodeStream;

  transform(): RenderableTreeNodes {
    const header = this.header.transform();
    const nav = this.nav.transform();
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

    const side = this.showcase.transform();
    const className = this.split.length > 0 ? 'split' : undefined;

    const layout = splitLayout({
      split: this.split,
      mirror: this.mirror,
      main: nav.concat(header, actions).toArray(),
      side: side.toArray(),
    });

    return createComponentRenderable(schema.CallToAction, {
      tag: 'section',
      property: 'contentSection',
      class: [className, this.node.transformAttributes(this.config).class].join(' '),
      properties: {
        ...pageSectionProperties(header),
        action: actions.flatten().tags('li', 'div'),
      },
      refs: {
        showcase: layout.gridItem(1),
      },
      children: layout.next(),
    })
  }
}

export const cta = createSchema(CallToActionModel);
