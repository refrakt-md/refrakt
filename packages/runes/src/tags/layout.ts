import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, Model } from '../lib/index.js';
import { createSchema } from '../lib/index.js';

class LayoutModel extends Model {
  @attribute({ type: String, required: false })
  extends: string = 'parent';

  transform(): RenderableTreeNodes {
    const children = this.transformChildren();

    return new Tag('div', {
      'data-layout-def': true,
      'data-extends': this.extends,
    }, children.toArray());
  }
}

export const layout = createSchema(LayoutModel);
