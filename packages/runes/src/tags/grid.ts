import type { RenderableTreeNodes } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { attribute, groupList, Model } from '../lib/index.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';
import { SpaceSeparatedList } from '../attributes.js';
import { flow, GridFlow, gridItems, gridLayout } from '../layouts/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

class GridModel extends Model {
  @attribute({ type: Number, required: false })
  columns: number | undefined;

  @attribute({ type: Number, required: false })
  rows: number | undefined;

  @attribute({ type: String, required: false, matches: flow.slice() })
  flow: GridFlow;

  @attribute({ type: SpaceSeparatedList, required: false })
  layout: string[];

  @groupList({ delimiter: 'hr' })
  tiles: NodeStream[];

  transform(): RenderableTreeNodes {
    const tiles = this.tiles.map(t => t.transform());

    const layout = gridLayout({
      items: gridItems(this.layout, tiles),
      rows: this.rows,
      columns: this.columns,
      flow: this.flow
    })

    return createComponentRenderable(schema.Grid, {
      tag: 'section',
      children: layout,
      properties: {},
      refs: {
        item: new RenderableNodeCursor(layout.children).tag('div'),
      }
    })
  }
}

export const grid = createSchema(GridModel);
