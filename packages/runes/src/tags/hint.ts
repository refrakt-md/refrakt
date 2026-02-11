import { Tag } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const hintType = ['caution', 'check', 'note', 'warning'] as const;

class HintModel extends Model {
  @attribute({ type: String, matches: hintType.slice(), errorLevel: 'critical' })
  type: typeof hintType[number] = 'note';

  transform() {
    const hintType = new Tag('meta', { content: this.type });
    const children = this.transformChildren().wrap('div');

    return createComponentRenderable(schema.Hint, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        hintType,
      },
      refs: {
        body: children.tag('div')
      },
      children: [hintType, children.next()],
    })
  }
}

export const hint = createSchema(HintModel);
