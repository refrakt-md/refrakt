import { Tag, RenderableTreeNodes } from '@markdoc/markdoc';
import { attribute, Model } from '../lib/index.js';
import { createSchema } from '../lib/index.js';

const regionMode = ['replace', 'prepend', 'append'] as const;

class RegionModel extends Model {
  @attribute({ type: String, required: true })
  name: string;

  @attribute({ type: String, required: false, matches: regionMode.slice(), errorLevel: 'critical' })
  mode: typeof regionMode[number] = 'replace';

  transform(): RenderableTreeNodes {
    const children = this.transformChildren();

    return new Tag('div', {
      'data-region': this.name,
      'data-mode': this.mode,
    }, children.toArray());
  }
}

export const region = createSchema(RegionModel);
