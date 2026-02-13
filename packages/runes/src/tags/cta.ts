import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { group } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';
import { SplitablePageSectionModel, linkItem, pageSectionProperties } from './common.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

class CallToActionModel extends SplitablePageSectionModel {
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
    const mainContent = nav.concat(header, actions).wrap('div', { 'data-name': 'main' });
    const showcaseContent = side.wrap('div', { 'data-name': 'showcase' });

    const splitMeta = this.split.length > 0
      ? new Tag('meta', { property: 'split', content: this.split.join(' ') })
      : null;
    const mirrorMeta = this.mirror
      ? new Tag('meta', { property: 'mirror', content: 'true' })
      : null;

    const children = [
      splitMeta,
      mirrorMeta,
      mainContent.next(),
      ...(side.toArray().length > 0 ? [showcaseContent.next()] : []),
    ].filter(Boolean);

    return createComponentRenderable(schema.CallToAction, {
      tag: 'section',
      property: 'contentSection',
      class: this.node.transformAttributes(this.config).class,
      properties: {
        ...pageSectionProperties(header),
        action: actions.flatten().tags('li', 'div'),
      },
      refs: {
        showcase: showcaseContent,
      },
      children,
    })
  }
}

export const cta = createSchema(CallToActionModel);
