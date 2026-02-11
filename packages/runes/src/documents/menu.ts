import { RenderableTreeNodes } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { group, Model } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';
import { linkItem } from '../tags/common.js';

class MenuModel extends Model {
  @group({ section: 0, include: ['heading'] })
  header: NodeStream;

  @group({ section: 0, include: ['list'] })
  items: NodeStream;

  transform(): RenderableTreeNodes {
    const children = this.transformChildren({
      item: linkItem,
    });

    return createComponentRenderable(schema.Menu, {
      tag: 'nav',
      property: 'menu',
      properties: {
        title: children.tag('h1').limit(1),
        item: children.flatten().tag('li'),
      },
      children: children.toArray(),
    });
  }
}

export const menu = createSchema(MenuModel);
