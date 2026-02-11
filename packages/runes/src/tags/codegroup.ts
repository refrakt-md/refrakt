import { schema } from '../registry.js';
import { flow, GridFlow, gridItems, gridLayout } from '../layouts/index.js';
import { attribute, groupList, Model } from '../lib/index.js';
import { SpaceSeparatedList } from '../attributes.js';
import { NodeStream } from '../lib/node.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

class CodeGroupModel extends Model {
  @attribute({ type: Number, required: false })
  columns: number | undefined;

  @attribute({ type: Number, required: false })
  rows: number | undefined;

  @attribute({ type: String, required: false, matches: flow.slice() })
  flow: GridFlow

  @attribute({ type: SpaceSeparatedList, required: false })
  layout: string[];

  @groupList({ delimiter: 'hr' })
  sections: NodeStream[];

  createLayout(tabGroups: RenderableNodeCursor[]) {
    if (tabGroups.length > 1) {
      return gridLayout({
        items: gridItems(this.layout, tabGroups),
        rows: this.rows,
        columns: this.columns,
        flow: this.flow
      });
    }
    return tabGroups[0].next();
  }

  transform() {
    const tabGroups = this.sections.map(s => s.wrapTag('tabs', { headingLevel: 1 }).transform());

    return createComponentRenderable(schema.Editor, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        tabs: tabGroups.map(g => g.tag('section').toArray()).flat(),
      },
      children: this.createLayout(tabGroups),
    });
  }
}

export const codegroup = createSchema(CodeGroupModel);
